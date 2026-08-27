import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, EmptyState } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { ArrowRightLeft, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TransfersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();

  if (profile?.role === 'viewer') redirect('/dashboard');

  const { data: movements } = await supabase
    .from('asset_movements')
    .select(`
      id, moved_at, request_id,
      asset:assets(id, asset_tag, name),
      from_room:rooms!from_room_id(name, room_number),
      to_room:rooms!to_room_id(name, room_number),
      mover:profiles!moved_by(full_name),
      approver:profiles!approved_by(full_name)
    `)
    .order('moved_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Transfer History</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Approved asset location changes
        </p>
      </div>

      {!movements || movements.length === 0 ? (
        <EmptyState
          icon={<ArrowRightLeft className="h-8 w-8" />}
          title="No transfers yet"
          description="Approved transfer requests will appear here"
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                <tr>
                  {['Asset', 'From', 'To', 'Moved By', 'Approved By', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {movements.map((m: any) => (
                  <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/inventory/${m.asset?.id}`}
                        className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {m.asset?.asset_tag}
                      </Link>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">{m.asset?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                      {m.from_room?.name ?? '—'}
                      {m.from_room?.room_number && ` (${m.from_room.room_number})`}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs text-zinc-900 dark:text-zinc-100 font-medium">
                        {m.to_room?.name ?? '—'}
                        {m.to_room?.room_number && ` (${m.to_room.room_number})`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {m.mover?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {m.approver?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 dark:text-zinc-500">
                      {formatDateTime(m.moved_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
