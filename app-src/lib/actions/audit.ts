'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface VerifyAssetInput {
  assetId: string;
  roomId: string;
  academicYear: string;
  status: 'present' | 'missing' | 'damaged' | 'transferred';
  notes?: string;
}

export async function verifyAssetStock(input: VerifyAssetInput) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('asset_verifications')
    .upsert(
      {
        asset_id: input.assetId,
        room_id: input.roomId,
        academic_year: input.academicYear,
        verification_status: input.status,
        notes: input.notes?.trim() || null,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      },
      {
        onConflict: 'asset_id,academic_year',
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to record verification');
  }

  // If flagged as missing or damaged, also update asset status if requested
  if (input.status === 'damaged') {
    await supabase.from('assets').update({ status: 'damaged' }).eq('id', input.assetId);
  } else if (input.status === 'missing') {
    await supabase.from('assets').update({ status: 'missing' }).eq('id', input.assetId);
  }

  revalidatePath(`/audit`);
  revalidatePath(`/locations/rooms/${input.roomId}`);
  return { success: true, verification: data };
}

export async function resetRoomStockVerification(roomId: string, academicYear: string) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('asset_verifications')
    .delete()
    .eq('room_id', roomId)
    .eq('academic_year', academicYear);

  if (error) {
    throw new Error(error.message || 'Failed to reset room verification');
  }

  revalidatePath(`/audit`);
  return { success: true };
}
