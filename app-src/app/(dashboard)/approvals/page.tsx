import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, EmptyState } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import { CheckSquare, Clock } from 'lucide-react';
import { ApprovalActions } from './approval-actions';
import { isDemoMode, DEMO_PENDING_REQUESTS } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

const TYPE_BADGES: Record<string, { variant: 'info' | 'warning' | 'danger' | 'neutral'; label: string }> = {
  addition: { variant: 'info',    label: 'Addition' },
  transfer: { variant: 'warning', label: 'Transfer' },
  edit:     { variant: 'neutral', label: 'Edit'     },
  deletion: { variant: 'danger',  label: 'Deletion' },
};

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const params = await searchParams;

  // ── Demo mode ────────────────────────────────────────────────────
  if (isDemoMode()) {
    const cookieStore = await cookies();
    if (cookieStore.get('demo_session')?.value !== 'true') redirect('/login');

    const requests = params.type
      ? DEMO_PENDING_REQUESTS.filter(r => r.type === params.type)
      : DEMO_PENDING_REQUESTS;

    return <ApprovalsContent requests={requests} role="approver" userId="demo" params={params} />;
  }

  // ── Production mode ──────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const role = profile?.role ?? 'viewer';
  if (role === 'viewer') redirect('/dashboard');

  let query = supabase.from('change_requests')
    .select(`id,type,status,reason,created_at,rejection_reason,new_values,old_values,asset:assets(id,asset_tag,name,status),requester:profiles!requested_by(id,full_name),reviewer:profiles!reviewed_by(full_name),reviewed_at`)
    .order('created_at', { ascending: false });
  if (role === 'approver') query = query.eq('status', 'pending').neq('requested_by', user.id);
  else query = query.eq('requested_by', user.id);
  if (params.type) query = query.eq('type', params.type);
  const { data: requests } = await query.limit(50);

  return <ApprovalsContent requests={requests ?? []} role={role} userId={user.id} params={params} />;
}

function ApprovalsContent({ requests, role, userId, params }: { requests: any[]; role: string; userId: string; params: { type?: string } }) {
  const tabs = [
    { id: '',         label: 'All'       },
    { id: 'addition', label: 'Additions' },
    { id: 'transfer', label: 'Transfers' },
    { id: 'edit',     label: 'Edits'     },
    { id: 'deletion', label: 'Deletions' },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{role === 'approver' ? 'Approval Center' : 'My Requests'}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          {role === 'approver' ? 'Review and act on pending change requests' : 'Track status of your submitted requests'}
        </p>
      </div>

      {/* Type tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="-mb-px flex gap-4 overflow-x-auto">
          {tabs.map(t => (
            <Link key={t.id} href={`/approvals${t.id ? `?type=${t.id}` : ''}`}
              className={`shrink-0 pb-2.5 text-sm font-medium border-b-2 transition-colors ${(params.type ?? '') === t.id ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}>
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {requests.length === 0
        ? <EmptyState icon={<CheckSquare className="h-8 w-8" />} title="No requests found" description="No change requests match your filters" />
        : (
          <div className="space-y-3">
            {requests.map((req: any) => {
              const typeBadge = TYPE_BADGES[req.type];
              const canApprove = role === 'approver' && req.status === 'pending' && req.requester?.id !== userId;
              return (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                          <Badge variant="warning" dot>Pending</Badge>
                          {req.asset && (
                            <Link href={`/inventory/${req.asset.id}`} className="font-mono text-xs text-indigo-600 dark:text-indigo-400 hover:underline">{req.asset.asset_tag}</Link>
                          )}
                        </div>
                        {req.asset && <p className="text-sm font-semibold text-zinc-900 dark:text-white">{req.asset.name}</p>}
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">{req.reason}</p>
                        {req.type === 'edit' && req.old_values && req.new_values && (
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                            <span className="rounded bg-red-50 dark:bg-red-950/50 px-2 py-1 text-red-700 dark:text-red-400 font-mono">Before: {JSON.stringify(req.old_values).slice(0, 80)}</span>
                            <span className="rounded bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 text-emerald-700 dark:text-emerald-400 font-mono">After: {JSON.stringify(req.new_values).slice(0, 80)}</span>
                          </div>
                        )}
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {req.requester?.full_name ?? 'Unknown'} · {formatDateTime(req.created_at)}
                        </p>
                      </div>
                      {canApprove && <ApprovalActions requestId={req.id} />}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}
