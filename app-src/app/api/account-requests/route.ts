import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// ── POST: Public Account Request Submission from Landing Page ───────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      full_name,
      email,
      requested_role = 'viewer',
      department,
      designation,
      phone_number,
      employee_id,
      reason,
    } = body;

    if (!full_name || !email || !department) {
      return NextResponse.json(
        { error: 'Missing required fields: Full Name, Institutional Email, and Department.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get default institution ID
    const { data: inst } = await supabaseAdmin
      .from('institutions')
      .select('id')
      .limit(1)
      .single();

    // Check if email already exists in profiles
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .ilike('email', email.trim())
      .single();

    // Also check pending requests
    const { data: existingReq } = await supabaseAdmin
      .from('account_requests')
      .select('id, status')
      .eq('email', email.trim().toLowerCase())
      .eq('status', 'pending')
      .single();

    if (existingReq) {
      return NextResponse.json(
        { error: 'An account request for this email address is already pending review by SPIT Approvers.' },
        { status: 400 }
      );
    }

    const { data: requestRecord, error: insertError } = await supabaseAdmin
      .from('account_requests')
      .insert({
        institution_id: inst?.id || '00000000-0000-0000-0000-000000000001',
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        requested_role,
        department: department.trim(),
        designation: designation?.trim() || null,
        phone_number: phone_number?.trim() || null,
        employee_id: employee_id?.trim() || null,
        reason: reason?.trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: requestRecord,
      message: 'Account request submitted successfully. SPIT Approvers will review and authorize your account.',
    });
  } catch (err: any) {
    console.error('Account request error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// ── GET: List Account Requests (Approver Only) ──────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'approver') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: requests, error } = await supabaseAdmin
      .from('account_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: requests });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: Approve or Reject Account Request (Approver Only) ────────────
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user: reviewer },
    } = await supabase.auth.getUser();

    if (!reviewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: reviewerProfile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', reviewer.id)
      .single();

    if (reviewerProfile?.role !== 'approver') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { request_id, action, custom_password, assigned_role } = body;

    if (!request_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid payload: request_id and valid action (approve/reject) required.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch request
    const { data: accountReq, error: fetchErr } = await supabaseAdmin
      .from('account_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (fetchErr || !accountReq) {
      return NextResponse.json({ error: 'Account request not found' }, { status: 404 });
    }

    if (accountReq.status !== 'pending') {
      return NextResponse.json(
        { error: `This request has already been ${accountReq.status}.` },
        { status: 400 }
      );
    }

    if (action === 'reject') {
      await supabaseAdmin
        .from('account_requests')
        .update({
          status: 'rejected',
          reviewed_by: reviewer.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', request_id);

      return NextResponse.json({
        success: true,
        message: `Account request for ${accountReq.full_name} was rejected.`,
      });
    }

    // Action === 'approve': Provision Supabase Auth User & Profile
    const finalRole = assigned_role || accountReq.requested_role || 'viewer';
    const tempPassword = custom_password || 'Spit@2026';

    // 1. Create Auth User
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: accountReq.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: accountReq.full_name,
        role: finalRole,
        department: accountReq.department,
        designation: accountReq.designation,
      },
    });

    let userId = authUser?.user?.id;

    // If user already exists in Auth, retrieve ID
    if (authError) {
      if (authError.message.includes('already been registered')) {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const existing = userList?.users?.find(
          (u) => u.email?.toLowerCase() === accountReq.email.toLowerCase()
        );
        if (existing) {
          userId = existing.id;
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: tempPassword,
            user_metadata: {
              full_name: accountReq.full_name,
              role: finalRole,
              department: accountReq.department,
            },
          });
        } else {
          return NextResponse.json({ error: authError.message }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    }

    // 2. Provision / Upsert Profile
    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      institution_id: accountReq.institution_id || '00000000-0000-0000-0000-000000000001',
      full_name: accountReq.full_name,
      role: finalRole,
      department: accountReq.department,
      designation: accountReq.designation,
      phone_number: accountReq.phone_number,
      employee_id: accountReq.employee_id,
      status: 'active',
    });

    // 3. Mark request as approved
    await supabaseAdmin
      .from('account_requests')
      .update({
        status: 'approved',
        reviewed_by: reviewer.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', request_id);

    return NextResponse.json({
      success: true,
      tempPassword,
      message: `Account approved and provisioned for ${accountReq.full_name} (${accountReq.email}) with temporary password: ${tempPassword}`,
    });
  } catch (err: any) {
    console.error('Account approval error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
