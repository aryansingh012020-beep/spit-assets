import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent, EmptyState } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, getAssetPhotoUrl } from '@/lib/utils';
import { CheckSquare, Clock, Camera, ExternalLink, PackagePlus, MapPin, Tag, Layers, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { ApprovalActions } from './approval-actions';
import { ImageViewerDialog } from '@/components/image-viewer-dialog';
import { isDemoMode, DEMO_PENDING_REQUESTS } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

const TYPE_BADGES: Record<string, { variant: 'info' | 'warning' | 'danger' | 'neutral'; label: string }> = {
  addition: { variant: 'info',    label: 'Addition' },
  transfer: { variant: 'warning', label: 'Transfer' },
  edit:     { variant: 'neutral', label: 'Edit'     },
  deletion: { variant: 'danger',  label: 'Deletion' },
};

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; scope?: string }>;
}) {
  const params = await searchParams;

  // ── Demo mode ────────────────────────────────────────────────────
  if (isDemoMode()) {
    const cookieStore = await cookies();
    if (cookieStore.get('demo_session')?.value !== 'true') redirect('/login');

    let requests = DEMO_PENDING_REQUESTS;
    if (params.type === 'photo') {
      requests = requests.filter(r => (r as any).new_values?.is_photo_approval);
    } else if (params.type === 'edit') {
      requests = requests.filter(r => r.type === 'edit' && !(r as any).new_values?.is_photo_approval);
    } else if (params.type) {
      requests = requests.filter(r => r.type === params.type);
    }

    return (
      <ApprovalsContent
        requests={requests}
        role="approver"
        userId="demo"
        params={params}
        counts={{ pending: requests.length, myRequests: 0, resolved: 0 }}
        currentScope="pending"
      />
    );
  }

  // ── Production mode ──────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, institution_id').eq('id', user.id).single();
  const role = profile?.role ?? 'viewer';
  if (role === 'viewer') redirect('/dashboard');

  const currentScope = params.scope || (role === 'approver' ? 'pending' : 'my_requests');

  // Fetch count badges reliably via admin client
  const [
    { count: pendingCount },
    { count: myRequestsCount },
    { count: resolvedCount },
  ] = await Promise.all([
    admin.from('change_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('change_requests').select('*', { count: 'exact', head: true }).eq('requested_by', user.id),
    admin.from('change_requests').select('*', { count: 'exact', head: true }).in('status', ['approved', 'rejected']),
  ]);

  let query = admin.from('change_requests')
    .select(`id,type,status,reason,created_at,rejection_reason,photo_path,new_values,old_values,asset:assets(id,asset_tag,name,status),requester:profiles!requested_by(id,full_name),reviewer:profiles!reviewed_by(full_name),reviewed_at`)
    .order('created_at', { ascending: false });

  if (role === 'approver') {
    if (currentScope === 'my_requests') {
      query = query.eq('requested_by', user.id);
    } else if (currentScope === 'history') {
      query = query.in('status', ['approved', 'rejected']);
    } else {
      // Default: all pending requests in the institution
      query = query.eq('status', 'pending');
    }
  } else {
    // Asset manager: only ever views own requests
    query = query.eq('requested_by', user.id);
  }

  if (params.type && params.type !== 'photo') {
    query = query.eq('type', params.type);
  }

  const { data: rawRequests } = await query.limit(100);
  let requests = rawRequests ?? [];

  if (params.type === 'photo') {
    requests = requests.filter((r: any) =>
      Boolean(r.new_values?.is_photo_approval || r.photo_path || r.new_values?.photo_path || r.new_values?.photo_url)
    );
  } else if (params.type === 'edit') {
    requests = requests.filter((r: any) => !r.new_values?.is_photo_approval);
  }

  return (
    <ApprovalsContent
      requests={requests}
      role={role}
      userId={user.id}
      params={params}
      counts={{
        pending: pendingCount ?? 0,
        myRequests: myRequestsCount ?? 0,
        resolved: resolvedCount ?? 0,
      }}
      currentScope={currentScope}
    />
  );
}

function ApprovalsContent({
  requests,
  role,
  userId,
  params,
  counts,
  currentScope,
}: {
  requests: any[];
  role: string;
  userId: string;
  params: { type?: string; scope?: string };
  counts: { pending: number; myRequests: number; resolved: number };
  currentScope: string;
}) {
  const tabs = [
    { id: '',         label: 'All'       },
    { id: 'photo',    label: 'Photos 📷' },
    { id: 'addition', label: 'Additions' },
    { id: 'transfer', label: 'Transfers' },
    { id: 'edit',     label: 'Edits'     },
    { id: 'deletion', label: 'Deletions' },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
          {role === 'approver' ? 'Approval Center' : 'My Requests'}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          {role === 'approver'
            ? 'Review and act on pending change requests, or track your own submissions.'
            : 'Track status of your submitted addition, transfer, and edit requests.'}
        </p>
      </div>

      {/* Scope switcher for Approvers */}
      {role === 'approver' && (
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 w-fit">
          <Link
            href={`/approvals?scope=pending${params.type ? `&type=${params.type}` : ''}`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentScope === 'pending'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <span>Pending Review</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              currentScope === 'pending'
                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
            }`}>
              {counts.pending}
            </span>
          </Link>

          <Link
            href={`/approvals?scope=my_requests${params.type ? `&type=${params.type}` : ''}`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentScope === 'my_requests'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <span>My Requests</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              currentScope === 'my_requests'
                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
            }`}>
              {counts.myRequests}
            </span>
          </Link>

          <Link
            href={`/approvals?scope=history${params.type ? `&type=${params.type}` : ''}`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentScope === 'history'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <span>Resolved History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
              {counts.resolved}
            </span>
          </Link>
        </div>
      )}

      {/* Type filter tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="-mb-px flex gap-4 overflow-x-auto">
          {tabs.map(t => (
            <Link
              key={t.id}
              href={`/approvals?scope=${currentScope}${t.id ? `&type=${t.id}` : ''}`}
              className={`shrink-0 pb-2.5 text-sm font-medium border-b-2 transition-colors ${
                (params.type ?? '') === t.id
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {requests.length === 0
        ? <EmptyState icon={<CheckSquare className="h-8 w-8" />} title="No requests found" description="No change requests match this filter" />
        : (
          <div className="space-y-3">
            {requests.map((req: any) => {
              const isAdditionRequest = req.type === 'addition';
              const isPhotoVerification = req.type === 'edit' && Boolean(req.new_values?.is_photo_approval || req.photo_path);
              const hasPhoto = Boolean(req.photo_path || req.new_values?.storage_path || req.new_values?.photo_url || req.new_values?.photo_path);
              const photoUrl = hasPhoto
                ? (req.new_values?.photo_url || getAssetPhotoUrl({ storage_path: req.new_values?.storage_path || req.photo_path || req.new_values?.photo_path }))
                : null;

              const isMyRequest = req.requester?.id === userId;
              // Approvers can approve pending requests; photo verifications can also be approved by the capturer
              const canApprove = role === 'approver' && req.status === 'pending' && (!isMyRequest || isPhotoVerification);

              const typeBadge = isPhotoVerification
                ? { variant: 'info' as const, label: 'Photo Verification' }
                : (TYPE_BADGES[req.type] || { variant: 'neutral' as const, label: req.type });

              const nv = req.new_values || {};

              return (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {isPhotoVerification ? (
                            <Badge variant="info" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                              <Camera className="h-3 w-3" />
                              Photo Verification
                            </Badge>
                          ) : isAdditionRequest && hasPhoto ? (
                            <div className="flex items-center gap-1">
                              <Badge variant="info">Addition</Badge>
                              <Badge variant="neutral" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 flex items-center gap-1 text-[10px]">
                                <Camera className="h-2.5 w-2.5" />
                                Photo Attached
                              </Badge>
                            </div>
                          ) : (
                            <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                          )}

                          {/* Status Badge */}
                          {req.status === 'pending' && <Badge variant="warning" dot>Pending</Badge>}
                          {req.status === 'approved' && <Badge variant="success">Approved</Badge>}
                          {req.status === 'rejected' && <Badge variant="danger">Rejected</Badge>}

                          {/* Submitted by current user badge */}
                          {isMyRequest && (
                            <Badge variant="neutral" className="text-[10px] bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                              Submitted by You
                            </Badge>
                          )}

                          {req.asset && (
                            <Link href={`/inventory/${req.asset.id}`} className="font-mono text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                              {req.asset.asset_tag}
                            </Link>
                          )}
                        </div>

                        {/* Existing asset name */}
                        {req.asset && <p className="text-sm font-semibold text-zinc-900 dark:text-white">{req.asset.name}</p>}

                        {/* Reason */}
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">{req.reason}</p>

                        {/* ── Addition Preview Card ── */}
                        {isAdditionRequest && (
                          <div className="mt-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/20 p-3.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-2.5 flex items-center gap-1.5">
                              <PackagePlus className="h-3 w-3" />
                              New Asset Details
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                              {/* Name */}
                              {nv.name && (
                                <div className="col-span-2 sm:col-span-3">
                                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Asset Name</p>
                                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">{nv.name}</p>
                                </div>
                              )}
                              {/* Asset Tag */}
                              <div>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide flex items-center gap-1"><Tag className="h-2.5 w-2.5" />Asset Tag</p>
                                <p className="text-xs font-mono text-zinc-900 dark:text-white">
                                  {nv.asset_tag || <span className="text-zinc-400 italic">— (auto-generate)</span>}
                                </p>
                              </div>
                              {/* Status */}
                              <div>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Status</p>
                                <p className="text-xs font-medium capitalize text-zinc-900 dark:text-white">
                                  {(nv.status || 'active').replace(/_/g, ' ')}
                                </p>
                              </div>
                              {/* Year */}
                              {nv.acquisition_year && (
                                <div>
                                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Acq. Year</p>
                                  <p className="text-xs text-zinc-900 dark:text-white">{nv.acquisition_year}</p>
                                </div>
                              )}
                              {/* Description */}
                              {nv.description && (
                                <div className="col-span-2 sm:col-span-3">
                                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Description</p>
                                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{nv.description}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Photo preview card */}
                        {hasPhoto && photoUrl && (
                          <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
                            <ImageViewerDialog
                              url={photoUrl}
                              alt={isPhotoVerification ? "Asset verification photo" : "New asset condition photo"}
                              className="relative h-24 w-36 shrink-0 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-900 group"
                            >
                              <img
                                src={photoUrl}
                                alt={isPhotoVerification ? "Asset verification photo" : "New asset condition photo"}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white flex items-center gap-1 font-mono">
                                <ExternalLink className="h-2.5 w-2.5" /> Full Size
                              </span>
                            </ImageViewerDialog>
                            <div className="text-xs space-y-1 min-w-0">
                              <p className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                                <Camera className="h-3.5 w-3.5 text-indigo-500" />
                                {isPhotoVerification ? 'Captured Verification Photo' : 'Initial Asset Condition Photo'}
                              </p>
                              <p className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px] truncate">
                                File: {req.new_values?.file_name || 'equipment.jpg'} {req.new_values?.file_size ? `(${(req.new_values.file_size / 1024 / 1024).toFixed(2)} MB)` : ''}
                              </p>
                              <p className="text-zinc-600 dark:text-zinc-300 text-[11px] leading-relaxed">
                                {isPhotoVerification
                                  ? `Approving promotes this image to the official register and sets it as the primary equipment image for ${req.asset?.asset_tag || 'the asset'}.`
                                  : `Approving commits this asset to inventory and links this image as its official primary photo.`}
                              </p>
                            </div>
                          </div>
                        )}

                        {!isPhotoVerification && !isAdditionRequest && req.type === 'edit' && req.old_values && req.new_values && (
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

                      {/* Right actions / status feedback */}
                      <div className="shrink-0 flex items-center gap-2">
                        {canApprove && <ApprovalActions requestId={req.id} />}
                        {isMyRequest && req.status === 'pending' && (
                          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                            Awaiting Peer Review
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <div className="text-right">
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                            </span>
                            {req.reviewer?.full_name && (
                              <p className="text-[10px] text-zinc-400 mt-0.5">by {req.reviewer.full_name}</p>
                            )}
                          </div>
                        )}
                        {req.status === 'rejected' && (
                          <div className="text-right max-w-xs">
                            <span className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1 justify-end">
                              <XCircle className="h-3.5 w-3.5" /> Rejected
                            </span>
                            {req.rejection_reason && (
                              <p className="text-[10px] text-zinc-500 italic mt-0.5">"{req.rejection_reason}"</p>
                            )}
                          </div>
                        )}
                      </div>
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
