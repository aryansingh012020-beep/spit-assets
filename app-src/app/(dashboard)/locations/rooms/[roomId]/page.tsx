import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { buildLocationString } from '@/lib/utils';
import { ArrowLeft, DoorOpen, Package, MapPin, Users, Layers, Building2 } from 'lucide-react';
import { InventoryRowActions } from '@/app/(dashboard)/inventory/inventory-row-actions';

export const dynamic = 'force-dynamic';

const ROOM_TYPE_LABELS: Record<string, string> = {
  classroom: 'Classroom', lab: 'Laboratory', office: 'Office', faculty_room: 'Faculty Room',
  cabin: 'Cabin', library: 'Library', canteen: 'Canteen', seminar_hall: 'Seminar Hall',
  conference_room: 'Conference Room', server_room: 'Server Room', reception: 'Reception',
  passage: 'Passage', storage: 'Storage', general: 'General',
};

export default async function RoomDetailPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: room }, { data: assets }, { data: allRooms }, { data: profile }] = await Promise.all([
    supabase
      .from('rooms')
      .select(`
        id, name, room_number, room_type, capacity,
        floor:floors(id, name, level, building:buildings(id, name, code))
      `)
      .eq('id', roomId)
      .single(),
    supabase
      .from('assets')
      .select(`
        id, asset_tag, name, description, status, acquisition_year,
        category:asset_categories(id, name, code)
      `)
      .eq('room_id', roomId)
      .order('asset_tag'),
    supabase.from('rooms').select('id, name, room_number').order('name'),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ]);

  if (!room) notFound();

  const canManage = ['asset_manager', 'approver'].includes(profile?.role ?? '');

  const floor = (room as any).floor;
  const building = floor?.building;

  // Group assets by category for summary
  const categoryGroups: Record<string, { name: string; count: number }> = {};
  (assets ?? []).forEach((a: any) => {
    const catName = a.category?.name ?? 'Uncategorized';
    if (!categoryGroups[catName]) categoryGroups[catName] = { name: catName, count: 0 };
    categoryGroups[catName].count++;
  });
  const sortedCategories = Object.values(categoryGroups).sort((a, b) => b.count - a.count);

  // Status summary
  const statusGroups: Record<string, number> = {};
  (assets ?? []).forEach((a: any) => {
    statusGroups[a.status] = (statusGroups[a.status] ?? 0) + 1;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
        <Link href="/locations/buildings" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Buildings</Link>
        <span>/</span>
        {building && (
          <>
            <Link href={`/locations/floors?building=${building.id}`} className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              {building.name}
            </Link>
            <span>/</span>
          </>
        )}
        {floor && (
          <>
            <Link href={`/locations/rooms?floor=${floor.id}`} className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              {floor.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-zinc-700 dark:text-zinc-200 font-medium">{room.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60">
              <DoorOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{room.name}</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">{room.room_number}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="default">
            {ROOM_TYPE_LABELS[room.room_type] ?? room.room_type}
          </Badge>
          {room.capacity && (
            <Badge variant="neutral">
              <Users className="h-3 w-3 mr-1" />
              Cap. {room.capacity}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Assets', value: (assets ?? []).length, icon: <Package className="h-4 w-4" /> },
          { label: 'Categories', value: sortedCategories.length, icon: <Layers className="h-4 w-4" /> },
          { label: 'Building', value: building?.name ?? '—', icon: <Building2 className="h-4 w-4" /> },
          { label: 'Floor', value: floor?.name ?? '—', icon: <MapPin className="h-4 w-4" /> },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                {stat.icon}
              </div>
              <div>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Category breakdown sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-sm">By Category</CardTitle></CardHeader>
          <CardContent className="pt-2">
            {sortedCategories.length === 0 ? (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">No assets</p>
            ) : (
              <div className="space-y-2">
                {sortedCategories.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">{cat.name}</span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white tabular-nums">{cat.count}</span>
                  </div>
                ))}
              </div>
            )}

            {Object.keys(statusGroups).length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide font-semibold mb-2">By Status</p>
                <div className="space-y-1.5">
                  {Object.entries(statusGroups).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between gap-2">
                      <StatusBadge status={status as any} />
                      <span className="text-xs font-bold text-zinc-900 dark:text-white tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assets table */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Assets in this Room</CardTitle>
              <Link
                href={`/inventory?room=${room.id}`}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                Open in Inventory →
              </Link>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                  {['Tag', 'Name', 'Category', 'Status', 'Year'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                  {canManage && (
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
                {(assets ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="py-12">
                      <EmptyState
                        icon={<Package className="h-7 w-7" />}
                        title="No assets in this room"
                        description="Assets assigned to this room will appear here"
                      />
                    </td>
                  </tr>
                ) : (
                  (assets ?? []).map((asset: any) => (
                    <tr key={asset.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/inventory/${asset.id}`}
                          className="font-mono text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {asset.asset_tag}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/inventory/${asset.id}`}>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            {asset.name}
                          </p>
                          {asset.description && (
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 line-clamp-1 max-w-xs">
                              {asset.description}
                            </p>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        {asset.category ? (
                          <Badge variant="default" className="text-[10px]">{asset.category.name}</Badge>
                        ) : (
                          <span className="text-zinc-300 dark:text-zinc-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={asset.status} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {asset.acquisition_year ?? '—'}
                      </td>
                      {canManage && (
                        <td className="px-4 py-2.5 text-right">
                          <InventoryRowActions
                            assetId={asset.id}
                            assetName={asset.name}
                            assetTag={asset.asset_tag}
                            currentRoomId={room.id}
                            rooms={allRooms ?? []}
                            canManage={canManage}
                          />
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
