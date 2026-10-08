import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = 'manager@spit.ac.in';
  const password = 'Password@123';

  console.log(`Connecting to ${url}...`);

  const { data: usersData, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    console.error('List users error:', listError);
    return;
  }

  let uid = '';
  const existing = usersData.users.find((u) => u.email === email);
  if (existing) {
    console.log(`User ${email} already exists:`, existing.id);
    uid = existing.id;
    await admin.auth.admin.updateUserById(uid, { password });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'SPIT Manager' },
    });
    if (error) {
      console.error('Create user error:', error.message);
      return;
    }
    uid = data.user.id;
    console.log('Created user:', uid);
  }

  const { data: inst } = await admin
    .from('institutions')
    .select('id')
    .eq('code', 'SPIT')
    .single();

  const institutionId = inst?.id || '00000000-0000-0000-0000-000000000001';

  const { data: profile, error: pe } = await admin.from('profiles').upsert({
    id: uid,
    role: 'asset_manager',
    institution_id: institutionId,
    full_name: 'SPIT Manager',
    updated_at: new Date().toISOString(),
  }).select('*').single();

  if (pe) {
    console.error('Profile error:', pe);
  } else {
    console.log('Profile successfully configured:', profile);
    console.log('\n=======================================');
    console.log(' LOGIN CREDENTIALS (NO APPROVER):');
    console.log(` Email:    ${email}`);
    console.log(` Password: ${password}`);
    console.log(' Role:     Asset Manager (Requires Approvals)');
    console.log('=======================================\n');
  }
}

main().catch(console.error);
