import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { DashboardShell } from '@/components/dashboard-shell';
import { DEMO_PROFILE, DEMO_STATS, isDemoMode } from '@/lib/demo-data';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // ── Demo mode ────────────────────────────────────────────────────
  if (isDemoMode()) {
    const cookieStore = await cookies();
    const isLoggedIn = cookieStore.get('demo_session')?.value === 'true';
    if (!isLoggedIn) redirect('/login');

    return (
      <DashboardShell
        profile={DEMO_PROFILE}
        pendingCount={DEMO_STATS.pendingApprovals}
      >
        {children}
      </DashboardShell>
    );
  }

  // ── Production mode ──────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Run profile + pending count in parallel
  const [{ data: profile }, pendingResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    // Fetch pending count for both roles speculatively in one query;
    // we'll filter client-side after we know the role.
    supabase
      .from('change_requests')
      .select('requested_by, status', { count: 'exact', head: false })
      .eq('status', 'pending')
      .limit(1),
  ]);

  const role = profile?.role ?? 'viewer';
  let pendingCount = 0;

  if (role === 'approver') {
    const { count } = await supabase
      .from('change_requests').select('*', { count: 'exact', head: true })
      .eq('status', 'pending').neq('requested_by', user.id);
    pendingCount = count ?? 0;
  } else if (role === 'asset_manager') {
    const { count } = await supabase
      .from('change_requests').select('*', { count: 'exact', head: true })
      .eq('requested_by', user.id).eq('status', 'pending');
    pendingCount = count ?? 0;
  }

  return (
    <DashboardShell profile={profile as Profile | null} pendingCount={pendingCount}>
      {children}
    </DashboardShell>
  );
}
