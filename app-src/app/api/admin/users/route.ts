import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify caller session and role
    const supabase = await createServerClient();
    const {
      data: { user: caller },
    } = await supabase.auth.getUser();

    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role, institution_id')
      .eq('id', caller.id)
      .single();

    if (callerProfile?.role !== 'approver') {
      return NextResponse.json(
        { error: 'Forbidden: Only Approvers can create user accounts.' },
        { status: 403 }
      );
    }

    // 2. Parse payload
    const body = await req.json();
    const {
      full_name,
      email,
      password,
      role = 'viewer',
      department,
      designation,
      phone_number,
      employee_id,
    } = body;

    if (!full_name || !email || !password || !department) {
      return NextResponse.json(
        { error: 'Missing required fields: Full Name, Email, Password, Department.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // 3. Admin client for user provisioning
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        department,
        designation,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Provision profile
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        institution_id: callerProfile?.institution_id || '00000000-0000-0000-0000-000000000001',
        full_name: full_name.trim(),
        role,
        department: department.trim(),
        designation: designation?.trim() || null,
        phone_number: phone_number?.trim() || null,
        employee_id: employee_id?.trim() || null,
        status: 'active',
      })
      .select()
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile: newProfile,
      message: `User ${full_name} (${email}) created successfully.`,
    });
  } catch (err: any) {
    console.error('Error creating user:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
