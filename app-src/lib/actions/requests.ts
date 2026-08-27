'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { AddAssetFormData, TransferRequestFormData, EditRequestFormData, DeleteRequestFormData } from '@/lib/types';

async function getCurrentUserAndProfile() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, institution_id')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');
  return { user, profile, supabase };
}

// ============================================================
// Submit ADD request
// ============================================================
export async function submitAddRequest(formData: FormData) {
  const { user, profile, supabase } = await getCurrentUserAndProfile();

  if (!['asset_manager', 'approver'].includes(profile.role)) {
    throw new Error('Unauthorized');
  }

  const newValues = {
    name:             formData.get('name') as string,
    asset_tag:        formData.get('asset_tag') as string || undefined,
    category_id:      formData.get('category_id') as string,
    room_id:          formData.get('room_id') as string,
    acquisition_year: formData.get('acquisition_year')
      ? parseInt(formData.get('acquisition_year') as string)
      : undefined,
    status:           formData.get('status') as string || 'active',
    description:      formData.get('description') as string || undefined,
  };

  const reason = formData.get('reason') as string;

  if (!newValues.name || !newValues.room_id) {
    throw new Error('Name and room are required');
  }

  const { error } = await supabase.from('change_requests').insert({
    institution_id: profile.institution_id,
    type:           'addition',
    status:         'pending',
    requested_by:   user.id,
    reason,
    new_values:     newValues,
    old_values:     {},
  });

  if (error) throw new Error(error.message);

  revalidatePath('/approvals');
  revalidatePath('/dashboard');
}

// ============================================================
// Submit TRANSFER request
// ============================================================
export async function submitTransferRequest(data: TransferRequestFormData) {
  const { user, profile, supabase } = await getCurrentUserAndProfile();

  if (!['asset_manager', 'approver'].includes(profile.role)) {
    throw new Error('Unauthorized');
  }

  // Check no pending requests already exist for this asset
  const { data: existing } = await supabase
    .from('change_requests')
    .select('id, type')
    .eq('asset_id', data.asset_id)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();

  if (existing) {
    throw new Error(
      `This asset already has a pending ${existing.type} request. Resolve it before submitting a new one.`
    );
  }

  const { error } = await supabase.from('change_requests').insert({
    institution_id: profile.institution_id,
    type:           'transfer',
    status:         'pending',
    asset_id:       data.asset_id,
    requested_by:   user.id,
    reason:         data.reason,
    new_values:     { to_room_id: data.to_room_id },
    old_values:     {},
  });

  if (error) throw new Error(error.message);

  revalidatePath('/approvals');
  revalidatePath('/transfers');
  revalidatePath(`/inventory/${data.asset_id}`);
}

// ============================================================
// Submit EDIT request
// ============================================================
export async function submitEditRequest(data: EditRequestFormData) {
  const { user, profile, supabase } = await getCurrentUserAndProfile();

  if (!['asset_manager', 'approver'].includes(profile.role)) {
    throw new Error('Unauthorized');
  }

  // Check no pending requests
  const { data: existing } = await supabase
    .from('change_requests')
    .select('id, type')
    .eq('asset_id', data.asset_id)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();

  if (existing) {
    throw new Error(`Asset has a pending ${existing.type} request`);
  }

  // Capture old values
  const { data: asset } = await supabase
    .from('assets')
    .select('name, description, category_id, acquisition_year')
    .eq('id', data.asset_id)
    .single();

  const { error } = await supabase.from('change_requests').insert({
    institution_id: profile.institution_id,
    type:           'edit',
    status:         'pending',
    asset_id:       data.asset_id,
    requested_by:   user.id,
    reason:         data.reason,
    new_values:     {
      name:             data.name,
      description:      data.description,
      category_id:      data.category_id,
      acquisition_year: data.acquisition_year,
    },
    old_values: asset ?? {},
  });

  if (error) throw new Error(error.message);

  revalidatePath('/approvals');
  revalidatePath(`/inventory/${data.asset_id}`);
}

// ============================================================
// Submit DELETION request
// ============================================================
export async function submitDeleteRequest(data: DeleteRequestFormData) {
  const { user, profile, supabase } = await getCurrentUserAndProfile();

  if (!['asset_manager', 'approver'].includes(profile.role)) {
    throw new Error('Unauthorized');
  }

  // Check no pending requests
  const { data: existing } = await supabase
    .from('change_requests')
    .select('id, type')
    .eq('asset_id', data.asset_id)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();

  if (existing) {
    throw new Error(`Asset has a pending ${existing.type} request`);
  }

  const { error } = await supabase.from('change_requests').insert({
    institution_id: profile.institution_id,
    type:           'deletion',
    status:         'pending',
    asset_id:       data.asset_id,
    requested_by:   user.id,
    reason:         data.reason,
    new_values:     { disposition: data.disposition },
    old_values:     {},
  });

  if (error) throw new Error(error.message);

  revalidatePath('/approvals');
  revalidatePath(`/inventory/${data.asset_id}`);
}

// ============================================================
// Approve a request (Approver only)
// ============================================================
export async function approveRequest(requestId: string) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (profile.role !== 'approver') {
    throw new Error('Only approvers can approve requests');
  }

  // Use admin client to call SECURITY DEFINER function
  const admin = createAdminClient();

  // First, get the request type
  const { data: req } = await admin
    .from('change_requests')
    .select('type, requested_by')
    .eq('id', requestId)
    .single();

  if (!req) throw new Error('Request not found');
  if (req.requested_by === user.id) {
    throw new Error('Cannot approve your own request');
  }

  // Call the appropriate SECURITY DEFINER function
  const fnMap: Record<string, string> = {
    addition: 'process_addition_approval',
    transfer: 'process_transfer_approval',
    edit:     'process_edit_approval',
    deletion: 'process_deletion_approval',
  };

  const fnName = fnMap[req.type];
  if (!fnName) throw new Error('Unknown request type');

  const { error } = await admin.rpc(fnName, {
    p_request_id:  requestId,
    p_approver_id: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath('/approvals');
  revalidatePath('/inventory');
  revalidatePath('/dashboard');
}

// ============================================================
// Reject a request (Approver only)
// ============================================================
export async function rejectRequest(requestId: string, reason: string) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (profile.role !== 'approver') {
    throw new Error('Only approvers can reject requests');
  }

  if (!reason?.trim()) {
    throw new Error('Rejection reason is required');
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc('reject_change_request', {
    p_request_id:  requestId,
    p_approver_id: user.id,
    p_reason:      reason,
  });

  if (error) throw new Error(error.message);

  revalidatePath('/approvals');
  revalidatePath('/dashboard');
}

// ============================================================
// Submit BATCH Transfer request
// ============================================================
export async function submitBatchTransferRequest({
  asset_ids,
  to_room_id,
  reason,
}: {
  asset_ids: string[];
  to_room_id: string;
  reason: string;
}) {
  const { user, profile, supabase } = await getCurrentUserAndProfile();

  if (!['asset_manager', 'approver'].includes(profile.role)) {
    throw new Error('Unauthorized');
  }

  if (!asset_ids || asset_ids.length === 0) {
    throw new Error('No assets selected');
  }

  // Insert change requests for each asset
  const rows = asset_ids.map((id) => ({
    institution_id: profile.institution_id,
    type:           'transfer',
    status:         'pending',
    asset_id:       id,
    requested_by:   user.id,
    reason:         reason,
    new_values:     { to_room_id },
    old_values:     {},
  }));

  const { error } = await supabase.from('change_requests').insert(rows);

  if (error) throw new Error(error.message);

  revalidatePath('/approvals');
  revalidatePath('/transfers');
  revalidatePath('/inventory');
  return { count: asset_ids.length };
}

// ============================================================
// Submit BATCH Deletion request
// ============================================================
export async function submitBatchDeleteRequest({
  asset_ids,
  disposition,
  reason,
}: {
  asset_ids: string[];
  disposition: string;
  reason: string;
}) {
  const { user, profile, supabase } = await getCurrentUserAndProfile();

  if (!['asset_manager', 'approver'].includes(profile.role)) {
    throw new Error('Unauthorized');
  }

  if (!asset_ids || asset_ids.length === 0) {
    throw new Error('No assets selected');
  }

  const rows = asset_ids.map((id) => ({
    institution_id: profile.institution_id,
    type:           'deletion',
    status:         'pending',
    asset_id:       id,
    requested_by:   user.id,
    reason:         reason,
    new_values:     { disposition },
    old_values:     {},
  }));

  const { error } = await supabase.from('change_requests').insert(rows);

  if (error) throw new Error(error.message);

  revalidatePath('/approvals');
  revalidatePath('/inventory');
  return { count: asset_ids.length };
}
