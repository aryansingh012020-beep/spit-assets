import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import { Upload, AlertTriangle, CheckCircle, SkipForward, Download, ShieldCheck, Sparkles, FileSpreadsheet } from 'lucide-react';
import { ImportIssueActions } from './import-issue-actions';
import { RoomAssetIngestionDialog } from '@/components/room-asset-ingestion-dialog';

export const dynamic = 'force-dynamic';

const ISSUE_TYPE_LABELS: Record<string, string> = {
  no_tag:         'No Tag',
  duplicate_tag:  'Duplicate Tag',
  ambiguous_range:'Ambiguous Range',
  missing_room:   'Missing Room',
  fuzzy_duplicate:'Fuzzy Duplicate',
  parse_error:    'Parse Error',
};

export default async function ImportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();

  if (profile?.role !== 'approver') redirect('/dashboard');

  const [{ data: issues, count }, { data: rooms }] = await Promise.all([
    supabase
      .from('import_issues')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('rooms')
      .select('id, name, room_number')
      .order('name'),
  ]);

  const pending  = (issues ?? []).filter((i: any) => i.status === 'pending').length;
  const resolved = (issues ?? []).filter((i: any) => i.status !== 'pending').length;

  return (
    <div className="space-y-8 max-w-5xl pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Excel Ingestion & Import Hub
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Bulk ingest room equipment with pre-flight safety railroads and audit spreadsheet logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/import/template"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Download Master Template</span>
          </a>

          <RoomAssetIngestionDialog
            rooms={rooms ?? []}
            trigger={
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm text-xs font-semibold">
                <Upload className="h-3.5 w-3.5" />
                <span>Ingest Room Assets</span>
              </Button>
            }
          />
        </div>
      </div>

      {/* Hero Section: Ingestion Studio & Safe Railroads */}
      <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/30 dark:from-zinc-900 dark:via-zinc-900 dark:to-indigo-950/30 p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-100/80 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
              <Sparkles className="h-3 w-3" />
              <span>Standardized Multi-Sheet Ingestion Engine</span>
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Room-Wise Bulk Asset Ingestion
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Upload spreadsheets formatted according to the SPIT register specification. Every row is analyzed in an isolated sandbox dry-run before writing to the database.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <RoomAssetIngestionDialog
              rooms={rooms ?? []}
              trigger={
                <Button size="lg" className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-md text-xs font-semibold px-5">
                  <Upload className="h-4 w-4" />
                  <span>Launch Ingestion Wizard</span>
                </Button>
              }
            />
            <a
              href="/api/import/template"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Blank Template (.xlsx)</span>
            </a>
          </div>
        </div>

        {/* 4 Safety Railroads */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-800/80 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>1. Pre-Flight Sandbox</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
              No blind commits. Review an interactive diagnostic table displaying clean, warning, and error rows.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-800/80 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>2. Smart Auto-Tagging</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
              Leave tags blank to auto-allocate institutional codes: <code className="text-[10px] font-mono font-semibold">SPIT/CAT/YYYY/00001</code>.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-800/80 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>3. Collision Shield</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
              Checks for duplicate tags both within the uploaded file and across all existing assets in Supabase.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-800/80 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold">
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span>4. Quantity Expansion</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
              Rows with Quantity &gt; 1 auto-expand into unique serialized items so every physical unit has a discrete barcode.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Flagged Issues & Exceptions */}
      <div className="space-y-4 pt-4 border-t border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Flagged Import Discrepancies</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Review and resolve rows flagged during previous bulk imports
            </p>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-amber-600 font-medium">
              <AlertTriangle className="h-3.5 w-3.5" /> {pending} pending
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <CheckCircle className="h-3.5 w-3.5" /> {resolved} resolved
            </span>
          </div>
        </div>

        {/* Instructions */}
        <Card className="border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              <strong>Audit Rail:</strong> Rows flagged with missing tags, ambiguous ranges, or parse errors appear below. Approvers can <strong>import as-is</strong> (generating a standard tag), <strong>skip</strong> (bypassing without deleting for audit logs), or retain for review.
            </p>
          </CardContent>
        </Card>

      {!issues || issues.length === 0 ? (
        <EmptyState
          icon={<Upload className="h-8 w-8" />}
          title="No import issues"
          description="Run the import script to see flagged rows here"
        />
      ) : (
        <div className="space-y-3">
          {issues.map((issue: any) => (
            <Card key={issue.id} className={issue.status !== 'pending' ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="warning">
                        {ISSUE_TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
                      </Badge>
                      <span className="text-xs text-zinc-400">{issue.sheet_name} · Row {issue.row_number}</span>
                      {issue.status !== 'pending' && (
                        <Badge variant={issue.status === 'skipped' ? 'neutral' : 'success'}>
                          {issue.status}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-zinc-700 font-medium">
                      {issue.raw_data?.description as string ?? 'Unknown asset'}
                    </p>

                    <p className="text-xs text-zinc-500 mt-0.5">{issue.issue_detail}</p>

                    <pre className="mt-2 text-[10px] bg-zinc-100 rounded p-2 overflow-x-auto text-zinc-600">
                      {JSON.stringify(issue.raw_data, null, 2).slice(0, 300)}
                    </pre>

                    <p className="text-[10px] text-zinc-400 mt-2">
                      Run: {issue.run_id} · {formatDateTime(issue.created_at)}
                    </p>
                  </div>

                  {issue.status === 'pending' && (
                    <ImportIssueActions issueId={issue.id} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
