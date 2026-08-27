import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode, DEMO_PROFILE } from '@/lib/demo-data';
import { fetchUserPersonalHistory } from '@/lib/actions/profile';
import { ProfileClientView } from './profile-client-view';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  // ── Demo mode ────────────────────────────────────────────────────
  if (isDemoMode()) {
    const cookieStore = await cookies();
    if (cookieStore.get('demo_session')?.value !== 'true') redirect('/login');

    const demoProfile = {
      ...DEMO_PROFILE,
      phone_number: '+91 98200 12345',
      designation: 'Professor & Head of Department',
      status: 'active',
      bio: 'Cabin 502, 5th Floor CSE Wing · In-charge for Advanced Computing & Infrastructure',
    };

    const demoHistory = {
      requests: [
        {
          id: 'dr1',
          type: 'transfer',
          status: 'approved',
          reason: 'Relocated 20 Dell OptiPlex workstations from Lab 603 to Lab 604',
          created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
          asset: { id: 'a1', asset_tag: 'COMP-2023-0042', name: 'Dell OptiPlex 7090 MT' },
          reviewer: { full_name: 'Dr. Ramesh K. Verma' },
        },
        {
          id: 'dr2',
          type: 'addition',
          status: 'pending',
          reason: 'New Cisco Catalyst 9200 Core Switch for Server Room',
          created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
          asset: { id: 'a2', asset_tag: 'NET-2024-0019', name: 'Cisco Catalyst 9200' },
        },
      ],
      events: [
        {
          id: 'de1',
          event_type: 'transfer_approved',
          occurred_at: new Date(Date.now() - 3 * 86400000).toISOString(),
          reason: 'Routine annual laboratory hardware migration per committee approval',
          asset: { id: 'a1', asset_tag: 'COMP-2023-0042', name: 'Dell OptiPlex 7090 MT' },
        },
      ],
      comments: [
        {
          id: 'dc1',
          content: 'Asset underwent RAM upgrade to 32GB DDR4 prior to relocation.',
          is_admin_only: false,
          created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
          asset: { id: 'a1', asset_tag: 'COMP-2023-0042', name: 'Dell OptiPlex 7090 MT' },
        },
      ],
      movements: [
        {
          id: 'dm1',
          moved_at: new Date(Date.now() - 3 * 86400000).toISOString(),
          asset: { id: 'a1', asset_tag: 'COMP-2023-0042', name: 'Dell OptiPlex 7090 MT' },
          from_room: { name: 'Lab 603', room_number: '603' },
          to_room: { name: 'Lab 604', room_number: '604' },
        },
      ],
    };

    return (
      <ProfileClientView
        profile={demoProfile as any}
        userEmail="faculty@spit.ac.in"
        history={demoHistory}
      />
    );
  }

  // ── Production mode ──────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  const history = await fetchUserPersonalHistory(user.id);

  return (
    <ProfileClientView
      profile={profile}
      userEmail={user.email ?? 'No email provided'}
      history={history}
    />
  );
}
