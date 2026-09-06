'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/demo-data';

export async function assignRoomInCharge({
  roomId,
  inChargeUserId,
}: {
  roomId: string;
  inChargeUserId: string | null;
}) {
  if (isDemoMode()) {
    return { success: true, message: 'Demo mode: Room In-Charge updated successfully' };
  }

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { success: false, error: 'You must be logged in to perform this action.' };
  }

  // Enforce role: only approvers can assign or update the Room In-Charge
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'approver') {
    return { success: false, error: 'Unauthorized: Only institutional Approvers can assign a Room In-Charge.' };
  }

  const { error } = await supabase
    .from('rooms')
    .update({ in_charge_user_id: inChargeUserId || null })
    .eq('id', roomId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/locations/rooms');
  revalidatePath(`/locations/rooms/${roomId}`);
  return { success: true };
}
