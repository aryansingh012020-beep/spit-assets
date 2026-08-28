import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminUserManager } from '@/components/admin-user-manager';

export const dynamic = 'force-dynamic';

export default async function UsersAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'approver') redirect('/dashboard');

  // Fetch all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select(`
      id, full_name, role, employee_id, department, designation, phone_number, created_at,
      institution:institutions(name, code)
    `)
    .order('created_at', { ascending: false });

  // Fetch all onboarding account requests
  const { data: accountRequests } = await supabase
    .from('account_requests')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <AdminUserManager
        initialProfiles={profiles ?? []}
        initialRequests={accountRequests ?? []}
      />
    </div>
  );
}
