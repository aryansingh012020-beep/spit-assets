import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Card, EmptyState } from '@/components/ui/primitives';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import { History, Clock } from 'lucide-react';
import { isDemoMode, DEMO_HISTORY } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

const EVENT_LABELS: Record<string, string> = {
  addition_approved:  '🟢 Asset added to inventory',
  transfer_approved:  '🔄 Transfer approved',
  transfer_rejected:  '🔴 Transfer rejected',
  transfer_requested: '📋 Transfer requested',
  edit_approved:      '✏️ Edit approved',
  edit_rejected:      '🔴 Edit rejected',
  edit_requested:     '📋 Edit requested',
  deletion_approved:  '🗑️ Asset retired/disposed',
  deletion_rejected:  '🔴 Deletion rejected',
  deletion_requested: '📋 Deletion requested',
  photo_uploaded:     '📷 Photo uploaded',
  status_change:      '🔔 Status changed',
  creation:           '✨ Asset created',
  admin_change:       '⚙️ Administrative change',
};

export default async function HistoryPage() {
  // ── Demo mode ────────────────────────────────────────────────────
  if (isDemoMode()) {
    const cookieStore = await cookies();
    if (cookieStore.get('demo_session')?.value !== 'true') redirect('/login');
    return <HistoryContent events={DEMO_HISTORY} />;
  }

  // ── Production mode ──────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: events } = await supabase
    .from('asset_history')
    .select(`id,event_type,occurred_at,reason,from_location,to_location,asset:assets(id,asset_tag,name),performer:profiles!performed_by(full_name),approver:profiles!approved_by(full_name)`)
    .order('occurred_at', { ascending: false })
    .limit(50);

  return <HistoryContent events={events ?? []} />;
}

function HistoryContent({ events }: { events: any[] }) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Asset History</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Immutable event log of all asset changes</p>
      </div>

      {events.length === 0
        ? <EmptyState icon={<History className="h-8 w-8" />} title="No history yet" description="Events will appear here as assets are modified" />
        : (
          <Card>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {events.map((event: any, i) => (
                <div key={event.id} className="flex gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <div className="flex flex-col items-center pt-0.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <Clock className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                    </div>
                    {i < events.length - 1 && <div className="mt-1 flex-1 w-px bg-zinc-100 dark:bg-zinc-800 min-h-[16px]" />}
                  </div>
                  <div className="pb-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {EVENT_LABELS[event.event_type] ?? event.event_type}
                        </p>
                        {event.asset && (
                          <Link href={`/inventory/${event.asset.id}`} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-mono mt-0.5 block">
                            {event.asset.asset_tag} — {event.asset.name}
                          </Link>
                        )}
                      </div>
                      <time className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0" title={formatDateTime(event.occurred_at)}>
                        {formatRelativeTime(event.occurred_at)}
                      </time>
                    </div>
                    {event.reason && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{event.reason}</p>}
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1.5">
                      {event.performer?.full_name ?? 'System'}
                      {event.approver?.full_name && ` · approved by ${event.approver.full_name}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
    </div>
  );
}
