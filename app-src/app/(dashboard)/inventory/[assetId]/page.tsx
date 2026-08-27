import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { buildLocationString, formatDateTime, formatRelativeTime } from '@/lib/utils';
import {
  Package, MapPin, Tag, Calendar, ArrowLeft, Clock, History,
  Camera, Building2, Layers, DoorOpen, FileText, Hash, Info
} from 'lucide-react';
import { isDemoMode, DEMO_ASSETS, DEMO_HISTORY, DEMO_ROOMS, DEMO_CATEGORIES } from '@/lib/demo-data';
import { AssetActions } from './asset-actions';
import { PhotoUpload } from './photo-upload';
import { AssetComments } from './asset-comments';

export const dynamic = 'force-dynamic';

const EVENT_LABELS: Record<string, string> = {
  addition_approved: '🟢 Added to inventory',
  transfer_approved: '🔄 Transfer approved',
  transfer_rejected: '🔴 Transfer rejected',
  edit_approved:     '✏️ Edit approved',
  deletion_approved: '🗑️ Retired / Disposed',
  photo_uploaded:    '📷 Photo uploaded',
  status_change:     '🔔 Status changed',
  creation:          '✨ Created',
};

// ── UUID validation ─────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;

  // Reject obviously invalid IDs early (e.g. "categories" from a mis-routed URL)
  if (!UUID_RE.test(assetId)) {
    notFound();
  }

  // ── Demo mode ───────────────────────────────────────────────────
  if (isDemoMode()) {
    const cookieStore = await cookies();
    if (cookieStore.get('demo_session')?.value !== 'true') redirect('/login');

    const asset = DEMO_ASSETS.find((a) => a.id === assetId);
    if (!asset) notFound();

    const history = DEMO_HISTORY.filter((h) => h.asset?.id === assetId);

    return (
      <AssetDetail
        asset={asset}
        history={history}
        comments={[]}
        userId="demo"
        role="approver"
        rooms={DEMO_ROOMS}
        categories={DEMO_CATEGORIES}
      />
    );
  }

  // ── Production mode ─────────────────────────────────────────────
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

  // Fetch asset with all related data safely using maybeSingle
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select(
      `*,
       category:asset_categories(id, name, code),
       room:rooms(id, name, room_number),
       floor:floors(id, name),
       building:buildings(id, name),
       photos:asset_photos(id, url, is_primary, uploaded_at)`
    )
    .eq('id', assetId)
    .maybeSingle();

  if (!asset) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Inventory
        </Link>

        <Card className="border-dashed border-zinc-300 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm">
          <CardContent className="p-8 text-center space-y-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
              <Package className="h-7 w-7" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                No Current Details Available
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                The requested asset record does not exist in the active catalog, may have been retired/re-tagged, or is temporarily unavailable.
              </p>
            </div>

            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/80 p-3 max-w-sm mx-auto border border-zinc-200 dark:border-zinc-700 text-left">
              <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Target Identifier:</span> {assetId}
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/inventory"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
              >
                Browse All Inventory
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                Dashboard Overview
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch history, comments, rooms and categories in parallel
  const [{ data: history }, { data: comments }, { data: rooms }, { data: categories }] =
    await Promise.all([
      supabase
        .from('asset_history')
        .select(
          `id, event_type, occurred_at, reason,
           performer:profiles!performed_by(full_name),
           approver:profiles!approved_by(full_name)`
        )
        .eq('asset_id', assetId)
        .order('occurred_at', { ascending: false })
        .limit(30),
      supabase
        .from('asset_comments')
        .select(
          `id, content, is_admin_only, created_at,
           author:profiles!author_id(id, full_name, role)`
        )
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false }),
      supabase.from('rooms').select('id, name, room_number').order('name'),
      supabase.from('asset_categories').select('id, name').order('name'),
    ]);

  return (
    <AssetDetail
      asset={asset}
      history={history ?? []}
      comments={comments ?? []}
      userId={user.id}
      role={profile?.role ?? 'viewer'}
      rooms={rooms ?? []}
      categories={categories ?? []}
    />
  );
}

// ── AssetDetail Component ─────────────────────────────────────────
function AssetDetail({
  asset,
  history,
  comments,
  userId,
  role,
  rooms,
  categories,
}: {
  asset: any;
  history: any[];
  comments: any[];
  userId: string;
  role: string;
  rooms: { id: string; name: string; room_number: string | null }[];
  categories: { id: string; name: string }[];
}) {
  const location = buildLocationString([
    asset.building?.name,
    asset.floor?.name,
    asset.room?.name,
  ]);
  const canManage = ['asset_manager', 'approver'].includes(role);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Navigation & Actions ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Inventory
        </Link>

        <AssetActions
          assetId={asset.id}
          assetName={asset.name}
          assetTag={asset.asset_tag}
          currentRoomId={asset.room?.id}
          currentName={asset.name}
          currentDescription={asset.description}
          currentYear={asset.acquisition_year}
          currentCategoryId={asset.category?.id}
          rooms={rooms}
          categories={categories}
          canManage={canManage}
        />
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{asset.name}</h1>
          <p className="mt-1 font-mono text-sm text-zinc-500 dark:text-zinc-400">
            {asset.asset_tag}
          </p>
        </div>
        <StatusBadge status={asset.status} className="text-sm" />
      </div>

      {/* ── Main Grid: Details + Governance ─────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Asset Details Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Asset Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailRow
                icon={<Hash className="h-4 w-4" />}
                label="Asset Tag"
                value={
                  <span className="font-mono text-sm">{asset.asset_tag}</span>
                }
              />
              <DetailRow
                icon={<Tag className="h-4 w-4" />}
                label="Category"
                value={
                  asset.category ? (
                    <Badge variant="default">{asset.category.name}</Badge>
                  ) : (
                    '—'
                  )
                }
              />
              <DetailRow
                icon={<Building2 className="h-4 w-4" />}
                label="Building"
                value={asset.building?.name ?? '—'}
              />
              <DetailRow
                icon={<Layers className="h-4 w-4" />}
                label="Floor"
                value={asset.floor?.name ?? '—'}
              />
              <DetailRow
                icon={<DoorOpen className="h-4 w-4" />}
                label="Room"
                value={
                  asset.room
                    ? `${asset.room.name}${asset.room.room_number ? ` (${asset.room.room_number})` : ''}`
                    : '—'
                }
              />
              <DetailRow
                icon={<MapPin className="h-4 w-4" />}
                label="Full Location"
                value={location || '—'}
              />
              <DetailRow
                icon={<Calendar className="h-4 w-4" />}
                label="Acquisition Year"
                value={asset.acquisition_year ?? '—'}
              />
              <DetailRow
                icon={<Info className="h-4 w-4" />}
                label="Current Status"
                value={<StatusBadge status={asset.status} />}
              />
            </dl>

            {/* Description / Specs */}
            {asset.description && (
              <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800">
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                  <FileText className="h-3.5 w-3.5" />
                  Description / Specifications
                </dt>
                <dd className="text-sm text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 whitespace-pre-wrap">
                  {asset.description}
                </dd>
              </div>
            )}

            {/* Original import tag */}
            {asset.original_tag &&
              asset.original_tag !== asset.asset_tag && (
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <dt className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                    Original Register Tag (Excel Import)
                  </dt>
                  <dd className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {asset.original_tag}
                  </dd>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Governance Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Governance Info</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Added to Register</p>
              <p className="text-sm text-zinc-900 dark:text-white">
                {formatDateTime(asset.created_at)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Last Modified</p>
              <p className="text-sm text-zinc-900 dark:text-white">
                {formatRelativeTime(asset.updated_at)}
              </p>
            </div>
            {asset.source_sheet && (
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">
                  Migration Source
                </p>
                <p className="font-mono text-xs text-zinc-900 dark:text-zinc-200">
                  {asset.source_sheet} · Row {asset.source_row}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Photos Section ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <CardTitle>Visual Records & Photos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <PhotoUpload
            assetId={asset.id}
            initialPhotos={asset.photos ?? []}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      {/* ── Comments & Discussion ───────────────────────────────── */}
      <AssetComments
        assetId={asset.id}
        initialComments={comments ?? []}
        currentUserId={userId}
        currentUserRole={role}
      />

      {/* ── History Timeline ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            <CardTitle>Audit & Change History</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {history.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-6 w-6" />}
              title="No history recorded"
              description="All future transfers, edits and status changes will appear here"
            />
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {history.map((event: any) => (
                <div
                  key={event.id}
                  className="flex gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex h-6 w-6 shrink-0 mt-0.5 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <Clock className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {EVENT_LABELS[event.event_type] ?? event.event_type}
                    </p>
                    {event.reason && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {event.reason}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                      {event.performer?.full_name ?? 'System'}
                      {event.approver?.full_name &&
                        ` · Approved by ${event.approver.full_name}`}
                      {' · '}
                      {formatRelativeTime(event.occurred_at)}
                    </p>
                  </div>
                  <time
                    className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5"
                    title={formatDateTime(event.occurred_at)}
                  >
                    {formatRelativeTime(event.occurred_at)}
                  </time>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Helper: Detail Row ────────────────────────────────────────────
function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
        {icon}
        <span>{label}</span>
      </dt>
      <dd className="text-sm text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}
