import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Try to insert a mock edit photo request
  const { data: asset } = await supabase.from('assets').select('id, institution_id').limit(1).single();
  const { data: profile } = await supabase.from('profiles').select('id').limit(1).single();

  if (!asset || !profile) {
    console.log('No asset or profile found to test with.');
    return;
  }

  const { data, error } = await supabase.from('change_requests').insert({
    institution_id: asset.institution_id,
    type: 'edit',
    status: 'pending',
    asset_id: asset.id,
    requested_by: profile.id,
    reason: 'Test photo',
    photo_path: 'test/path.jpg',
    new_values: { is_photo_approval: true },
    old_values: {}
  }).select();

  if (error) {
    console.error('INSERT ERROR:', error);
  } else {
    console.log('INSERT SUCCESS:', data);
    // Cleanup
    await supabase.from('change_requests').delete().eq('id', data[0].id);
  }
}

check();
