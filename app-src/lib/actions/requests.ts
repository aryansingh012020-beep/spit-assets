'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { AddAssetFormData, TransferRequestFormData, EditRequestFormData, DeleteRequestFormData } from '@/lib/types';

async function getCurrentUserAndProfile() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');

  const admin = createAdminClient();
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('id, role, institution_id')
    .eq('id', user.id)
    .single();

  if (!profile || profileErr) throw new Error('Profile not found');
  return { user, profile, supabase };
}

// ============================================================
// Submit ADD request
// ============================================================
export async function submitAddRequest(data: AddAssetFormData): Promise<{
  success: boolean;
  error?: string;
  directApproved?: boolean;
  assetId?: string;
  assetTag?: string;
}> {
  try {
    const { user, profile } = await getCurrentUserAndProfile();

    if (!['asset_manager', 'approver'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized: You must be an Asset Manager or Approver to submit asset requests.' };
    }

    const name = data.name?.trim();
    const roomId = data.room_id?.trim();
    const categoryId = data.category_id?.trim();
    const reason = data.reason?.trim();

    if (!name) {
      return { success: false, error: 'Asset name is required.' };
    }
    if (!roomId) {
      return { success: false, error: 'Location / Room is required.' };
    }
    if (!categoryId) {
      return { success: false, error: 'Category is required.' };
    }
    if (!reason) {
      return { success: false, error: 'Justification / Reason is required.' };
    }

    const parsedYear = data.acquisition_year
      ? (typeof data.acquisition_year === 'string' ? parseInt(data.acquisition_year, 10) : data.acquisition_year)
      : undefined;

    const acquisitionYear = (parsedYear && !isNaN(parsedYear)) ? parsedYear : null;
    const institutionId = profile.institution_id || '00000000-0000-0000-0000-000000000001';
    const admin = createAdminClient();

    // ────────────────────────────────────────────────────────────
    // If the caller is an APPROVER, directly commit asset to inventory
    // ────────────────────────────────────────────────────────────
    if (profile.role === 'approver') {
      let finalAssetTag = data.asset_tag?.trim() || null;

      // Auto-generate tag if not explicitly supplied
      if (!finalAssetTag) {
        const { data: cat } = await admin
          .from('asset_categories')
          .select('code')
          .eq('id', categoryId)
          .single();

        const catCode = cat?.code || 'GEN';
        const { data: generatedTag } = await admin.rpc('generate_asset_tag', {
          p_institution_id: institutionId,
          p_category_code: catCode,
          p_year: acquisitionYear,
        });

        finalAssetTag = generatedTag || null;
      }

      // Fetch room hierarchy
      const { data: roomInfo } = await admin
        .from('rooms')
        .select('id, floor_id, building_id')
        .eq('id', roomId)
        .single();

      // Insert directly into assets
      const { data: newAsset, error: assetErr } = await admin
        .from('assets')
        .insert({
          institution_id:  institutionId,
          asset_tag:       finalAssetTag,
          name:            name,
          description:     data.description?.trim() || null,
          category_id:     categoryId,
          room_id:         roomId,
          floor_id:        roomInfo?.floor_id || null,
          building_id:     roomInfo?.building_id || null,
          status:          data.status || 'active',
          acquisition_year: acquisitionYear,
        })
        .select('id, asset_tag')
        .single();

      if (assetErr) {
        console.error('Direct asset creation error:', assetErr);
        return { success: false, error: assetErr.message };
      }

      // If photo was provided during creation, attach as primary photo
      if (data.photo_path) {
        const { data: photoRecord } = await admin
          .from('asset_photos')
          .insert({
            asset_id:     newAsset.id,
            storage_path: data.photo_path,
            file_name:    'initial-asset-photo.jpg',
            mime_type:    'image/jpeg',
            file_size:    0,
            is_primary:   true,
            uploaded_by:  user.id,
          })
          .select('id')
          .single();

        if (photoRecord) {
          await admin
            .from('assets')
            .update({ primary_photo_id: photoRecord.id })
            .eq('id', newAsset.id);
        }
      }

      // Log creation in asset_history
      await admin.from('asset_history').insert({
        asset_id:     newAsset.id,
        event_type:   'creation',
        performed_by: user.id,
        approved_by:  user.id,
        to_location:  { room_id: roomId },
        reason:       reason,
        new_value:    { asset_tag: newAsset.asset_tag, name: name },
        metadata:     { direct_creation: true, has_photo: Boolean(data.photo_path) },
      });

      // Also record an approved change_request for complete institutional audit trail
      await admin.from('change_requests').insert({
        institution_id: institutionId,
        type:           'addition',
        status:         'approved',
        asset_id:       newAsset.id,
        requested_by:   user.id,
        reviewed_by:    user.id,
        reviewed_at:    new Date().toISOString(),
        reason:         reason,
        photo_path:     data.photo_path || null,
        new_values: {
          name,
          asset_tag:        newAsset.asset_tag,
          category_id:      categoryId,
          room_id:          roomId,
          acquisition_year: acquisitionYear,
          status:           data.status || 'active',
          description:      data.description?.trim() || null,
          photo_path:       data.photo_path || null,
        },
        old_values: {},
      });

      revalidatePath('/inventory');
      revalidatePath('/locations/rooms');
      revalidatePath(`/locations/rooms/${roomId}`);
      revalidatePath('/dashboard');
      revalidatePath('/approvals');

      return {
        success: true,
        directApproved: true,
        assetId: newAsset.id,
        assetTag: newAsset.asset_tag,
      };
    }

    // ────────────────────────────────────────────────────────────
    // If the caller is an ASSET MANAGER, create pending change request
    // ────────────────────────────────────────────────────────────
    const newValues = {
      name,
      asset_tag:        data.asset_tag?.trim() || null,
      category_id:      categoryId,
      room_id:          roomId,
      acquisition_year: acquisitionYear,
      status:           data.status || 'active',
      description:      data.description?.trim() || null,
      photo_path:       data.photo_path || null,
    };

    const { error } = await admin.from('change_requests').insert({
      institution_id: institutionId,
      type:           'addition',
      status:         'pending',
      requested_by:   user.id,
      reason,
      photo_path:     data.photo_path || null,
      new_values:     newValues,
      old_values:     {},
    });

    if (error) {
      console.error('Error inserting change_request (addition):', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/approvals');
    revalidatePath(`/locations/rooms/${roomId}`);
    revalidatePath('/dashboard');
    return { success: true, directApproved: false };
  } catch (err: any) {
    console.error('submitAddRequest uncaught error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred while submitting the request.' };
  }
}

// ============================================================
// Submit TRANSFER request
// ============================================================
export async function submitTransferRequest(data: TransferRequestFormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await getCurrentUserAndProfile();

    if (!['asset_manager', 'approver'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized: You must be an Asset Manager or Approver.' };
    }

    const admin = createAdminClient();

    // Check no pending requests already exist for this asset
    const { data: existing } = await admin
      .from('change_requests')
      .select('id, type')
      .eq('asset_id', data.asset_id)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: `This asset already has a pending ${existing.type} request. Resolve it before submitting a new one.`,
      };
    }

    const institutionId = profile.institution_id || '00000000-0000-0000-0000-000000000001';

    const { error } = await admin.from('change_requests').insert({
      institution_id: institutionId,
      type:           'transfer',
      status:         'pending',
      asset_id:       data.asset_id,
      requested_by:   user.id,
      reason:         data.reason?.trim() || 'Asset transfer request',
      new_values:     { to_room_id: data.to_room_id },
      old_values:     {},
    });

    if (error) {
      console.error('Error inserting change_request (transfer):', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/approvals');
    revalidatePath('/transfers');
    revalidatePath(`/inventory/${data.asset_id}`);
    return { success: true };
  } catch (err: any) {
    console.error('submitTransferRequest uncaught error:', err);
    return { success: false, error: err.message || 'Failed to submit transfer request' };
  }
}

// ============================================================
// Submit EDIT request
// ============================================================
export async function submitEditRequest(data: EditRequestFormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await getCurrentUserAndProfile();

    if (!['asset_manager', 'approver'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized: You must be an Asset Manager or Approver.' };
    }

    const admin = createAdminClient();

    // Check no pending requests
    const { data: existing } = await admin
      .from('change_requests')
      .select('id, type')
      .eq('asset_id', data.asset_id)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Asset has a pending ${existing.type} request.` };
    }

    // Capture old values
    const { data: asset } = await admin
      .from('assets')
      .select('name, description, category_id, acquisition_year')
      .eq('id', data.asset_id)
      .single();

    const institutionId = profile.institution_id || '00000000-0000-0000-0000-000000000001';

    const { error } = await admin.from('change_requests').insert({
      institution_id: institutionId,
      type:           'edit',
      status:         'pending',
      asset_id:       data.asset_id,
      requested_by:   user.id,
      reason:         data.reason?.trim() || 'Asset details edit request',
      new_values:     {
        name:             data.name?.trim(),
        description:      data.description?.trim() || null,
        category_id:      data.category_id,
        acquisition_year: data.acquisition_year || null,
      },
      old_values: asset ?? {},
    });

    if (error) {
      console.error('Error inserting change_request (edit):', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/approvals');
    revalidatePath(`/inventory/${data.asset_id}`);
    return { success: true };
  } catch (err: any) {
    console.error('submitEditRequest uncaught error:', err);
    return { success: false, error: err.message || 'Failed to submit edit request' };
  }
}

// ============================================================
// Submit DELETION request
// ============================================================
export async function submitDeleteRequest(data: DeleteRequestFormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await getCurrentUserAndProfile();

    if (!['asset_manager', 'approver'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized: You must be an Asset Manager or Approver.' };
    }

    const admin = createAdminClient();

    // Check no pending requests
    const { data: existing } = await admin
      .from('change_requests')
      .select('id, type')
      .eq('asset_id', data.asset_id)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Asset has a pending ${existing.type} request.` };
    }

    const institutionId = profile.institution_id || '00000000-0000-0000-0000-000000000001';

    const { error } = await admin.from('change_requests').insert({
      institution_id: institutionId,
      type:           'deletion',
      status:         'pending',
      asset_id:       data.asset_id,
      requested_by:   user.id,
      reason:         data.reason?.trim() || 'Asset disposal request',
      new_values:     { disposition: data.disposition },
      old_values:     {},
    });

    if (error) {
      console.error('Error inserting change_request (deletion):', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/approvals');
    revalidatePath(`/inventory/${data.asset_id}`);
    return { success: true };
  } catch (err: any) {
    console.error('submitDeleteRequest uncaught error:', err);
    return { success: false, error: err.message || 'Failed to submit deletion request' };
  }
}

// ============================================================
// Robust Server-Side Photo Upload Action (Direct Approver Commit or Request)
// ============================================================
export async function uploadAssetPhotoAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  directApproved?: boolean;
  publicUrl?: string;
  storagePath?: string;
  photoRecord?: any;
  requestId?: string;
}> {
  try {
    const { user, profile } = await getCurrentUserAndProfile();

    if (!['asset_manager', 'approver'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized: You must be an Asset Manager or Approver to submit photos.' };
    }

    const file = formData.get('file') as File | null;
    const assetId = (formData.get('assetId') as string)?.trim();
    const reason = (formData.get('reason') as string)?.trim();

    if (!file || !file.size) {
      return { success: false, error: 'No image file provided.' };
    }

    const admin = createAdminClient();
    const institutionId = profile.institution_id || '00000000-0000-0000-0000-000000000001';

    const ext = file.name.split('.').pop() || 'jpg';
    const cleanExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '');
    const folder = assetId && assetId !== 'new' ? assetId : 'unassigned';
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${cleanExt}`;

    const arrayBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage via admin client (bypasses browser RLS completely)
    const { error: uploadErr } = await admin.storage
      .from('asset-photos')
      .upload(filename, arrayBuffer, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadErr) {
      console.error('Storage upload error in action:', uploadErr);
      return { success: false, error: `Storage upload failed: ${uploadErr.message}` };
    }

    const {
      data: { publicUrl },
    } = admin.storage.from('asset-photos').getPublicUrl(filename);

    // If uploading for a new asset creation flow (no existing assetId yet)
    if (!assetId || assetId === 'new') {
      return {
        success: true,
        directApproved: profile.role === 'approver',
        storagePath: filename,
        publicUrl,
      };
    }

    // Verify target asset exists
    const { data: asset, error: assetErr } = await admin
      .from('assets')
      .select('id, name, asset_tag')
      .eq('id', assetId)
      .single();

    if (assetErr || !asset) {
      return { success: false, error: 'Target asset record not found.' };
    }

    // APPROVER DIRECT FLOW: Only if explicitly flagged to direct-approve without approval review
    const shouldDirectApprove = profile.role === 'approver';
    console.log('[uploadAssetPhotoAction] role:', profile.role, '| directApprove param:', formData.get('directApprove'), '| shouldDirectApprove:', shouldDirectApprove);

    if (shouldDirectApprove) {
      // 1. Unset prior primary photos
      await admin
        .from('asset_photos')
        .update({ is_primary: false })
        .eq('asset_id', assetId);

      // 2. Insert new photo record
      const { data: photoRecord, error: photoErr } = await admin
        .from('asset_photos')
        .insert({
          asset_id:     assetId,
          storage_path: filename,
          file_name:    file.name || 'asset-photo.jpg',
          mime_type:    file.type || 'image/jpeg',
          file_size:    file.size || arrayBuffer.byteLength,
          is_primary:   true,
          uploaded_by:  user.id,
        })
        .select()
        .single();

      if (photoErr) {
        return { success: false, error: photoErr.message };
      }

      // 3. Update asset primary_photo_id
      await admin
        .from('assets')
        .update({ primary_photo_id: photoRecord.id })
        .eq('id', assetId);

      // 4. Log photo event in asset_history
      await admin.from('asset_history').insert({
        asset_id:     assetId,
        event_type:   'photo_uploaded',
        performed_by: user.id,
        approved_by:  user.id,
        new_value:    { photo_id: photoRecord.id, storage_path: filename, url: publicUrl },
        reason:       reason || `Physical audit photo captured for ${asset.asset_tag || asset.name}`,
        metadata:     { direct_creation: true },
      });

      // 5. Audit record in change_requests
      await admin.from('change_requests').insert({
        institution_id: institutionId,
        type:           'edit',
        status:         'approved',
        asset_id:       assetId,
        requested_by:   user.id,
        reviewed_by:    user.id,
        reviewed_at:    new Date().toISOString(),
        reason:         reason || `Physical audit photo captured for ${asset.asset_tag || asset.name}`,
        photo_path:     filename,
        new_values: {
          is_photo_approval: true,
          storage_path:      filename,
          photo_url:         publicUrl,
          file_name:         file.name || 'asset-photo.jpg',
          file_size:         file.size || arrayBuffer.byteLength,
          mime_type:         file.type || 'image/jpeg',
        },
        old_values: {},
      });

      revalidatePath('/approvals');
      revalidatePath('/inventory');
      revalidatePath(`/inventory/${assetId}`);
      revalidatePath('/dashboard');

      return {
        success: true,
        directApproved: true,
        publicUrl,
        storagePath: filename,
        photoRecord,
      };
    }

    // DEFAULT FLOW: Submit for approval -> always creates pending change request
    const { data: newReq, error: reqErr } = await admin.from('change_requests').insert({
      institution_id: institutionId,
      type:           'edit',
      status:         'pending',
      asset_id:       assetId,
      requested_by:   user.id,
      reason:         reason || `Physical asset photo verification for ${asset.asset_tag || asset.name}`,
      photo_path:     filename,
      new_values: {
        is_photo_approval: true,
        storage_path:      filename,
        photo_url:         publicUrl,
        file_name:         file.name || 'equipment-photo.jpg',
        file_size:         file.size || arrayBuffer.byteLength,
        mime_type:         file.type || 'image/jpeg',
      },
      old_values: {},
    }).select().single();

    if (reqErr) {
      console.error('Error inserting photo change_request:', reqErr);
      return { success: false, error: reqErr.message };
    }

    revalidatePath('/approvals');
    revalidatePath(`/inventory/${assetId}`);
    revalidatePath('/inventory');
    revalidatePath('/dashboard');

    return {
      success: true,
      directApproved: false,
      publicUrl,
      storagePath: filename,
      requestId: newReq?.id,
    };
  } catch (err: any) {
    console.error('uploadAssetPhotoAction uncaught error:', err);
    return { success: false, error: err.message || 'Failed to process photo upload' };
  }
}

// ============================================================
// Submit PHOTO Approval request (Backwards compatible fallback)
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
}): Promise<{ success: boolean; error?: string; directApproved?: boolean }> {
  try {
    const { user, profile } = await getCurrentUserAndProfile();

    if (!['asset_manager', 'approver'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized: You must be an Asset Manager or Approver to submit photos.' };
    }

    const admin = createAdminClient();
    const { data: asset } = await admin
      .from('assets')
      .select('id, name, asset_tag')
      .eq('id', assetId)
      .single();

    if (!asset) {
      return { success: false, error: 'Asset not found.' };
    }

    const institutionId = profile.institution_id || '00000000-0000-0000-0000-000000000001';

    // Direct approve if Approver
    if (profile.role === 'approver') {
      await admin.from('asset_photos').update({ is_primary: false }).eq('asset_id', assetId);

      const { data: photoRecord, error: photoErr } = await admin
        .from('asset_photos')
        .insert({
          asset_id:     assetId,
          storage_path: storagePath,
          file_name:    fileName || 'asset-photo.jpg',
          mime_type:    mimeType || 'image/jpeg',
          file_size:    fileSize || 0,
          is_primary:   true,
          uploaded_by:  user.id,
        })
        .select()
        .single();

      if (photoErr) return { success: false, error: photoErr.message };

      await admin.from('assets').update({ primary_photo_id: photoRecord.id }).eq('id', assetId);

      await admin.from('asset_history').insert({
        asset_id:     assetId,
        event_type:   'photo_uploaded',
        performed_by: user.id,
        approved_by:  user.id,
        new_value:    { photo_id: photoRecord.id, storage_path: storagePath, url: publicUrl },
        reason:       reason || `Physical audit photo captured for ${asset.asset_tag}`,
        metadata:     { direct_creation: true },
      });

      revalidatePath('/approvals');
      revalidatePath(`/inventory/${assetId}`);
      revalidatePath('/inventory');
      return { success: true, directApproved: true };
    }

    const { error } = await admin.from('change_requests').insert({
      institution_id: institutionId,
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

    if (error) {
      console.error('Error inserting photo change_request:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/approvals');
    revalidatePath(`/inventory/${assetId}`);
    revalidatePath('/inventory');
    return { success: true, directApproved: false };
  } catch (err: any) {
    console.error('submitPhotoApprovalRequest uncaught error:', err);
    return { success: false, error: err.message || 'Failed to submit photo verification request' };
  }
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

  const isPhotoReq = Boolean(req.photo_path || (req.new_values && (req.new_values as any).is_photo_approval));

  // Self-approval guard: exempt photo verifications so that approvers/auditors who captured
  // audit photos can verify them without being blocked.
  if (req.requested_by === user.id && !isPhotoReq) {
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

  // If addition request had an attached photo, link it now as primary photo
  if (req.type === 'addition' && req.photo_path) {
    const { data: cr } = await admin
      .from('change_requests')
      .select('asset_id')
      .eq('id', requestId)
      .single();

    if (cr?.asset_id) {
      const { data: photoRecord } = await admin
        .from('asset_photos')
        .insert({
          asset_id:     cr.asset_id,
          storage_path: req.photo_path,
          file_name:    'initial-asset-photo.jpg',
          mime_type:    'image/jpeg',
          file_size:    0,
          is_primary:   true,
          uploaded_by:  req.requested_by,
        })
        .select('id')
        .single();

      if (photoRecord) {
        await admin
          .from('assets')
          .update({ primary_photo_id: photoRecord.id })
          .eq('id', cr.asset_id);
      }
    }
  }

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
  const { data: req } = await admin
    .from('change_requests')
    .select('id, type, requested_by, asset_id, new_values')
    .eq('id', requestId)
    .single();

  if (!req) throw new Error('Request not found');

  const isPhotoReq = Boolean((req.new_values as any)?.is_photo_approval);

  // For photo approval requests, process directly in admin client to avoid RPC constraints
  if (isPhotoReq || req.requested_by === user.id) {
    await admin.from('change_requests').update({
      status:           'rejected',
      reviewed_by:      user.id,
      reviewed_at:      new Date().toISOString(),
      rejection_reason: reason.trim(),
    }).eq('id', requestId);

    if (req.asset_id) {
      await admin.from('asset_history').insert({
        asset_id:     req.asset_id,
        event_type:   'photo_rejected',
        performed_by: req.requested_by,
        approved_by:  user.id,
        reason:       reason.trim(),
        metadata:     { request_id: requestId },
      });
    }

    revalidatePath('/approvals');
    revalidatePath('/dashboard');
    return { success: true };
  }

  const { error } = await admin.rpc('reject_change_request', {
    p_request_id:  requestId,
    p_approver_id: user.id,
    p_reason:      reason,
  });

  if (error) throw new Error(error.message);

  revalidatePath('/approvals');
  revalidatePath('/dashboard');
  return { success: true };
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
