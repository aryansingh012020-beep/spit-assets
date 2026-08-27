import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, EmptyState } from '@/components/ui/primitives';
import { Building2, MapPin, DoorOpen, Layers, Package, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { isDemoMode, DEMO_BUILDING, DEMO_FLOORS, DEMO_ROOMS, DEMO_ASSETS } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

export default async function BuildingsPage() {
  // ── Demo mode ────────────────────────────────────────────────────
  if (isDemoMode()) {
    const cookieStore = await cookies();
    if (cookieStore.get('demo_session')?.value !== 'true') redirect('/login');

    const building = {
      ...DEMO_BUILDING,
      floor_count: DEMO_FLOORS.length,
      room_count:  DEMO_ROOMS.length,
      asset_count: DEMO_ASSETS.length,
    };

    return <BuildingsContent buildings={[building]} />;
  }

  // ── Production mode ──────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: buildings } = await supabase
    .from('buildings')
    .select(`id, name, code, address`)
    .order('name');

  if (!buildings || buildings.length === 0) {
    return <BuildingsContent buildings={[]} />;
  }

  // For each building, run parallel count queries — no row-fetch cap
  const enriched = await Promise.all(
    buildings.map(async (b: any) => {
      const [
        { count: floorCount },
        { count: roomCount },
        { count: assetCount },
      ] = await Promise.all([
        supabase.from('floors').select('*', { count: 'exact', head: true }).eq('building_id', b.id),
        supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('building_id', b.id),
        supabase.from('assets').select('*', { count: 'exact', head: true }).eq('building_id', b.id),
      ]);
      return {
        ...b,
        floor_count: floorCount ?? 0,
        room_count:  roomCount  ?? 0,
        asset_count: assetCount ?? 0,
      };
    })
  );

  return <BuildingsContent buildings={enriched} />;
}

function BuildingsContent({ buildings }: { buildings: any[] }) {
  const totalRooms = buildings.reduce((sum, b) => sum + b.room_count, 0);
  const totalAssets = buildings.reduce((sum, b) => sum + b.asset_count, 0);

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Campus Facility Buildings</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {buildings.length} building facility · {totalRooms} rooms · {totalAssets.toLocaleString()} tracked assets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/locations/floors"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-xs"
          >
            <Layers className="h-3.5 w-3.5" /> Vertical Floors
          </Link>
          <Link
            href="/locations/rooms"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
          >
            <DoorOpen className="h-3.5 w-3.5" /> All Campus Rooms
          </Link>
        </div>
      </div>

      {buildings.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="No buildings registered"
          description="Campus facilities will appear once configured in the database"
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {buildings.map((b: any) => (
            <Link key={b.id} href={`/locations/floors?building=${b.id}`}>
              <Card className="hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group h-full flex flex-col justify-between">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-zinc-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {b.name}
                        </h3>
                        <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-500 transition-colors shrink-0" />
                      </div>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono uppercase mt-0.5 font-semibold tracking-wider">
                        CODE: {b.code}
                      </p>
                    </div>
                  </div>

                  {b.address && (
                    <p className="flex items-start gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 pl-0.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-zinc-400" />
                      {b.address}
                    </p>
                  )}

                  <div className="grid grid-cols-3 divide-x divide-zinc-100 dark:divide-zinc-800/80 border border-zinc-100 dark:border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-50/70 dark:bg-zinc-800/40">
                    {[
                      { label: 'Floors', value: b.floor_count, icon: <Layers className="h-3 w-3" /> },
                      { label: 'Rooms', value: b.room_count, icon: <DoorOpen className="h-3 w-3" /> },
                      { label: 'Assets', value: b.asset_count, icon: <Package className="h-3 w-3" /> },
                    ].map((stat) => (
                      <div key={stat.label} className="px-3 py-3 text-center">
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">
                          {stat.value.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-center gap-1 mt-0.5 font-medium">
                          {stat.icon} {stat.label}
                        </p>
                      </div>
                    ))}
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

