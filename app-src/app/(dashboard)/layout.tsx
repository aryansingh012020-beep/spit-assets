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

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single();

  let pendingCount = 0;
  if (profile?.role === 'approver') {
    const { count } = await supabase
      .from('change_requests').select('*', { count: 'exact', head: true })
      .eq('status', 'pending').neq('requested_by', user.id);
    pendingCount = count ?? 0;
  } else if (profile?.role === 'asset_manager') {
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
