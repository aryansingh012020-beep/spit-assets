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
// Submit PHOTO Approval request
// ============================================================
export async function submitPhotoApprovalRequest({
  assetId,
  storagePath,
  publicUrl,
  reason,
  fileName,
  fileSize,
  mimeType,
}: {
  assetId: string;
  storagePath: string;
  publicUrl: string;
  reason?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}) {
  const { user, profile, supabase } = await getCurrentUserAndProfile();

  if (!['asset_manager', 'approver'].includes(profile.role)) {
    throw new Error('Unauthorized: You must be an Asset Manager or Approver to submit photos.');
  }

  const { data: asset } = await supabase
    .from('assets')
    .select('id, name, asset_tag')
    .eq('id', assetId)
    .single();

  if (!asset) throw new Error('Asset not found');

  const { error } = await supabase.from('change_requests').insert({
    institution_id: profile.institution_id,
    type:           'edit',
    status:         'pending',
    asset_id:       assetId,
    requested_by:   user.id,
    reason:         reason?.trim() || `Physical asset photo verification for ${asset.asset_tag}`,
    photo_path:     storagePath,
    new_values: {
      is_photo_approval: true,
      storage_path:      storagePath,
      photo_url:         publicUrl,
      file_name:         fileName || 'equipment-photo.jpg',
      file_size:         fileSize || 0,
      mime_type:         mimeType || 'image/jpeg',
    },
    old_values: {},
  });

  if (error) throw new Error(error.message);

  revalidatePath('/approvals');
  revalidatePath(`/inventory/${assetId}`);
  revalidatePath('/inventory');
  return { success: true };
}

// ============================================================
// Approve a request (Approver only)
// ============================================================
export async function approveRequest(requestId: string) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (profile.role !== 'approver') {
    throw new Error('Only approvers can approve requests');
  }

  // Use admin client to call SECURITY DEFINER function or handle custom approvals
  const admin = createAdminClient();

  // First, get the request details
  const { data: req } = await admin
    .from('change_requests')
    .select('id, type, requested_by, asset_id, reason, photo_path, new_values, old_values')
    .eq('id', requestId)
    .single();

  if (!req) throw new Error('Request not found');
  if (req.requested_by === user.id) {
    throw new Error('Cannot approve your own request');
  }

  // Handle Photo Approval Request
  if (req.new_values && (req.new_values as any).is_photo_approval) {
    const photoVals = req.new_values as any;
    const storagePath = photoVals.storage_path || req.photo_path;

    if (!storagePath) throw new Error('Missing photo storage path');

    // 1. Unset existing primary photos for this asset
    await admin
      .from('asset_photos')
      .update({ is_primary: false })
      .eq('asset_id', req.asset_id);

    // 2. Insert new approved photo into asset_photos
    const { data: photoRecord, error: photoErr } = await admin
      .from('asset_photos')
      .insert({
        asset_id:     req.asset_id,
        storage_path: storagePath,
        file_name:    photoVals.file_name || 'asset-photo.jpg',
        mime_type:    photoVals.mime_type || 'image/jpeg',
        file_size:    photoVals.file_size || 0,
        is_primary:   true,
        uploaded_by:  req.requested_by,
      })
      .select()
      .single();

    if (photoErr) throw new Error(photoErr.message);

    // 3. Update asset primary_photo_id
    await admin
      .from('assets')
      .update({ primary_photo_id: photoRecord.id })
      .eq('id', req.asset_id);

    // 4. Mark change request approved
    await admin
      .from('change_requests')
      .update({
        status:      'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    // 5. Record photo event in asset_history
    await admin.from('asset_history').insert({
      asset_id:     req.asset_id,
      event_type:   'photo_uploaded',
      performed_by: req.requested_by,
      approved_by:  user.id,
      new_value:    { photo_id: photoRecord.id, storage_path: storagePath },
      reason:       req.reason,
      metadata:     { request_id: requestId },
    });

    revalidatePath('/approvals');
    revalidatePath('/inventory');
    revalidatePath(`/inventory/${req.asset_id}`);
    revalidatePath('/dashboard');
    return { success: true };
  }

  // Call the appropriate SECURITY DEFINER function for regular requests
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
