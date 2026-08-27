import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, EmptyState } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/badge';
import { DoorOpen, Package, ArrowLeft, ChevronRight } from 'lucide-react';
import { isDemoMode, DEMO_ROOMS, DEMO_ASSETS } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

const ROOM_TYPE_LABELS: Record<string, string> = {
  classroom: 'Classroom', lab: 'Lab', office: 'Office', faculty_room: 'Faculty Room',
  cabin: 'Cabin', library: 'Library', canteen: 'Canteen', seminar_hall: 'Seminar Hall',
  conference_room: 'Conf. Room', server_room: 'Server Room', reception: 'Reception',
  passage: 'Passage', storage: 'Storage', general: 'General',
};

interface RoomSearchParams { q?: string; type?: string; floor?: string; building?: string; }

export default async function RoomsPage({ searchParams }: { searchParams: Promise<RoomSearchParams> }) {
  const params = await searchParams;

  // ── Demo mode ────────────────────────────────────────────────────
  if (isDemoMode()) {
    const cookieStore = await cookies();
    if (cookieStore.get('demo_session')?.value !== 'true') redirect('/login');

    const assetCountByRoom = DEMO_ASSETS.reduce((acc: Record<string, number>, a) => {
      acc[a.room.id] = (acc[a.room.id] ?? 0) + 1;
      return acc;
    }, {});

    let rooms = DEMO_ROOMS.map(r => ({ ...r, asset_count: assetCountByRoom[r.id] ?? 0 }));
    if (params.q) {
      const q = params.q.toLowerCase();
      rooms = rooms.filter(r => r.name.toLowerCase().includes(q) || r.room_number.includes(q));
    }
    if (params.type) rooms = rooms.filter(r => r.room_type === params.type);

    return <RoomsContent rooms={rooms} params={params} floorName={undefined} buildingName={undefined} />;
  }

  // ── Production mode ──────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get context names for breadcrumb
  let floorName: string | undefined;
  let buildingName: string | undefined;

  if (params.floor) {
    const { data: floor } = await supabase
      .from('floors')
      .select('name, building:buildings(name)')
      .eq('id', params.floor)
      .single();
    floorName = (floor as any)?.name;
    buildingName = (floor as any)?.building?.name;
  }

  if (params.building && !buildingName) {
    const { data: building } = await supabase
      .from('buildings')
      .select('name')
      .eq('id', params.building)
      .single();
    buildingName = (building as any)?.name;
  }

  let query = supabase.from('rooms')
    .select(`id,name,room_number,room_type,capacity,floor:floors(id,name,building:buildings(id,name))`);

  if (params.q) query = query.or(`name.ilike.%${params.q}%,room_number.ilike.%${params.q}%`);
  if (params.type) query = query.eq('room_type', params.type);
  if (params.floor) query = query.eq('floor_id', params.floor);

  const { data: rawRooms } = await query.order('room_number').limit(200);

  // Filter by building if specified (rooms don't have building_id directly)
  let filteredRooms = rawRooms ?? [];
  if (params.building) {
    filteredRooms = filteredRooms.filter((r: any) => r.floor?.building?.id === params.building);
  }

  // Attach accurate asset counts — use count queries, not row fetches
  const rooms = await Promise.all(
    filteredRooms.map(async (r: any) => {
      const { count } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', r.id);
      return { ...r, asset_count: count ?? 0 };
    })
  );

  return <RoomsContent rooms={rooms} params={params} floorName={floorName} buildingName={buildingName} />;
}

function RoomsContent({ rooms, params, floorName, buildingName }: {
  rooms: any[];
  params: RoomSearchParams;
  floorName?: string;
  buildingName?: string;
}) {
  const roomTypes = Object.keys(ROOM_TYPE_LABELS);
  const contextTitle = floorName
    ? `Rooms on ${floorName}`
    : buildingName
      ? `Rooms in ${buildingName}`
      : 'Campus Room Directory';

  const totalAssetsInView = rooms.reduce((sum, r) => sum + (r.asset_count ?? 0), 0);

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-10">
      {/* Breadcrumb */}
      {(floorName || buildingName) && (
        <nav className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
          <Link href="/locations/buildings" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Buildings</Link>
          <span>/</span>
          {buildingName && (
            <>
              <span className={floorName ? 'hover:text-zinc-700 dark:hover:text-zinc-300' : 'text-zinc-700 dark:text-zinc-200 font-medium'}>
                {buildingName}
              </span>
              <span>/</span>
            </>
          )}
          {floorName && (
            <span className="text-zinc-700 dark:text-zinc-200 font-medium">{floorName}</span>
          )}
        </nav>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{contextTitle}</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {rooms.length} room facilities · {totalAssetsInView.toLocaleString()} allocated physical assets
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(params.floor || params.building) && (
            <Link
              href="/locations/rooms"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              View All Campus Rooms
            </Link>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <form className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="q"
          defaultValue={params.q}
          placeholder="Search room name, lab number…"
          className="flex-1 min-w-[220px] max-w-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          name="type"
          defaultValue={params.type ?? ''}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Room Types</option>
          {roomTypes.map((t) => (
            <option key={t} value={t}>
              {ROOM_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        {params.floor && <input type="hidden" name="floor" value={params.floor} />}
        {params.building && <input type="hidden" name="building" value={params.building} />}
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
        >
          Filter
        </button>
        {(params.q || params.type) && (
          <Link
            href={`/locations/rooms${params.floor ? `?floor=${params.floor}` : params.building ? `?building=${params.building}` : ''}`}
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          >
            Clear
          </Link>
        )}
      </form>

      {rooms.length === 0 ? (
        <EmptyState
          icon={<DoorOpen className="h-8 w-8" />}
          title="No rooms match your filter"
          description="Try clearing or modifying your search parameters"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map((room: any) => (
            <Link key={room.id} href={`/locations/rooms/${room.id}`}>
              <Card className="hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group h-full flex flex-col justify-between">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {room.name}
                        </h3>
                        {room.room_number && (
                          <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 px-1 rounded bg-zinc-100 dark:bg-zinc-800">
                            #{room.room_number}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                        {room.floor?.name ?? 'Ground Floor'} · {room.floor?.building?.name ?? 'Main Building'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-500 transition-colors shrink-0 mt-0.5" />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
                    <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                      {ROOM_TYPE_LABELS[room.room_type] ?? room.room_type}
                    </span>

                    <span className="font-mono font-bold text-zinc-900 dark:text-white flex items-center gap-1">
                      <Package className="h-3 w-3 text-indigo-500" />
                      {room.asset_count ?? 0}{' '}
                      <span className="text-[10px] text-zinc-400 font-normal">assets</span>
                    </span>
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
