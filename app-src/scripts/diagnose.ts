import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { count: totalAssets, error: countErr } = await admin
    .from('assets')
    .select('*', { count: 'exact', head: true });
  console.log('Total assets in DB (admin):', totalAssets, 'Error:', countErr);

  const { data: sampleAssets } = await admin
    .from('assets')
    .select('id, asset_tag, name, institution_id, room_id')
    .limit(5);
  console.log('Sample assets:', sampleAssets);

  const { data: profiles } = await admin.from('profiles').select('*');
  console.log('Profiles in DB:', profiles);

  const { data: institutions } = await admin.from('institutions').select('*');
  console.log('Institutions in DB:', institutions);

  // Sign in as admin@spit.ac.in
  const anon = createClient(url, anonKey);
  const { data: loginData, error: loginErr } = await anon.auth.signInWithPassword({
    email: 'admin@spit.ac.in',
    password: 'Password@123',
  });
  console.log('Login attempt:', loginData?.user?.id, 'Login Error:', loginErr);

  if (loginData?.session) {
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: 'Bearer ' + loginData.session.access_token } },
    });

    const { count: userAssetCount, error: userAssetErr } = await userClient
      .from('assets')
      .select('*', { count: 'exact', head: true });
    console.log('Assets count visible to user under RLS:', userAssetCount, 'Error:', userAssetErr);

    const { data: userAssets, error: listErr } = await userClient
      .from('assets')
      .select(`
        id, asset_tag, name,
        category:asset_categories(id, name, code),
        room:rooms(id, name, room_number),
        floor:floors(id, name),
        building:buildings(id, name)
      `)
      .limit(5);
    console.log('User assets fetch query result count:', userAssets?.length, 'Query Error:', listErr);
  }
}

main().catch(console.error);
