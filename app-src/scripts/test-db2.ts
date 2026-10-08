import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('change_requests')
    .select('id, type, status, created_at, photo_path, new_values, old_values, requested_by')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Recent 20 ALL requests:');
    console.log(JSON.stringify(data, null, 2));
  }
}

check();
