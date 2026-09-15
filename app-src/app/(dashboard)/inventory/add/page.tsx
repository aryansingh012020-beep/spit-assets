import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AddAssetsClient } from './add-assets-client';

export const metadata = { title: 'Add Assets — SPIT Asset Management' };

export default async function AddAssetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('id', user.id).single();

  if (!profile || !['asset_manager', 'approver'].includes(profile.role)) {
    redirect('/dashboard');
  }

  const [categoriesRes, roomsRes, buildingsRes, floorsRes] = await Promise.all([
    supabase.from('asset_categories').select('id, name, code').order('name'),
    supabase.from('rooms').select('id, name, room_number, floor_id, floors(id, name, building_id, buildings(id, name))').order('name'),
    supabase.from('buildings').select('id, name, code').order('name'),
    supabase.from('floors').select('id, name, building_id').order('name'),
  ]);

  // Flatten room data with floor/building context for cascading
  const rooms = (roomsRes.data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    room_number: r.room_number,
    floor_id: r.floor_id,
    floor_name: r.floors?.name ?? null,
    building_id: r.floors?.building_id ?? null,
    building_name: r.floors?.buildings?.name ?? null,
  }));

  return (
    <AddAssetsClient
      categories={categoriesRes.data ?? []}
      rooms={rooms}
      buildings={buildingsRes.data ?? []}
      floors={floorsRes.data ?? []}
      isApprover={profile.role === 'approver'}
    />
  );
}
