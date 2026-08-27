import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, EmptyState } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { Users, ShieldCheck, UserCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

const ROLE_BADGES: Record<string, { variant: 'default' | 'info' | 'warning' | 'neutral'; label: string }> = {
  approver:      { variant: 'default', label: 'Approver' },
  asset_manager: { variant: 'info',    label: 'Asset Manager' },
  viewer:        { variant: 'neutral', label: 'Viewer' },
};

export default async function UsersAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'approver') redirect('/dashboard');

  const { data: profiles } = await supabase
    .from('profiles')
    .select(`
      id, full_name, role, employee_id, department, created_at,
      institution:institutions(name, code)
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">User Management</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Manage system users and role permissions
        </p>
      </div>

      {!profiles || profiles.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No users found"
          description="Users will appear here once registered"
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-100">
              <thead className="bg-zinc-50">
                <tr>
                  {['User', 'Role', 'Department', 'Employee ID', 'Joined'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {profiles.map((p: any) => {
                  const roleConfig = ROLE_BADGES[p.role] || { variant: 'neutral', label: p.role };
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-zinc-900">{p.full_name || 'Unnamed User'}</p>
                        <p className="text-xs text-zinc-400 font-mono">{p.id.slice(0, 8)}…</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={roleConfig.variant}>
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          {roleConfig.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600">
                        {p.department || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600 font-mono">
                        {p.employee_id || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {formatDateTime(p.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
