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

  const title = buildingName ? `Floors in ${buildingName}` : 'All Floors';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      {buildingName && (
        <nav className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
          <Link href="/locations/buildings" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Buildings</Link>
          <span>/</span>
          <span className="text-zinc-700 dark:text-zinc-200 font-medium">{buildingName}</span>
        </nav>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{title}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {enriched.length} floor{enriched.length !== 1 ? 's' : ''} · Click to explore rooms
          </p>
        </div>
        {params.building && (
          <Link href="/locations/buildings" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> All Buildings
          </Link>
        )}
      </div>

      {enriched.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-8 w-8" />}
          title="No floors found"
          description="Floors will appear once created in the database"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enriched.map((floor: any) => (
            <Link key={floor.id} href={`/locations/rooms?floor=${floor.id}`}>
              <Card className="hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer group h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-sm group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 transition-colors">
                        L{floor.level}
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{floor.name}</h3>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">{floor.building?.name ?? 'Main Building'}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-400 transition-colors shrink-0 mt-1" />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 border border-zinc-100 dark:border-zinc-800 rounded-lg p-2.5 bg-zinc-50 dark:bg-zinc-800/50 text-center">
                    <div>
                      <p className="text-base font-bold text-zinc-900 dark:text-white">{floor.room_count}</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-center gap-1">
                        <DoorOpen className="h-3 w-3" /> Rooms
                      </p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-zinc-900 dark:text-white">{floor.asset_count}</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-center gap-1">
                        <Package className="h-3 w-3" /> Assets
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
