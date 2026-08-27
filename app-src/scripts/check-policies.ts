import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Check pg_policies
  const { data: policies, error: polErr } = await admin.rpc('get_policies_debug');
  if (polErr) {
    console.log('rpc error, querying via normal SQL if possible:', polErr.message);
  }

  // Let's check what auth.role() returns or fix RLS policies for assets
  console.log('Testing policy behavior...');
}

main().catch(console.error);
