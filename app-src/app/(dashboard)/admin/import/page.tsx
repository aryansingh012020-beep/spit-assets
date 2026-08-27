import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { Upload, AlertTriangle, CheckCircle, SkipForward } from 'lucide-react';
import { ImportIssueActions } from './import-issue-actions';

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

  const { data: issues, count } = await supabase
    .from('import_issues')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(100);

  const pending  = (issues ?? []).filter((i: any) => i.status === 'pending').length;
  const resolved = (issues ?? []).filter((i: any) => i.status !== 'pending').length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Import Issues</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Review flagged rows from the Excel import
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="flex items-center gap-1.5 text-amber-600">
            <AlertTriangle className="h-4 w-4" /> {pending} pending
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle className="h-4 w-4" /> {resolved} resolved
          </span>
        </div>
      </div>

      {/* Instructions */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            <strong>How to use:</strong> These rows were flagged during Excel import because they had missing tags, 
            ambiguous ranges, or parse errors. For each issue, you can <strong>import as-is</strong> 
            (creates the asset with a generated tag), <strong>skip</strong> (marks as skipped and won&apos;t 
            be imported), or leave it for later review. Skipped rows are never deleted — they remain in 
            this table for audit purposes.
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
  );
}
