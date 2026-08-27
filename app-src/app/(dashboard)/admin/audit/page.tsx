import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, EmptyState } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import { FileText, ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'approver') redirect('/dashboard');

  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select(`
      id, action, target_type, target_id, changes, created_at, ip_address,
      actor:profiles!performed_by(full_name, role)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Security Audit Log</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Immutable audit trail of security and governance events
        </p>
      </div>

      {!auditLogs || auditLogs.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="Audit log clean"
          description="System actions and governance events will be recorded here automatically"
        />
      ) : (
        <Card>
          <div className="divide-y divide-zinc-100">
            {auditLogs.map((log: any) => (
              <div key={log.id} className="p-4 hover:bg-zinc-50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{log.action}</Badge>
                    <span className="text-xs font-mono text-zinc-500">
                      {log.target_type} ({log.target_id?.slice(0, 8)}…)
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>

                <div className="mt-2 text-xs text-zinc-600 flex items-center gap-2">
                  <span>Actor: <strong>{log.actor?.full_name || 'System / Service Role'}</strong></span>
                  {log.ip_address && <span className="text-zinc-400">({log.ip_address})</span>}
                </div>

                {log.changes && (
                  <pre className="mt-2 text-[11px] bg-zinc-100 rounded p-2 overflow-x-auto text-zinc-700">
                    {JSON.stringify(log.changes, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
