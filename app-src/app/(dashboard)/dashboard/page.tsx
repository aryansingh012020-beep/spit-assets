import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime, formatDateTime } from '@/lib/utils';
import {
  Package,
  Building2,
  DoorOpen,
  CheckSquare,
  ArrowRightLeft,
  Activity,
  Clock,
  Layers,
  Sparkles,
  Download,
  Search,
  PlusCircle,
  FileCheck,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Wrench,
  AlertTriangle,
  Archive,
} from 'lucide-react';
import {
  isDemoMode,
  DEMO_STATS,
  DEMO_HISTORY,
  DEMO_PENDING_REQUESTS,
  DEMO_CATEGORIES,
} from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

const EVENT_LABELS: Record<string, string> = {
  addition_approved:  'Asset added',
  transfer_approved:  'Transfer approved',
  transfer_rejected:  'Transfer rejected',
  edit_approved:      'Edit approved',
  deletion_approved:  'Retired / disposed',
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

const CATEGORY_COLORS = [
  'bg-indigo-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-zinc-400',
];

export default async function DashboardPage() {
  // ── Demo mode ────────────────────────────────────────────────────
  if (isDemoMode()) {
    const cookieStore = await cookies();
    if (cookieStore.get('demo_session')?.value !== 'true') redirect('/login');

    const demoCategories = DEMO_CATEGORIES.map((c, i) => ({
      id: c.id,
      name: c.name,
      count: [850, 420, 310, 240, 180, 120, 95][i] || 50,
    }));

    const demoFloors = [
      { id: 'f0', name: 'Ground Floor', level: 0, count: 280 },
      { id: 'f1', name: 'First Floor', level: 1, count: 410 },
      { id: 'f2', name: 'Second Floor', level: 2, count: 390 },
      { id: 'f3', name: 'Third Floor', level: 3, count: 450 },
      { id: 'f4', name: 'Fourth Floor', level: 4, count: 380 },
      { id: 'f5', name: 'Fifth Floor', level: 5, count: 320 },
      { id: 'f6', name: 'Sixth Floor', level: 6, count: 432 },
    ];

    return (
      <DashboardContent
        stats={DEMO_STATS}
        statusCounts={{ active: 2580, maintenance: 45, missing: 12, damaged: 8, retired: 17 }}
        categories={demoCategories}
        floors={demoFloors}
        history={DEMO_HISTORY}
        requests={DEMO_PENDING_REQUESTS}
        role="approver"
        userId="demo"
      />
    );
  }

  // ── Production mode ──────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();
  const role = profile?.role ?? 'viewer';

  const [
    { count: totalAssets },
    { count: activeCount },
    { count: maintenanceCount },
    { count: missingCount },
    { count: damagedCount },
    { count: retiredCount },
    { count: totalRooms },
    { count: totalBuildings },
    { data: recentHistory },
    { data: pendingRequests },
    { data: rawCategories },
    { data: rawFloors },
    pendingCountResult,
    { count: recentTransfers },
  ] = await Promise.all([
    supabase.from('assets').select('*', { count: 'exact', head: true }),
    supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'under_maintenance'),
    supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'missing'),
    supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'damaged'),
    supabase.from('assets').select('*', { count: 'exact', head: true }).in('status', ['retired', 'disposed']),
    supabase.from('rooms').select('*', { count: 'exact', head: true }),
    supabase.from('buildings').select('*', { count: 'exact', head: true }),
    supabase
      .from('asset_history')
      .select(`id, event_type, occurred_at, reason, asset:assets(id, asset_tag, name), performer:profiles!performed_by(full_name)`)
      .order('occurred_at', { ascending: false })
      .limit(8),
    role === 'approver'
      ? supabase
          .from('change_requests')
          .select(`id, type, status, created_at, reason, asset:assets(id, asset_tag, name), requester:profiles!requested_by(id, full_name)`)
          .eq('status', 'pending')
          .neq('requested_by', user.id)
          .order('created_at', { ascending: false })
          .limit(6)
      : supabase
          .from('change_requests')
          .select(`id, type, status, created_at, reason, asset:assets(id, asset_tag, name)`)
          .eq('requested_by', user.id)
          .order('created_at', { ascending: false })
          .limit(6),
    supabase.from('asset_categories').select('id, name, code, assets(count)').order('name'),
    supabase.from('floors').select('id, name, level, assets(count)').order('level'),
    role === 'approver'
      ? supabase
          .from('change_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .neq('requested_by', user.id)
      : supabase
          .from('change_requests')
          .select('*', { count: 'exact', head: true })
          .eq('requested_by', user.id)
          .eq('status', 'pending'),
    supabase
      .from('asset_movements')
      .select('*', { count: 'exact', head: true })
      .gte('moved_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const pendingCount = pendingCountResult?.count ?? 0;

  // Format categories with count
  const formattedCategories = (rawCategories ?? [])
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      count: c.assets?.[0]?.count ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Format floors with count
  const formattedFloors = (rawFloors ?? []).map((f: any) => ({
    id: f.id,
    name: f.name,
    level: f.level,
    count: f.assets?.[0]?.count ?? 0,
  }));

  return (
    <DashboardContent
      stats={{
        totalAssets: totalAssets ?? 0,
        activeAssets: activeCount ?? 0,
        totalRooms: totalRooms ?? 0,
        totalBuildings: totalBuildings ?? 0,
        pendingApprovals: pendingCount,
        recentTransfers: recentTransfers ?? 0,
      }}
      statusCounts={{
        active: activeCount ?? 0,
        maintenance: maintenanceCount ?? 0,
        missing: missingCount ?? 0,
        damaged: damagedCount ?? 0,
        retired: retiredCount ?? 0,
      }}
      categories={formattedCategories}
      floors={formattedFloors}
      history={recentHistory ?? []}
      requests={pendingRequests ?? []}
      role={role}
      userId={user.id}
    />
  );
}

function DashboardContent({
  stats,
  statusCounts,
  categories,
  floors,
  history,
  requests,
  role,
  userId,
}: {
  stats: {
    totalAssets: number;
    activeAssets: number;
    totalRooms: number;
    totalBuildings: number;
    pendingApprovals: number;
    recentTransfers: number;
  };
  statusCounts: {
    active: number;
    maintenance: number;
    missing: number;
    damaged: number;
    retired: number;
  };
  categories: { id: string; name: string; count: number }[];
  floors: { id: string; name: string; level: number; count: number }[];
  history: any[];
  requests: any[];
  role: string;
  userId: string;
}) {
  const totalCatAssets = categories.reduce((sum, c) => sum + c.count, 0) || stats.totalAssets || 1;
  const activeRate = stats.totalAssets > 0 ? ((stats.activeAssets / stats.totalAssets) * 100).toFixed(1) : '100';

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-10">
      {/* ── Top Hero & Actions Bar ───────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-zinc-200/80 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Institutional Asset Command
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {activeRate}% Operational
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Tracking {stats.totalAssets.toLocaleString()} physical assets across {stats.totalRooms} rooms in Sardar Patel Institute of Technology
          </p>
        </div>

        {/* Quick Launchers */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-xs"
          >
            <Search className="h-3.5 w-3.5" /> Search Catalog
          </Link>

          <a
            href="/api/export"
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-xs"
          >
            <Download className="h-3.5 w-3.5" /> Export Register
          </a>

          {['asset_manager', 'approver'].includes(role) && (
            <Link
              href="/approvals"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
            >
              <FileCheck className="h-3.5 w-3.5" />
              <span>Approval Center</span>
              {stats.pendingApprovals > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-800 text-[10px] font-bold px-1 ml-0.5">
                  {stats.pendingApprovals}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>

      {/* ── Key Performance Metric Cards & Unified Workflow Block ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* 4 Core Infrastructure Stats (8 cols on lg) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:col-span-8">
          <StatCard
            title="Total Catalog"
            value={stats.totalAssets.toLocaleString()}
            icon={<Package className="h-4 w-4" />}
            trend="neutral"
          />
          <StatCard
            title="Active Assets"
            value={stats.activeAssets.toLocaleString()}
            icon={<Activity className="h-4 w-4" />}
            trend="up"
          />
          <StatCard
            title="Campus Rooms"
            value={stats.totalRooms.toLocaleString()}
            icon={<DoorOpen className="h-4 w-4" />}
          />
          <StatCard
            title="Buildings"
            value={stats.totalBuildings.toLocaleString()}
            icon={<Building2 className="h-4 w-4" />}
          />
        </div>

        {/* Unified Merged Approvals & Transfers Block (4 cols on lg) */}
        <Card className="lg:col-span-4 overflow-hidden border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/20 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900/60 shadow-xs flex flex-col justify-center">
          <CardContent className="p-3.5">
            <div className="grid grid-cols-2 divide-x divide-zinc-200/80 dark:divide-zinc-800">
              {/* Approvals side */}
              <Link
                href="/approvals"
                className="pr-3 group hover:opacity-85 transition-opacity block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                    <CheckSquare className="h-3.5 w-3.5 text-indigo-500" /> Approvals
                  </span>
                  {stats.pendingApprovals > 0 ? (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold px-1 animate-pulse">
                      {stats.pendingApprovals}
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Clear</span>
                  )}
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                    {stats.pendingApprovals}
                  </span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">pending</span>
                </div>
              </Link>

              {/* Transfers side */}
              <Link
                href="/transfers"
                className="pl-3 group hover:opacity-85 transition-opacity block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-500" /> Transfers
                  </span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">30d</span>
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                    {stats.recentTransfers}
                  </span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">relocations</span>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Bento Grid Layout (2 Col Left + 1 Col Right) ────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2-Span): Category Segment Bar & Detailed Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Category Distribution Bar Card */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <CardTitle>Asset Category Distribution</CardTitle>
                </div>
                <Link
                  href="/inventory"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View all categories →
                </Link>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Segmented Progress Bar */}
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 gap-0.5 p-0.5">
                {categories.slice(0, 8).map((cat, i) => {
                  const pct = (cat.count / totalCatAssets) * 100;
                  if (pct < 0.5) return null;
                  const colorClass = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                  return (
                    <div
                      key={cat.id}
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-sm ${colorClass} transition-all hover:opacity-80`}
                      title={`${cat.name}: ${cat.count.toLocaleString()} assets (${pct.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>

              {/* Category Grid Items */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {categories.slice(0, 8).map((cat, i) => {
                  const pct = ((cat.count / totalCatAssets) * 100).toFixed(1);
                  const colorClass = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                  return (
                    <Link
                      key={cat.id}
                      href={`/inventory?category=${cat.id}`}
                      className="flex flex-col p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/70 hover:border-indigo-300 dark:hover:border-indigo-800 bg-zinc-50/40 dark:bg-zinc-800/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-all group"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`h-2 w-2 rounded-full ${colorClass}`} />
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between pl-3.5">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">
                          {cat.count.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                          {pct}%
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Operational Lifecycle Status Gauges */}
          <Card>
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <CardTitle>Catalog Health & Status Ratios</CardTitle>
                </div>
                <span className="text-xs text-zinc-400 font-mono">
                  {stats.totalAssets.toLocaleString()} Total Units
                </span>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                {/* Active */}
                <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 p-3.5 space-y-1">
                  <div className="flex items-center justify-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Active In-Use
                  </div>
                  <p className="text-xl font-bold text-emerald-900 dark:text-emerald-200">
                    {statusCounts.active.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {activeRate}% of total
                  </p>
                </div>

                {/* Under Maintenance */}
                <div className="rounded-xl border border-amber-200/60 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 p-3.5 space-y-1">
                  <div className="flex items-center justify-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <Wrench className="h-3 w-3" /> Under Service
                  </div>
                  <p className="text-xl font-bold text-amber-900 dark:text-amber-200">
                    {statusCounts.maintenance.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    Pending repair
                  </p>
                </div>

                {/* Damaged / Missing */}
                <div className="rounded-xl border border-red-200/60 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 p-3.5 space-y-1">
                  <div className="flex items-center justify-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3" /> Flagged / Missing
                  </div>
                  <p className="text-xl font-bold text-red-900 dark:text-red-200">
                    {(statusCounts.missing + statusCounts.damaged).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                    Requires review
                  </p>
                </div>

                {/* Retired / Disposed */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-3.5 space-y-1">
                  <div className="flex items-center justify-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    <Archive className="h-3 w-3" /> Condemned
                  </div>
                  <p className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                    {statusCounts.retired.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-medium">
                    Decommissioned
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Audit & Activity Stream */}
          <Card>
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <CardTitle>Recent Audit & Activity Log</CardTitle>
                </div>
                <Link
                  href="/history"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View full history →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {history.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-6">
                  No activity events recorded yet.
                </p>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {history.map((event: any) => (
                    <div key={event.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/50 dark:border-indigo-800/50">
                        <Clock className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                          <span>{EVENT_LABELS[event.event_type] ?? event.event_type}</span>
                          {event.asset && (
                            <>
                              {' · '}
                              <Link
                                href={`/inventory/${event.asset.id}`}
                                className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                              >
                                {event.asset.asset_tag}
                              </Link>{' '}
                              ({event.asset.name})
                            </>
                          )}
                        </p>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                          {event.performer?.full_name ?? 'System'} · {formatRelativeTime(event.occurred_at)}
                          {event.reason && ` · "${event.reason}"`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1-Span): Campus Floor Density & Approvals Queue */}
        <div className="space-y-6">
          {/* Campus Floor Vertical Density Map */}
          <Card>
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <CardTitle>Floor Asset Density</CardTitle>
                </div>
                <Link
                  href="/locations/floors"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  All floors →
                </Link>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
              {floors.map((floor) => {
                const sharePct = stats.totalAssets > 0 ? ((floor.count / stats.totalAssets) * 100).toFixed(1) : '0';
                return (
                  <Link
                    key={floor.id}
                    href={`/locations/floors`}
                    className="block group space-y-1.5 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {floor.name}
                      </span>
                      <span className="font-mono text-zinc-900 dark:text-white font-semibold">
                        {floor.count.toLocaleString()} <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">({sharePct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, Math.max(2, Number(sharePct)))}%` }}
                        className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all"
                      />
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Pending Approvals Widget */}
          <Card>
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <CardTitle>{role === 'approver' ? 'Pending Queue' : 'My Requests'}</CardTitle>
                </div>
                <Link
                  href="/approvals"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View queue ({stats.pendingApprovals}) →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {requests.length === 0 ? (
                <div className="py-6 text-center space-y-1">
                  <CheckSquare className="h-6 w-6 text-emerald-500 mx-auto mb-1 opacity-75" />
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Queue is clear
                  </p>
                  <p className="text-[11px] text-zinc-400">All submitted change requests have been processed.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {requests.map((req: any) => {
                    const typeBadge = REQUEST_TYPE_BADGES[req.type];
                    return (
                      <div key={req.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Badge variant={typeBadge.variant} className="text-[10px] py-0">
                              {typeBadge.label}
                            </Badge>
                            <span className="font-semibold text-zinc-900 dark:text-white truncate max-w-[140px]">
                              {req.asset?.name ?? 'Asset'}
                            </span>
                          </div>
                          <Link
                            href="/approvals"
                            className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                          >
                            Review
                          </Link>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                          {req.reason}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Institutional Resources Toolkit */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-zinc-900 dark:to-zinc-800/60 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Campus Navigator
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/locations/buildings"
                className="flex items-center gap-1.5 p-2 rounded-lg bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 font-medium text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-2xs"
              >
                <Building2 className="h-3.5 w-3.5 text-indigo-500" /> Buildings
              </Link>
              <Link
                href="/locations/rooms"
                className="flex items-center gap-1.5 p-2 rounded-lg bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 font-medium text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-2xs"
              >
                <DoorOpen className="h-3.5 w-3.5 text-indigo-500" /> All Rooms
              </Link>
              <Link
                href="/transfers"
                className="flex items-center gap-1.5 p-2 rounded-lg bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 font-medium text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-2xs"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-500" /> Transfers
              </Link>
              <Link
                href="/inventory/categories"
                className="flex items-center gap-1.5 p-2 rounded-lg bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 font-medium text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-2xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-500" /> Categories
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
