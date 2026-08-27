import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Card, EmptyState } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { buildLocationString } from '@/lib/utils';
import { Package, Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { isDemoMode, DEMO_ASSETS, DEMO_CATEGORIES, DEMO_ROOMS } from '@/lib/demo-data';
import { AddAssetDialog } from './add-asset-dialog';
import { InventoryRowActions } from './inventory-row-actions';
import { InventoryTableClient } from './inventory-table-client';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

interface SearchParams { q?: string; status?: string; category?: string; room?: string; page?: string; }

export default async function InventoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  // ── Demo mode ────────────────────────────────────────────────────
  if (isDemoMode()) {
    const cookieStore = await cookies();
    if (cookieStore.get('demo_session')?.value !== 'true') redirect('/login');

    let filtered = [...DEMO_ASSETS];
    if (params.q) {
      const q = params.q.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.asset_tag.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
      );
    }
    if (params.status)   filtered = filtered.filter(a => a.status === params.status);
    if (params.category) filtered = filtered.filter(a => a.category?.id === params.category);
    if (params.room)     filtered = filtered.filter(a => a.room?.id === params.room);

    const page = Math.max(1, parseInt(params.page ?? '1'));
    const offset = (page - 1) * PAGE_SIZE;
    const paginated = filtered.slice(offset, offset + PAGE_SIZE);

    return <InventoryTable
      assets={paginated}
      count={filtered.length}
      page={page}
      totalPages={Math.ceil(filtered.length / PAGE_SIZE)}
      params={params}
      categories={DEMO_CATEGORIES}
      rooms={DEMO_ROOMS}
      canRequest={true}
      roomName={params.room ? DEMO_ROOMS.find(r => r.id === params.room)?.name : undefined}
    />;
  }

  // ── Production mode ──────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const canRequest = ['asset_manager', 'approver'].includes(profile?.role ?? '');

  const page = Math.max(1, parseInt(params.page ?? '1'));
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('assets')
    .select(`id,asset_tag,name,description,status,acquisition_year,created_at,category:asset_categories(id,name,code),room:rooms(id,name,room_number),floor:floors(id,name),building:buildings(id,name)`, { count: 'exact' });

  if (params.q) query = query.or(`name.ilike.%${params.q}%,asset_tag.ilike.%${params.q}%,description.ilike.%${params.q}%`);
  if (params.status) query = query.eq('status', params.status as any);
  if (params.category) query = query.eq('category_id', params.category);
  if (params.room) query = query.eq('room_id', params.room);

  const { data: assets, count } = await query.order('asset_tag').range(offset, offset + PAGE_SIZE - 1);
  const { data: categories } = await supabase.from('asset_categories').select('id, name').order('name');
  const { data: rooms } = await supabase.from('rooms').select('id, name, room_number').order('name');

  return <InventoryTable
    assets={assets ?? []}
    count={count ?? 0}
    page={page}
    totalPages={Math.ceil((count ?? 0) / PAGE_SIZE)}
    params={params}
    categories={categories ?? []}
    rooms={rooms ?? []}
    canRequest={canRequest}
    roomName={params.room ? rooms?.find(r => r.id === params.room)?.name : undefined}
  />;
}

function InventoryTable({ assets, count, page, totalPages, params, categories, rooms, canRequest, roomName }: {
  assets: any[]; count: number; page: number; totalPages: number;
  params: SearchParams; categories: { id: string; name: string }[];
  rooms: { id: string; name: string; room_number: string | null }[];
  canRequest: boolean;
  roomName?: string;
}) {
  function buildHref(overrides: Partial<SearchParams>) {
    const merged = { ...params, ...overrides };
    const sp = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v as string); });
    return `/inventory?${sp.toString()}`;
  }

  const exportUrl = `/api/export?${new URLSearchParams(
    Object.entries(params).filter(([_, v]) => Boolean(v)) as [string, string][]
  ).toString()}`;

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            {roomName ? `Assets in ${roomName}` : 'Asset Inventory'}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{count.toLocaleString()} registered physical assets</p>
          {params.room && (
            <Link href="/inventory" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-0.5 inline-block">← View all assets</Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={exportUrl}
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
          {canRequest && (
            <AddAssetDialog categories={categories} rooms={rooms} />
          )}
        </div>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          <input type="text" name="q" defaultValue={params.q} placeholder="Search assets, tags, specs…"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select name="status" defaultValue={params.status ?? ''}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          {(['active','under_maintenance','missing','damaged','transferred','retired','disposed'] as const).map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select name="category" defaultValue={params.category ?? ''}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">Filter</button>
        {(params.q || params.status || params.category || params.room) && (
          <Link href="/inventory" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Clear</Link>
        )}
      </form>

      {/* Interactive Multi-Select Table with Batch Actions */}
      <InventoryTableClient
        assets={assets}
        count={count}
        page={page}
        totalPages={totalPages}
        params={params}
        categories={categories}
        rooms={rooms}
        canRequest={canRequest}
        roomName={roomName}
      />
    </div>
  );
}
