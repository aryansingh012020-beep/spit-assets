import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode, DEMO_ROOMS, DEMO_ASSETS } from '@/lib/demo-data';
import { AuditSessionClient } from './audit-session-client';

export const dynamic = 'force-dynamic';

interface AuditSearchParams {
  room?: string;
  year?: string;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<AuditSearchParams>;
}) {
  const params = await searchParams;
  const academicYear = params.year || '2025-2026';

  // ── Demo mode ────────────────────────────────────────────────────
  if (isDemoMode()) {
    const cookieStore = await cookies();
    if (cookieStore.get('demo_session')?.value !== 'true') redirect('/login');

    const rooms = DEMO_ROOMS.map((r) => ({
      id: r.id,
      name: r.name,
      floor: { name: 'Floor ' + r.room_number[0] },
    }));

    const selectedRoomId = params.room || rooms[0]?.id || 'demo-r1';
    const roomAssets = DEMO_ASSETS.filter((a) => a.room.id === selectedRoomId);

    const demoVerifications: Record<string, any> = {};
    roomAssets.slice(0, Math.floor(roomAssets.length * 0.7)).forEach((a) => {
      demoVerifications[a.id] = {
        asset_id: a.id,
        verification_status: 'present',
        verified_at: new Date().toISOString(),
      };
    });

    return (
      <AuditSessionClient
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        academicYear={academicYear}
        assets={roomAssets}
        verifications={demoVerifications}
        auditorName="Dr. Ramesh K. Verma (Demo Auditor)"
      />
    );
  }

  // ── Production mode ──────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  // Fetch all rooms
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, room_number, floor:floors(id, name, level)')
    .order('room_number');

  if (!rooms || rooms.length === 0) {
    return <div className="p-8 text-center text-zinc-500">No rooms available for audit.</div>;
  }

  const selectedRoomId = params.room || rooms[0].id;

  // Fetch assets in this room
  const { data: assets } = await supabase
    .from('assets')
    .select('id, asset_tag, name, serial_number, model_number, acquisition_year, status, category:asset_categories(name)')
    .eq('room_id', selectedRoomId)
    .order('asset_tag');

  // Fetch existing verifications for this room and academic year
  const { data: verificationsList } = await supabase
    .from('asset_verifications')
    .select('*')
    .eq('room_id', selectedRoomId)
    .eq('academic_year', academicYear);

  const verificationsMap: Record<string, any> = {};
  (verificationsList ?? []).forEach((v: any) => {
    verificationsMap[v.asset_id] = v;
  });

  return (
    <AuditSessionClient
      rooms={rooms}
      selectedRoomId={selectedRoomId}
      academicYear={academicYear}
      assets={assets ?? []}
      verifications={verificationsMap}
      auditorName={profile?.full_name ?? user.email ?? 'Staff Auditor'}
    />
  );
}
