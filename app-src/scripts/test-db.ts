import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('change_requests')
    .select('*, requester:profiles!requested_by(full_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Recent 50 PENDING change requests:');
    console.log(JSON.stringify(data, null, 2));
  }
}

check();
