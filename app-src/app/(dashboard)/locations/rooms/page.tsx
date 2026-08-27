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
      : 'All Rooms';

  return (
    <div className="space-y-5 max-w-5xl">
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{contextTitle}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{rooms.length} room{rooms.length !== 1 ? 's' : ''}</p>
        </div>
        {(params.floor || params.building) && (
          <Link href="/locations/rooms" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">View all rooms</Link>
        )}
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3">
        <input type="text" name="q" defaultValue={params.q} placeholder="Search by name or number…"
          className="flex-1 min-w-[180px] max-w-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <select name="type" defaultValue={params.type ?? ''}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Types</option>
          {roomTypes.map(t => <option key={t} value={t}>{ROOM_TYPE_LABELS[t]}</option>)}
        </select>
        {/* Preserve floor/building filters */}
        {params.floor && <input type="hidden" name="floor" value={params.floor} />}
        {params.building && <input type="hidden" name="building" value={params.building} />}
        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">Filter</button>
        {(params.q || params.type) && (
          <Link
            href={`/locations/rooms${params.floor ? `?floor=${params.floor}` : params.building ? `?building=${params.building}` : ''}`}
            className="self-center text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          >
            Clear
          </Link>
        )}
      </form>

      {rooms.length === 0
        ? <EmptyState icon={<DoorOpen className="h-8 w-8" />} title="No rooms found" description="Try adjusting your filters" />
        : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room: any) => (
              <Link key={room.id} href={`/locations/rooms/${room.id}`}>
                <Card className="hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer group h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {room.name}
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">{room.room_number}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="default" className="text-[10px]">
                          {ROOM_TYPE_LABELS[room.room_type] ?? room.room_type}
                        </Badge>
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {room.floor?.building?.name ?? room.floor?.name ?? 'Unknown building'}
                      {room.floor?.name ? ` · ${room.floor.name}` : ''}
                    </p>

                    <div className="mt-3 flex items-center gap-1.5 text-xs">
                      <Package className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                      <span className="font-semibold text-zinc-700 dark:text-zinc-200">{room.asset_count}</span>
                      <span className="text-zinc-400 dark:text-zinc-500">asset{room.asset_count !== 1 ? 's' : ''}</span>
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
