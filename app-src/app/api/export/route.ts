import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const room = searchParams.get('room');
  const floor = searchParams.get('floor');
  const building = searchParams.get('building');
  const ids = searchParams.get('ids');
  const q = searchParams.get('q');

  let query = supabase
    .from('assets')
    .select(`
      id, asset_tag, name, description, status, acquisition_year,
      category:asset_categories(name, code),
      room:rooms(name, room_number),
      floor:floors(name, level),
      building:buildings(name)
    `)
    .order('asset_tag')
    .limit(50000);

  if (ids) {
    const idList = ids.split(',').filter(Boolean);
    if (idList.length > 0) query = query.in('id', idList);
  }
  if (status) query = query.eq('status', status as any);
  if (category) query = query.eq('category_id', category);
  if (room) query = query.eq('room_id', room);
  if (floor) query = query.eq('floor_id', floor);
  if (building) query = query.eq('building_id', building);
  if (q) query = query.or(`name.ilike.%${q}%,asset_tag.ilike.%${q}%,description.ilike.%${q}%`);

  const { data: assets, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Generate CSV rows
  const headers = [
    'Asset Tag',
    'Asset Name',
    'Category',
    'Category Code',
    'Building',
    'Floor',
    'Room Name',
    'Room Number',
    'Status',
    'Acquisition Year',
    'Description',
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = (assets ?? []).map((a: any) => [
    escapeCsv(a.asset_tag),
    escapeCsv(a.name),
    escapeCsv(a.category?.name),
    escapeCsv(a.category?.code),
    escapeCsv(a.building?.name),
    escapeCsv(a.floor?.name),
    escapeCsv(a.room?.name),
    escapeCsv(a.room?.room_number),
    escapeCsv(a.status),
    escapeCsv(a.acquisition_year),
    escapeCsv(a.description),
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\r\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="SPIT_Asset_Register_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
