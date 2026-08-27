import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, EmptyState } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/badge';
import { Layers, DoorOpen, Package, ChevronRight, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface FloorSearchParams { building?: string; }

export default async function FloorsPage({ searchParams }: { searchParams: Promise<FloorSearchParams> }) {
  const params = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get building name for breadcrumb
  let buildingName: string | undefined;
  if (params.building) {
    const { data: building } = await supabase
      .from('buildings')
      .select('name')
      .eq('id', params.building)
      .single();
    buildingName = (building as any)?.name;
  }

  let query = supabase
    .from('floors')
    .select(`id, name, level, building:buildings(id, name, code)`)
    .order('level');

  if (params.building) {
    query = query.eq('building_id', params.building);
  }

  const { data: floors } = await query;

  if (!floors || floors.length === 0) {
    const title = buildingName ? `Floors in ${buildingName}` : 'All Floors';
    return (
      <div className="space-y-6 max-w-5xl">
        {buildingName && (
          <nav className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Link href="/locations/buildings" className="hover:text-zinc-700 transition-colors">Buildings</Link>
            <span>/</span>
            <span className="text-zinc-700 font-medium">{buildingName}</span>
          </nav>
        )}
        <h1 className="text-xl font-bold text-zinc-900">{title}</h1>
        <p className="text-sm text-zinc-500">No floors found.</p>
      </div>
    );
  }

  // Use proper count queries — no 1,000-row cap
  const enriched = await Promise.all(
    floors.map(async (f: any) => {
      const [
        { count: roomCount },
        { count: assetCount },
      ] = await Promise.all([
        supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('floor_id', f.id),
        supabase.from('assets').select('*', { count: 'exact', head: true }).eq('floor_id', f.id),
      ]);
      return {
        ...f,
        room_count:  roomCount  ?? 0,
        asset_count: assetCount ?? 0,
      };
    })
  );

  const title = buildingName ? `Floors in ${buildingName}` : 'Campus Floor Architecture';
  const totalFloorRooms = enriched.reduce((sum, f) => sum + f.room_count, 0);
  const totalFloorAssets = enriched.reduce((sum, f) => sum + f.asset_count, 0);
  const maxFloorAssets = Math.max(...enriched.map((f) => f.asset_count), 1);

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-10">
      {/* Breadcrumb */}
      {buildingName && (
        <nav className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
          <Link href="/locations/buildings" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Buildings</Link>
          <span>/</span>
          <span className="text-zinc-700 dark:text-zinc-200 font-medium">{buildingName}</span>
        </nav>
      )}

      {/* Header & Metric Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{title}</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {enriched.length} vertical levels · {totalFloorRooms} active rooms · {totalFloorAssets.toLocaleString()} physical assets
          </p>
        </div>

        <div className="flex items-center gap-2">
          {params.building ? (
            <Link href="/locations/buildings" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
              <ArrowLeft className="h-3 w-3" /> All Buildings
            </Link>
          ) : (
            <Link href="/locations/rooms" className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm">
              <DoorOpen className="h-3.5 w-3.5" /> Browse All Rooms
            </Link>
          )}
        </div>
      </div>

      {enriched.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-8 w-8" />}
          title="No floors found"
          description="Floors will appear once created in the database"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {enriched.map((floor: any) => {
            const assetSharePct = totalFloorAssets > 0 ? ((floor.asset_count / totalFloorAssets) * 100).toFixed(1) : '0';
            return (
              <Link key={floor.id} href={`/locations/rooms?floor=${floor.id}`}>
                <Card className="hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group h-full flex flex-col justify-between">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-600 dark:group-hover:text-white transition-all shadow-xs">
                          L{floor.level}
                        </div>
                        <div>
                          <h3 className="font-bold text-zinc-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {floor.name}
                          </h3>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            {floor.building?.name ?? 'Main Campus Building'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-500 transition-colors shrink-0 mt-1" />
                    </div>

                    {/* Floor Metric Boxes */}
                    <div className="grid grid-cols-2 gap-2 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-3 bg-zinc-50/60 dark:bg-zinc-800/40 text-center">
                      <div>
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">{floor.room_count}</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center justify-center gap-1 font-medium">
                          <DoorOpen className="h-3.5 w-3.5" /> Rooms
                        </p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">{floor.asset_count.toLocaleString()}</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center justify-center gap-1 font-medium">
                          <Package className="h-3.5 w-3.5" /> Assets
                        </p>
                      </div>
                    </div>

                    {/* Share of Total Campus Assets Meter */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Share of Total Assets</span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{assetSharePct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, Math.max(2, Number(assetSharePct)))}%` }}
                          className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
