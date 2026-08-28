'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Search,
  Filter,
  Building,
  Mail,
  Key,
  Phone,
  Briefcase,
  IdCard,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { AccountRequest, UserRole } from '@/lib/types';
import { toast } from 'sonner';

interface AdminUserManagerProps {
  initialProfiles: any[];
  initialRequests: AccountRequest[];
}

const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'Electronics & Telecommunication',
  'Computer Science & Applied Data Science',
  'MCA / Post Graduate',
  'Administration & Accounts',
  'Library & Information Resource',
  'Central Maintenance & Facilities',
  'Dean / Principal Office',
];

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'viewer', label: 'Viewer', desc: 'Read-only catalog exploration & data export' },
  { value: 'asset_manager', label: 'Asset Manager', desc: 'Propose additions, transfers, and edit requests' },
  { value: 'approver', label: 'Approver / Admin', desc: 'Authorize workflows, conduct stocktakes, manage users' },
];

export function AdminUserManager({
  initialProfiles,
  initialRequests,
}: AdminUserManagerProps) {
  const router = useRouter();
  const [tab, setTab] = React.useState<'users' | 'requests'>('users');
  const [profiles, setProfiles] = React.useState(initialProfiles);
  const [requests, setRequests] = React.useState<AccountRequest[]>(initialRequests);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<string>('all');

  // Modal State for Direct User Creation
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createLoading, setCreateLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    full_name: '',
    email: '',
    password: '',
    role: 'viewer' as UserRole,
    department: DEPARTMENTS[0],
    designation: '',
    phone_number: '',
    employee_id: '',
  });

  // Action Loading State for Requests
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      toast.success(data.message || 'User created successfully!');
      setIsCreateOpen(false);
      setFormData({
        full_name: '',
        email: '',
        password: '',
        role: 'viewer',
        department: DEPARTMENTS[0],
        designation: '',
        phone_number: '',
        employee_id: '',
      });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Error creating user');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleRequestAction(requestId: string, action: 'approve' | 'reject') {
    setActionLoadingId(requestId);
    try {
      const res = await fetch('/api/account-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          action,
          custom_password: 'Spit@' + Math.floor(1000 + Math.random() * 9000),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      toast.success(data.message);
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r))
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Error processing request');
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Action Header & Tabs ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            User Directory & Access Control
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage institutional staff accounts, role governance, and onboarding requests
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ───────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            tab === 'users'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Active Directory</span>
          <span className="ml-1 rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-mono">
            {profiles.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab('requests')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            tab === 'requests'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Onboarding Requests</span>
          {pendingRequests.length > 0 && (
            <span className="ml-1 rounded-full bg-rose-500 text-white px-2 py-0.5 text-xs font-bold animate-pulse">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: ACTIVE USER DIRECTORY ─────────────────────────── */}
      {tab === 'users' && (
        <div className="space-y-4">
          {/* Filters strip */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or department..."
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-10 pr-4 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-400 hidden sm:block" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Roles</option>
                <option value="approver">Approvers</option>
                <option value="asset_manager">Asset Managers</option>
                <option value="viewer">Viewers</option>
              </select>
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60">
                  <tr>
                    {['User Details', 'Role', 'Department & Title', 'Phone / ID', 'Joined'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredProfiles.map((p) => {
                    const isApprover = p.role === 'approver';
                    const isManager = p.role === 'asset_manager';
                    return (
                      <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                              {p.full_name?.slice(0, 2).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-zinc-900 dark:text-white">{p.full_name || 'Unnamed'}</p>
                              <p className="text-xs text-zinc-400 font-mono">{p.id.slice(0, 8)}…</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              isApprover
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : isManager
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                            }`}
                          >
                            <ShieldCheck className="h-3 w-3" />
                            {isApprover ? 'Approver / Admin' : isManager ? 'Asset Manager' : 'Viewer'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{p.department || '—'}</p>
                          <p className="text-[11px] text-zinc-400">{p.designation || 'Faculty / Staff'}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 font-mono">
                          {p.phone_number || p.employee_id || '—'}
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
        </div>
      )}

      {/* ── TAB 2: ONBOARDING REQUESTS ────────────────────────────── */}
      {tab === 'requests' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <p className="text-base font-bold text-zinc-900 dark:text-white">All caught up!</p>
                <p className="text-xs text-zinc-500">No pending account creation requests from the landing portal.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {requests.map((req) => {
                const isPending = req.status === 'pending';
                const isApproved = req.status === 'approved';
                return (
                  <div
                    key={req.id}
                    className={`rounded-2xl border p-5 transition-all bg-white dark:bg-zinc-900 ${
                      isPending
                        ? 'border-amber-200 dark:border-amber-900/50 shadow-sm'
                        : isApproved
                        ? 'border-zinc-200 dark:border-zinc-800 opacity-75'
                        : 'border-rose-200 dark:border-rose-900/40 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-bold text-zinc-900 dark:text-white">{req.full_name}</h3>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                              isPending
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                                : isApproved
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                          <span>📧 {req.email}</span>
                          <span>·</span>
                          <span>🏢 {req.department}</span>
                          {req.designation && <span>({req.designation})</span>}
                        </p>

                        {req.reason && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl mt-2 border border-zinc-100 dark:border-zinc-800">
                            <strong>Reason for Access:</strong> {req.reason}
                          </p>
                        )}
                      </div>

                      {/* Approver Action Buttons */}
                      {isPending && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={actionLoadingId === req.id}
                            onClick={() => handleRequestAction(req.id, 'approve')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                          >
                            {actionLoadingId === req.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                            <span>Approve & Provision</span>
                          </button>

                          <button
                            type="button"
                            disabled={actionLoadingId === req.id}
                            onClick={() => handleRequestAction(req.id, 'reject')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-3 py-2 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: CREATE USER DIRECTLY ───────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Create New Institutional User</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Directly provision authentication credentials and profile role
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. Dr. Rajesh Shirodkar"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Institutional Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@spit.ac.in"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Initial Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 6 chars (e.g. Spit@2026)"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Assigned Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Department *
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Associate Professor"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Phone / Extension
                  </label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+91 98200 00000"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {createLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Provision Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
