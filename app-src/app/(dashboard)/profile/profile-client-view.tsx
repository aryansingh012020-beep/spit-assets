'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Input, Textarea } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Profile } from '@/lib/types';
import { updateUserProfile } from '@/lib/actions/profile';
import { formatDateTime, formatRelativeTime, getInitials } from '@/lib/utils';
import {
  User,
  Phone,
  Mail,
  Building,
  Briefcase,
  IdCard,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Clock3,
  ArrowRightLeft,
  MessageSquare,
  FileText,
  Save,
  Activity,
  Calendar,
  Layers,
  Lock,
  Globe,
  Sparkles,
} from 'lucide-react';

interface ProfileClientViewProps {
  profile: Profile;
  userEmail: string;
  history: {
    requests: any[];
    events: any[];
    comments: any[];
    movements: any[];
  };
}

const DEPARTMENTS = [
  'Computer Engineering',
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Telecommunication',
  'Applied Sciences & Humanities',
  'Central Administration',
  'Library & Information Services',
  'IT Infrastructure & Server Admin',
  'Estate & Maintenance',
];

const DESIGNATIONS = [
  'Professor & Head of Department',
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Laboratory Assistant / In-Charge',
  'Technical Assistant',
  'System Administrator',
  'Estate Officer',
  'Store Officer / Asset Custodian',
  'Administrative Officer',
];

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: 'success' | 'warning' | 'neutral' }> = {
  active:   { label: 'Active & On Duty', dot: 'bg-emerald-500', badge: 'success' },
  on_leave: { label: 'On Leave',         dot: 'bg-amber-500',   badge: 'warning' },
  inactive: { label: 'Inactive',         dot: 'bg-zinc-400',    badge: 'neutral' },
};

export function ProfileClientView({ profile, userEmail, history }: ProfileClientViewProps) {
  const [activeTab, setActiveTab] = React.useState<'edit' | 'activity' | 'requests' | 'transfers' | 'comments'>('edit');
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    full_name:    profile.full_name || '',
    phone_number: profile.phone_number || '',
    employee_id:  profile.employee_id || '',
    department:   profile.department || '',
    designation:  profile.designation || '',
    status:       profile.status || 'active',
    bio:          profile.bio || '',
  });

  const { toast } = useToast();
  const router = useRouter();

  const statusInfo = STATUS_CONFIG[formData.status] || STATUS_CONFIG.active;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast({ variant: 'error', title: 'Name required', description: 'Full name cannot be empty.' });
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile(formData);
      toast({ variant: 'success', title: 'Profile Updated', description: 'Your personal information has been saved.' });
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'error', title: 'Update Failed', description: err.message || 'Could not update profile' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-12">
      {/* ── User Header Card ────────────────────────────────────────── */}
      <Card className="overflow-hidden border-zinc-200/90 dark:border-zinc-800 bg-gradient-to-r from-white via-zinc-50/50 to-indigo-50/30 dark:from-zinc-900 dark:via-zinc-900/90 dark:to-indigo-950/20">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left: Avatar & Personal Info */}
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="relative">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 dark:bg-indigo-600 text-white font-bold text-2xl shadow-lg ring-4 ring-indigo-50 dark:ring-indigo-950/60">
                  {getInitials(formData.full_name || 'User')}
                </div>
                <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-zinc-900 ${statusInfo.dot}`} />
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white truncate">
                    {formData.full_name || 'User Profile'}
                  </h1>

                  <Badge variant={profile.role === 'approver' ? 'success' : profile.role === 'asset_manager' ? 'warning' : 'neutral'} className="capitalize font-semibold text-xs py-0.5">
                    <Shield className="h-3 w-3 mr-1" />
                    {profile.role.replace('_', ' ')}
                  </Badge>

                  <Badge variant={statusInfo.badge} className="text-xs py-0.5">
                    {statusInfo.label}
                  </Badge>
                </div>

                <p className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  {formData.designation || 'Faculty / Staff Member'}
                  {formData.department && ` · ${formData.department}`}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-zinc-400" />
                    {userEmail}
                  </span>

                  {formData.phone_number && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-zinc-400" />
                      {formData.phone_number}
                    </span>
                  )}

                  {formData.employee_id && (
                    <span className="flex items-center gap-1.5 font-mono">
                      <IdCard className="h-3.5 w-3.5 text-zinc-400" />
                      ID: {formData.employee_id}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Personal Stat Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 md:pl-6">
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 text-center">
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{history.requests.length}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Requests</p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 text-center">
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{history.movements.length}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Shifts</p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 text-center">
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{history.comments.length}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Remarks</p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 text-center">
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{history.events.length}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Events</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Navigation Tabs ─────────────────────────────────────────── */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'edit'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <User className="h-4 w-4" /> Personal Details
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'activity'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Activity className="h-4 w-4" /> Activity History ({history.events.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'requests'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" /> My Change Requests ({history.requests.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transfers')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'transfers'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <ArrowRightLeft className="h-4 w-4" /> My Asset Shifts ({history.movements.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'comments'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="h-4 w-4" /> My Discussion Notes ({history.comments.length})
          </button>
        </nav>
      </div>

      {/* ── TAB 1: EDIT PERSONAL DETAILS ────────────────────────────── */}
      {activeTab === 'edit' && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Institutional & Contact Profile</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. Dr. Ramesh K. Verma"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Contact Phone / Mobile Number
                  </label>
                  <Input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>

                {/* Employee / Faculty ID */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Employee / Faculty ID
                  </label>
                  <Input
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    placeholder="e.g. SPIT-FAC-2018-042"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Department / Division
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Department…</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Academic / Administrative Designation
                  </label>
                  <select
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Designation…</option>
                    {DESIGNATIONS.map((desig) => (
                      <option key={desig} value={desig}>
                        {desig}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duty / Availability Status */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Institutional Availability Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Active & On Duty</option>
                    <option value="on_leave">On Leave / Sabbatical</option>
                    <option value="inactive">Inactive / Transitioned</option>
                  </select>
                </div>
              </div>

              {/* Bio / Office Location */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Office Location, Cabin, or Academic Notes
                </label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="e.g. Cabin 502, 5th Floor CSE Wing · In-charge for Advanced Networking & Cloud Laboratory"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Button type="submit" isLoading={loading} className="gap-2">
                  <Save className="h-4 w-4" /> Save Profile Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* ── TAB 2: AUDIT & ACTIVITY HISTORY ─────────────────────────── */}
      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Event Log</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {history.events.length === 0 ? (
              <div className="py-12 text-center text-zinc-400">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">No events logged yet</p>
                <p className="text-xs text-zinc-400 mt-0.5">Your asset updates, room transfers, and changes will be tracked here.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {history.events.map((event: any) => (
                  <div key={event.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                        {event.event_type.replace(/_/g, ' ')}
                        {event.asset && (
                          <>
                            {' · '}
                            <Link href={`/inventory/${event.asset.id}`} className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline">
                              {event.asset.asset_tag}
                            </Link>{' '}
                            ({event.asset.name})
                          </>
                        )}
                      </p>
                      {event.reason && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                          "{event.reason}"
                        </p>
                      )}
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                        {formatDateTime(event.occurred_at)} ({formatRelativeTime(event.occurred_at)})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB 3: MY CHANGE REQUESTS ────────────────────────────────── */}
      {activeTab === 'requests' && (
        <Card>
          <CardHeader>
            <CardTitle>Submitted Change Requests</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {history.requests.length === 0 ? (
              <div className="py-12 text-center text-zinc-400">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">No requests submitted</p>
                <p className="text-xs text-zinc-400 mt-0.5">When you request additions, transfers or disposals, they appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {history.requests.map((req: any) => (
                  <div key={req.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={req.type === 'addition' ? 'info' : req.type === 'transfer' ? 'warning' : 'neutral'} className="capitalize text-[10px]">
                          {req.type}
                        </Badge>

                        <Badge variant={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'} className="capitalize text-[10px]">
                          {req.status}
                        </Badge>

                        {req.asset && (
                          <Link href={`/inventory/${req.asset.id}`} className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                            {req.asset.asset_tag}
                          </Link>
                        )}
                      </div>

                      <p className="text-xs text-zinc-800 dark:text-zinc-200">
                        {req.asset?.name ? `${req.asset.name} — ` : ''}{req.reason}
                      </p>

                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        Submitted on {formatDateTime(req.created_at)}
                        {req.reviewer?.full_name && ` · Reviewed by ${req.reviewer.full_name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB 4: MY ASSET SHIFTS ──────────────────────────────────── */}
      {activeTab === 'transfers' && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Asset Relocation Record</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {history.movements.length === 0 ? (
              <div className="py-12 text-center text-zinc-400">
                <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">No asset shifts recorded</p>
                <p className="text-xs text-zinc-400 mt-0.5">Approved transfers requested or executed by you will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {history.movements.map((m: any) => (
                  <div key={m.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {m.asset && (
                          <Link href={`/inventory/${m.asset.id}`} className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                            {m.asset.asset_tag}
                          </Link>
                        )}
                        <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">
                          {m.asset?.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                        <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px]">
                          From: {m.from_room?.name ?? '—'}
                        </span>
                        <ArrowRightLeft className="h-3 w-3 text-indigo-500" />
                        <span className="rounded bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/60 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                          To: {m.to_room?.name ?? '—'}
                        </span>
                      </div>

                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        Relocated on {formatDateTime(m.moved_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB 5: MY DISCUSSION NOTES ──────────────────────────────── */}
      {activeTab === 'comments' && (
        <Card>
          <CardHeader>
            <CardTitle>Comments & Notes Authored</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {history.comments.length === 0 ? (
              <div className="py-12 text-center text-zinc-400">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">No comments written yet</p>
                <p className="text-xs text-zinc-400 mt-0.5">Remarks and audit notes you write on asset records will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {history.comments.map((c: any) => (
                  <div key={c.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {c.asset && (
                          <Link href={`/inventory/${c.asset.id}`} className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                            {c.asset.asset_tag} — {c.asset.name}
                          </Link>
                        )}
                        {c.is_admin_only ? (
                          <Badge variant="warning" className="text-[10px] gap-1 py-0">
                            <Lock className="h-2.5 w-2.5" /> Admin Only
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px] gap-1 py-0">
                            <Globe className="h-2.5 w-2.5 text-zinc-400" /> Public
                          </Badge>
                        )}
                      </div>
                      <time className="text-[10px] text-zinc-400">
                        {formatRelativeTime(c.created_at)}
                      </time>
                    </div>

                    <p className="text-xs text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      "{c.content}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
