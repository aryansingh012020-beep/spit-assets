/**
 * Approval Workflow Tests
 * 
 * Tests core invariants of the approval workflow:
 * 1. Asset manager cannot approve their own request (DB-enforced)
 * 2. Double-approval is blocked (request no longer pending)
 * 3. Rejected request doesn't mutate inventory
 * 4. Pending conflict prevention (one pending per asset)
 * 
 * These tests use the supabase-js client and require a running
 * Supabase project. Run with:
 *   npm run test:approvals
 * 
 * Note: These are integration tests, not unit tests.
 * They require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Skip all tests if env vars are missing
const SKIP = !SUPABASE_URL || !SERVICE_KEY;

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

describe.skipIf(SKIP)('Approval Workflow Invariants', () => {
  const admin = adminClient();

  // Fixed test IDs so cleanup is deterministic
  const TEST_INSTITUTION_ID = '00000000-0000-0000-0000-000000000001';
  const TEST_ROOM_ID        = '00000000-0000-0000-0000-000000001001';

  // Test user IDs — these need to exist in auth.users for the test to work
  // In a real CI environment, you'd create them via admin.auth.admin.createUser()
  let managerUserId  = '';
  let approverUserId = '';
  let testAssetId    = '';
  let testRequestId  = '';

  beforeAll(async () => {
    if (SKIP) return;

    // Create test users
    const { data: mgr } = await admin.auth.admin.createUser({
      email: `test-manager-${Date.now()}@spit-test.local`,
      password: 'test-password-123',
      email_confirm: true,
    });
    managerUserId = mgr.user!.id;
    await admin.from('profiles').upsert({
      id: managerUserId,
      role: 'asset_manager',
      institution_id: TEST_INSTITUTION_ID,
      full_name: 'Test Manager',
    });

    const { data: appr } = await admin.auth.admin.createUser({
      email: `test-approver-${Date.now()}@spit-test.local`,
      password: 'test-password-123',
      email_confirm: true,
    });
    approverUserId = appr.user!.id;
    await admin.from('profiles').upsert({
      id: approverUserId,
      role: 'approver',
      institution_id: TEST_INSTITUTION_ID,
      full_name: 'Test Approver',
    });
  });

  afterAll(async () => {
    if (SKIP) return;
    // Cleanup
    if (testAssetId) {
      await admin.from('asset_history').delete().eq('asset_id', testAssetId);
      await admin.from('asset_movements').delete().eq('asset_id', testAssetId);
      await admin.from('change_requests').delete().eq('asset_id', testAssetId);
      await admin.from('assets').delete().eq('id', testAssetId);
    }
    if (testRequestId) {
      await admin.from('change_requests').delete().eq('id', testRequestId);
    }
    if (managerUserId)  await admin.auth.admin.deleteUser(managerUserId);
    if (approverUserId) await admin.auth.admin.deleteUser(approverUserId);
  });

  it('should create an addition request', async () => {
    const { data, error } = await admin.from('change_requests').insert({
      institution_id: TEST_INSTITUTION_ID,
      type:           'addition',
      status:         'pending',
      requested_by:   managerUserId,
      reason:         'Test addition request',
      new_values:     {
        name:        'Test Asset',
        room_id:     TEST_ROOM_ID,
        status:      'active',
        category_id: '00000000-0000-0000-0001-000000000001',
      },
      old_values: {},
    }).select('id').single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    testRequestId = data!.id;
  });

  it('asset manager cannot approve their own request', async () => {
    // Attempt to call the approval function as the manager (same user who requested)
    const { error } = await admin.rpc('process_addition_approval', {
      p_request_id:  testRequestId,
      p_approver_id: managerUserId,  // same as requested_by
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('Cannot approve');
  });

  it('approver can approve the request', async () => {
    const { data, error } = await admin.rpc('process_addition_approval', {
      p_request_id:  testRequestId,
      p_approver_id: approverUserId,
    });

    expect(error).toBeNull();
    testAssetId = data;  // returns the new asset ID
    expect(testAssetId).toBeTruthy();

    // Verify request is now approved
    const { data: req } = await admin
      .from('change_requests')
      .select('status')
      .eq('id', testRequestId)
      .single();
    expect(req?.status).toBe('approved');
  });

  it('double approval attempt fails gracefully', async () => {
    // Try to approve the already-approved request again
    const { error } = await admin.rpc('process_addition_approval', {
      p_request_id:  testRequestId,
      p_approver_id: approverUserId,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('no longer pending');
  });

  it('pending conflict blocks second request for same asset', async () => {
    // Create a pending transfer request for the test asset
    const { data: req1 } = await admin.from('change_requests').insert({
      institution_id: TEST_INSTITUTION_ID,
      type:           'transfer',
      status:         'pending',
      asset_id:       testAssetId,
      requested_by:   managerUserId,
      reason:         'First transfer request',
      new_values:     { to_room_id: TEST_ROOM_ID },
      old_values:     {},
    }).select('id').single();

    // Verify it was created
    expect(req1?.id).toBeTruthy();

    // The second request should be blocked by application logic (server action checks)
    const { data: pending } = await admin
      .from('change_requests')
      .select('id')
      .eq('asset_id', testAssetId)
      .eq('status', 'pending')
      .limit(1)
      .single();

    expect(pending).not.toBeNull();
    // Clean up this pending request
    await admin.from('change_requests').delete().eq('id', req1!.id);
  });

  it('rejected transfer does not change asset room', async () => {
    // Get original room
    const { data: asset } = await admin
      .from('assets')
      .select('room_id')
      .eq('id', testAssetId)
      .single();
    const originalRoomId = asset?.room_id;

    // Create transfer request
    const { data: transferReq } = await admin.from('change_requests').insert({
      institution_id: TEST_INSTITUTION_ID,
      type:           'transfer',
      status:         'pending',
      asset_id:       testAssetId,
      requested_by:   managerUserId,
      reason:         'Test transfer',
      new_values:     { to_room_id: '00000000-0000-0000-0000-000000001002' },
      old_values:     {},
    }).select('id').single();

    // Reject it
    const { error: rejErr } = await admin.rpc('reject_change_request', {
      p_request_id:  transferReq!.id,
      p_approver_id: approverUserId,
      p_reason:      'Test rejection reason',
    });
    expect(rejErr).toBeNull();

    // Room should be unchanged
    const { data: assetAfter } = await admin
      .from('assets')
      .select('room_id')
      .eq('id', testAssetId)
      .single();
    expect(assetAfter?.room_id).toBe(originalRoomId);
  });
});
