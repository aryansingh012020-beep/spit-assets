'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  CheckCircle2,
  ArrowRight,
  Send,
} from 'lucide-react';
import { Aurora } from '@/components/bits/aurora';
import { ShimmerButton } from '@/components/bits/shimmer-button';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const DEMO_EMAIL = 'demo@spit.ac.in';
const DEMO_PASS  = 'demo1234';

const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'Electronics & Telecommunication',
  'Computer Science & Applied Data Science',
  'MCA / Post Graduate',
  'Administration & Accounts',
  'Library & Information Resource',
  'Central Maintenance & Facilities',
  "Dean / Principal Office",
];

export default function LoginPage() {
  const [activeTab, setActiveTab] = React.useState<'signin' | 'request'>('signin');
  const [email, setEmail]       = React.useState(IS_DEMO ? DEMO_EMAIL : '');
  const [password, setPassword] = React.useState(IS_DEMO ? DEMO_PASS  : '');
  const [showPw, setShowPw]     = React.useState(false);
  const [loading, setLoading]   = React.useState(false);
  const [error, setError]       = React.useState('');
  const router = useRouter();
  const [reqFullName, setReqFullName]       = React.useState('');
  const [reqEmail, setReqEmail]             = React.useState('');
  const [reqRole, setReqRole]               = React.useState('viewer');
  const [reqDepartment, setReqDepartment]   = React.useState(DEPARTMENTS[0]);
  const [reqDesignation, setReqDesignation] = React.useState('');
  const [reqReason, setReqReason]           = React.useState('');
  const [reqLoading, setReqLoading]         = React.useState(false);
  const [reqSuccess, setReqSuccess]         = React.useState(false);
  const [reqError, setReqError]             = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (IS_DEMO) {
      if (email === DEMO_EMAIL && password === DEMO_PASS) {
        document.cookie = 'demo_session=true; path=/; max-age=86400';
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(`Demo credentials: ${DEMO_EMAIL} / ${DEMO_PASS}`);
        setLoading(false);
      }
      return;
    }
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('Invalid institutional email or password. Please verify your credentials.');
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  async function handleAccountRequest(e: React.FormEvent) {
    e.preventDefault();
    setReqLoading(true);
    setReqError('');
    try {
      const res = await fetch('/api/account-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: reqFullName,
          email: reqEmail,
          requested_role: reqRole,
          department: reqDepartment,
          designation: reqDesignation,
          reason: reqReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit account request.');
      setReqSuccess(true);
    } catch (err: any) {
      setReqError(err.message || 'Error submitting request');
    } finally {
      setReqLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 text-white overflow-hidden flex flex-col">
      <div className="pointer-events-none fixed inset-0 z-0 select-none" aria-hidden="true">
        <img
          src="/spit-entrance.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/95 via-zinc-950/80 to-indigo-950/60" />
        <Aurora />
      </div>
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 min-h-screen">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg shadow-black/40">
            <img src="/spit-logo-light.jpg" alt="SPIT" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-white">SPIT Asset Management</p>
            <p className="text-xs text-zinc-500 mt-0.5">Sardar Patel Institute of Technology &middot; Mumbai</p>
          </div>
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl space-y-5">
          <div className="grid grid-cols-2 rounded-xl bg-zinc-950 p-1 border border-zinc-800/60">
            <button
              type="button"
              onClick={() => { setActiveTab('signin'); setError(''); }}
              className={`rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'signin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('request'); setReqError(''); setReqSuccess(false); }}
              className={`rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'request' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Request Access
            </button>
          </div>

          {activeTab === 'signin' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-base font-bold text-white">Sign in to your account</h1>
                <p className="text-[11px] text-zinc-500 mt-0.5">Use your institutional SPIT credentials.</p>
              </div>
              {error && (
                <div className="rounded-lg bg-red-950/60 border border-red-800/50 px-3 py-2.5 text-xs text-red-300" role="alert">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="email" className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
                    Institutional Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@spit.ac.in"
                    className="block w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="password" className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 pr-10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((p) => !p)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <ShimmerButton
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </ShimmerButton>
              </form>
            </div>
          )}

          {activeTab === 'request' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-base font-bold text-white">Request Account Access</h1>
                <p className="text-[11px] text-zinc-500 mt-0.5">Submit your details to SPIT Approvers for role authorization.</p>
              </div>
              {reqSuccess ? (
                <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/50 p-4 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                  <p className="text-sm font-bold text-white">Request Submitted</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Your request has been routed to institutional Approvers. You will receive access upon verification.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('signin'); setReqSuccess(false); }}
                    className="mt-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAccountRequest} className="space-y-3">
                  {reqError && (
                    <div className="rounded-lg bg-red-950/60 border border-red-800/50 px-3 py-2.5 text-xs text-red-300" role="alert">
                      {reqError}
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={reqFullName}
                      onChange={(e) => setReqFullName(e.target.value)}
                      placeholder="e.g. Prof. Anjali Patil"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Institutional Email *</label>
                    <input
                      type="email"
                      required
                      value={reqEmail}
                      onChange={(e) => setReqEmail(e.target.value)}
                      placeholder="name@spit.ac.in"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Department *</label>
                      <select
                        value={reqDepartment}
                        onChange={(e) => setReqDepartment(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 truncate"
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Role *</label>
                      <select
                        value={reqRole}
                        onChange={(e) => setReqRole(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="asset_manager">Asset Manager</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Designation / Purpose</label>
                    <input
                      type="text"
                      value={reqDesignation}
                      onChange={(e) => setReqDesignation(e.target.value)}
                      placeholder="e.g. Lab In-Charge, Room 603"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                    />
                  </div>
                  <ShimmerButton
                    type="submit"
                    disabled={reqLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-1"
                  >
                    {reqLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Submit Request</span>
                      </>
                    )}
                  </ShimmerButton>
                </form>
              )}
            </div>
          )}

          <div className="border-t border-zinc-800/60 pt-3 text-center">
            <p className="text-[11px] text-zinc-600 flex items-center justify-center gap-1.5">
              <Lock className="h-3 w-3 text-zinc-500" />
              Secured by PostgreSQL Row Level Security
            </p>
          </div>
        </div>

        <p className="mt-8 text-[11px] text-zinc-600 text-center px-4">
          Sardar Patel Institute of Technology &middot; Mumbai 400058
        </p>
      </div>
    </div>
  );
}
