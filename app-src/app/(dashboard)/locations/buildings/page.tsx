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
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Campus Buildings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          {buildings.length} building{buildings.length !== 1 ? 's' : ''} · Click to explore floors and rooms
        </p>
      </div>

      {buildings.length === 0
        ? <EmptyState icon={<Building2 className="h-8 w-8" />} title="No buildings" description="Add a building to get started" />
        : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {buildings.map((b: any) => (
              <Link key={b.id} href={`/locations/floors?building=${b.id}`}>
                <Card className="hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer group h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 transition-colors">
                        <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-zinc-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{b.name}</h3>
                          <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                        </div>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase mt-0.5">{b.code}</p>
                      </div>
                    </div>

                    {b.address && (
                      <p className="mt-3 flex items-start gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {b.address}
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-3 divide-x divide-zinc-100 dark:divide-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-800/50">
                      {[
                        { label: 'Floors', value: b.floor_count, icon: <Layers className="h-3 w-3" /> },
                        { label: 'Rooms', value: b.room_count, icon: <DoorOpen className="h-3 w-3" /> },
                        { label: 'Assets', value: b.asset_count, icon: <Package className="h-3 w-3" /> },
                      ].map(stat => (
                        <div key={stat.label} className="px-3 py-2.5 text-center">
                          <p className="text-base font-bold text-zinc-900 dark:text-white">{stat.value.toLocaleString()}</p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-center gap-0.5 mt-0.5">
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
