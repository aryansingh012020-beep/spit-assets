import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime, formatDateTime } from '@/lib/utils';
import { Package, Building2, DoorOpen, CheckSquare, ArrowRightLeft, Activity, Clock } from 'lucide-react';
import { isDemoMode, DEMO_STATS, DEMO_HISTORY, DEMO_PENDING_REQUESTS, DEMO_PROFILE } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

const EVENT_LABELS: Record<string, string> = {
  addition_approved:  'Asset added',
  transfer_approved:  'Transfer approved',
  transfer_rejected:  'Transfer rejected',
  edit_approved:      'Edit approved',
  deletion_approved:  'Retired/disposed',
  photo_uploaded:     'Photo uploaded',
  creation:           'Asset created',
  status_change:      'Status changed',
};

const REQUEST_TYPE_BADGES: Record<string, { variant: 'info' | 'warning' | 'danger' | 'neutral'; label: string }> = {
  addition: { variant: 'info',    label: 'Addition' },
  transfer: { variant: 'warning', label: 'Transfer' },
  edit:     { variant: 'neutral', label: 'Edit'     },
  deletion: { variant: 'danger',  label: 'Deletion' },
};

export default async function DashboardPage() {
  // ── Demo mode ────────────────────────────────────────────────────
  if (isDemoMode()) {
    const cookieStore = await cookies();
    if (cookieStore.get('demo_session')?.value !== 'true') redirect('/login');

    return <DashboardContent
      stats={DEMO_STATS}
      history={DEMO_HISTORY}
      requests={DEMO_PENDING_REQUESTS}
      role="approver"
      userId="demo"
    />;
  }

  // ── Production mode ──────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  const role = profile?.role ?? 'viewer';

  const [
    { count: totalAssets },
    { count: activeAssets },
    { count: totalRooms },
    { count: totalBuildings },
    { data: recentHistory },
    { data: pendingRequests },
  ] = await Promise.all([
    supabase.from('assets').select('*', { count: 'exact', head: true }),
    supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('rooms').select('*', { count: 'exact', head: true }),
    supabase.from('buildings').select('*', { count: 'exact', head: true }),
    supabase.from('asset_history').select(`id,event_type,occurred_at,reason,asset:assets(id,asset_tag,name),performer:profiles!performed_by(full_name)`).order('occurred_at', { ascending: false }).limit(10),
    role === 'approver'
      ? supabase.from('change_requests').select(`id,type,status,created_at,reason,asset:assets(id,asset_tag,name),requester:profiles!requested_by(id,full_name)`).eq('status', 'pending').neq('requested_by', user.id).order('created_at', { ascending: false }).limit(5)
      : supabase.from('change_requests').select(`id,type,status,created_at,reason,asset:assets(id,asset_tag,name)`).eq('requested_by', user.id).order('created_at', { ascending: false }).limit(5),
  ]);

  const pendingCount = role === 'approver'
    ? (await supabase.from('change_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending').neq('requested_by', user.id)).count ?? 0
    : (await supabase.from('change_requests').select('*', { count: 'exact', head: true }).eq('requested_by', user.id).eq('status', 'pending')).count ?? 0;

  const { count: recentTransfers } = await supabase
    .from('asset_movements').select('*', { count: 'exact', head: true })
    .gte('moved_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  return <DashboardContent
    stats={{ totalAssets: totalAssets ?? 0, activeAssets: activeAssets ?? 0, totalRooms: totalRooms ?? 0, totalBuildings: totalBuildings ?? 0, pendingApprovals: pendingCount, recentTransfers: recentTransfers ?? 0 }}
    history={recentHistory ?? []}
    requests={pendingRequests ?? []}
    role={role}
    userId={user.id}
  />;
}

function DashboardContent({ stats, history, requests, role, userId }: {
  stats: typeof DEMO_STATS;
  history: any[];
  requests: any[];
  role: string;
  userId: string;
}) {
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Overview of SPIT asset inventory and recent activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Total Assets"    value={stats.totalAssets.toLocaleString()}    icon={<Package className="h-4 w-4" />} />
        <StatCard title="Active Assets"   value={stats.activeAssets.toLocaleString()}   icon={<Activity className="h-4 w-4" />} trend="up" />
        <StatCard title="Total Rooms"     value={stats.totalRooms.toLocaleString()}     icon={<DoorOpen className="h-4 w-4" />} />
        <StatCard title="Buildings"       value={stats.totalBuildings.toLocaleString()} icon={<Building2 className="h-4 w-4" />} />
        <StatCard title="Pending"         value={stats.pendingApprovals.toLocaleString()} icon={<CheckSquare className="h-4 w-4" />} trend={stats.pendingApprovals > 0 ? 'down' : 'neutral'} />
        <StatCard title="Transfers (30d)" value={stats.recentTransfers.toLocaleString()} icon={<ArrowRightLeft className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Link href="/history" className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">View all →</Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {history.length === 0
              ? <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-8">No activity yet</p>
              : (
                <div className="space-y-3">
                  {history.map((event: any) => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60">
                        <Clock className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-900 dark:text-zinc-100">
                          <span className="font-medium">{EVENT_LABELS[event.event_type] ?? event.event_type}</span>
                          {event.asset && (
                            <> — <Link href={`/inventory/${event.asset.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{event.asset.asset_tag}</Link></>
                          )}
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                          {event.performer?.full_name ?? 'System'} · {formatRelativeTime(event.occurred_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{role === 'approver' ? 'Pending Approvals' : 'My Requests'}</CardTitle>
              <Link href="/approvals" className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">View all →</Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {requests.length === 0
              ? <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-8">No active requests</p>
              : (
                <div className="space-y-3">
                  {requests.map((req: any) => {
                    const typeBadge = REQUEST_TYPE_BADGES[req.type];
                    return (
                      <div key={req.id} className="flex items-start gap-3">
                        <Badge variant={typeBadge.variant} className="mt-0.5 shrink-0">{typeBadge.label}</Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">{req.asset?.name ?? req.reason}</p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                            {req.requester?.full_name ?? 'You'} · {formatRelativeTime(req.created_at)}
                          </p>
                        </div>
                        <Link href={`/approvals`} className="shrink-0 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Review</Link>
                      </div>
                    );
                  })}
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
