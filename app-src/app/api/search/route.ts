import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SearchResult } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '8'), 20);

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Search assets using ILIKE (backed by pg_trgm GIN index)
  const pattern = `%${q}%`;
  const [
    { data: assets },
    { data: rooms },
    { data: buildings },
  ] = await Promise.all([
    supabase
      .from('assets')
      .select('id, asset_tag, name, status, building:buildings(name), floor:floors(name), room:rooms(name)')
      .or(`name.ilike.${pattern},asset_tag.ilike.${pattern},description.ilike.${pattern}`)
      .limit(limit),

    supabase
      .from('rooms')
      .select('id, name, room_number, floor:floors(name, building:buildings(name))')
      .or(`name.ilike.${pattern},room_number.ilike.${pattern}`)
      .limit(Math.floor(limit / 3)),

    supabase
      .from('buildings')
      .select('id, name, code')
      .or(`name.ilike.${pattern},code.ilike.${pattern}`)
      .limit(Math.floor(limit / 4)),
  ]);

  const results: SearchResult[] = [
    ...(assets ?? []).map((a: any): SearchResult => ({
      id:       a.id,
      type:     'asset',
      title:    `${a.name} — ${a.asset_tag}`,
      subtitle: [a.building?.name, a.floor?.name, a.room?.name].filter(Boolean).join(' › '),
      href:     `/inventory/${a.id}`,
      status:   a.status,
    })),
    ...(rooms ?? []).map((r: any): SearchResult => ({
      id:       r.id,
      type:     'room',
      title:    r.name + (r.room_number ? ` (${r.room_number})` : ''),
      subtitle: [r.floor?.building?.name, r.floor?.name].filter(Boolean).join(' › '),
      href:     `/locations/rooms/${r.id}`,
    })),
    ...(buildings ?? []).map((b: any): SearchResult => ({
      id:       b.id,
      type:     'building',
      title:    b.name,
      subtitle: b.code,
      href:     `/locations/buildings/${b.id}`,
    })),
  ];

  return NextResponse.json({ results });
}
