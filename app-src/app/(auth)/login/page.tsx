'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Package,
  Eye,
  EyeOff,
  Loader2,
  Building2,
  Layers,
  ShieldCheck,
  Sparkles,
  ClipboardCheck,
  Lock,
  CheckCircle2,
  ArrowRight,
  DoorOpen,
  FileCheck,
  UserPlus,
  Send,
} from 'lucide-react';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const DEMO_EMAIL = 'demo@spit.ac.in';
const DEMO_PASS  = 'demo1234';

const QUICK_ACCOUNTS = [
  { label: 'Admin', email: 'admin@spit.ac.in', pass: 'Password@123', role: 'Approver' },
  { label: 'Dr Deepak Karia', email: 'deepak.karia@spit.ac.in', pass: 'admin@2026', role: 'Approver' },
];

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

export default function LoginPage() {
  const [activeTab, setActiveTab] = React.useState<'signin' | 'request'>('signin');
  
  // Sign In State
  const [email, setEmail]       = React.useState(IS_DEMO ? DEMO_EMAIL : '');
  const [password, setPassword] = React.useState(IS_DEMO ? DEMO_PASS  : '');
  const [showPw, setShowPw]     = React.useState(false);
  const [loading, setLoading]   = React.useState(false);
  const [error, setError]       = React.useState('');
  const router = useRouter();

  // Account Request State
  const [reqFullName, setReqFullName]     = React.useState('');
  const [reqEmail, setReqEmail]           = React.useState('');
  const [reqRole, setReqRole]             = React.useState('viewer');
  const [reqDepartment, setReqDepartment] = React.useState(DEPARTMENTS[0]);
  const [reqDesignation, setReqDesignation] = React.useState('');
  const [reqReason, setReqReason]         = React.useState('');
  const [reqLoading, setReqLoading]       = React.useState(false);
  const [reqSuccess, setReqSuccess]       = React.useState(false);
  const [reqError, setReqError]           = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Demo mode — accept any credentials matching demo account
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

    // Production — Supabase Auth
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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit account request.');
      }
      setReqSuccess(true);
    } catch (err: any) {
      setReqError(err.message || 'Error submitting request');
    } finally {
      setReqLoading(false);
    }
  }

  function handleQuickFill(acc: typeof QUICK_ACCOUNTS[0]) {
    setEmail(acc.email);
    setPassword(acc.pass);
    setError('');
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 text-white selection:bg-indigo-500 selection:text-white flex flex-col justify-between overflow-x-hidden font-sans">
      {/* ── Background Imagery & Lighting Effects ─────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none" aria-hidden="true">
        {/* SPIT Entrance Photo Atmosphere */}
        <img
          src="/spit-entrance.jpg"
          alt="SPIT Campus"
          className="h-full w-full object-cover object-center opacity-25 contrast-125 brightness-75 scale-105"
        />
        {/* Radial Ambient Gradients */}
        <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950 via-zinc-950/85 to-indigo-950/40" />
        <div className="absolute top-0 right-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[140px]" />
      </div>

      {/* ── Top Navigation / Brand Header ─────────────────────────── */}
      <header className="relative z-10 w-full border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-md shadow-black/40">
              <img src="/spit-logo-light.jpg" alt="SPIT Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                SPIT Asset Management
              </span>
              <p className="text-[11px] text-zinc-400 font-medium hidden sm:block">
                Sardar Patel Institute of Technology · Mumbai
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/50 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Institutional Catalog
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs text-zinc-300 font-mono">
              v2.4
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Hero Split Content ───────────────────────────────── */}
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-14 flex-1 flex items-center">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8 items-center w-full">
          
          {/* Left Column: Feature Highlights & Institutional Value Prop */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-3.5 py-1 text-xs font-semibold text-indigo-300 shadow-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                <span>NAAC A+ Accredited · Institutional Governance</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Complete asset visibility across every lab, floor, and facility.
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
                Centralized physical hardware tracking, multi-tier change request governance, annual NAAC stocktaking, and real-time inventory intelligence for Sardar Patel Institute of Technology.
              </p>
            </div>

            {/* 4 Feature Value Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 backdrop-blur-xs hover:border-zinc-700 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2.5">
                  <Layers className="h-4 w-4" />
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-white">Hierarchical Architecture</h2>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal">
                  9 floors (Ground to 8th Floor) mapped to 125 classrooms and advanced laboratories.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 backdrop-blur-xs hover:border-zinc-700 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2.5">
                  <FileCheck className="h-4 w-4" />
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-white">Multi-Tier Governance</h2>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal">
                  Role-based segregation of duties enforcing atomic approvals for relocations and disposals.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 backdrop-blur-xs hover:border-zinc-700 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-2.5">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-white">Stock Verification</h2>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal">
                  One-tap physical audits with automated generation of official NAAC compliance certificates.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 backdrop-blur-xs hover:border-zinc-700 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2.5">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-white">AI Asset Concierge</h2>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal">
                  Gemini 3.6 Flash retrieval-augmented generation engine for instant lookups and reports.
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex flex-wrap items-center gap-5 pt-2 border-t border-zinc-800/80">
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-white">2,662+</p>
                <p className="text-[11px] text-zinc-400">Tracked Units</p>
              </div>
              <div className="h-7 w-px bg-zinc-800" />
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-white">125</p>
                <p className="text-[11px] text-zinc-400">Rooms & Labs</p>
              </div>
              <div className="h-7 w-px bg-zinc-800" />
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-white">9</p>
                <p className="text-[11px] text-zinc-400">Campus Floors</p>
              </div>
              <div className="h-7 w-px bg-zinc-800" />
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-emerald-400">100%</p>
                <p className="text-[11px] text-zinc-400">Audit Trail</p>
              </div>
            </div>
          </div>

          {/* Right Column: Portal Card with Sign In / Request Access Tabs */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/85 p-6 sm:p-7 shadow-2xl shadow-black/80 backdrop-blur-xl space-y-5">
              
              {/* Tab Selector */}
              <div className="grid grid-cols-2 rounded-2xl bg-zinc-950 p-1 border border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => { setActiveTab('signin'); setError(''); }}
                  className={`rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'signin'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('request'); setReqError(''); setReqSuccess(false); }}
                  className={`rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'request'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Request Account
                </button>
              </div>

              {/* ── TAB: SIGN IN ───────────────────────────────────── */}
              {activeTab === 'signin' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Institutional Sign In</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Enter your official SPIT credentials to access the platform.
                    </p>
                  </div>

                  {/* Quick Account Fill Selector */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Quick Autofill for Verification:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {QUICK_ACCOUNTS.map((acc) => (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => handleQuickFill(acc)}
                          className="text-left rounded-xl border border-zinc-800 bg-zinc-950/70 p-2 hover:border-indigo-500/60 hover:bg-indigo-950/30 transition-all group cursor-pointer"
                        >
                          <p className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
                            {acc.label}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate">{acc.role}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-950/50 border border-red-800/60 p-3 text-xs text-red-300 animate-in fade-in" role="alert">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    <div className="space-y-1">
                      <label htmlFor="email" className="block text-xs font-semibold text-zinc-300">
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
                        className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="password" className="block text-xs font-semibold text-zinc-300">
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
                          className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 pr-10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
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

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer pt-2.5"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Authenticating…</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Dashboard</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ── TAB: REQUEST ACCOUNT ONBOARDING ────────────────── */}
              {activeTab === 'request' && (
                <div className="space-y-3.5">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Request Account Access</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Submit your details to SPIT Approvers for role authorization.
                    </p>
                  </div>

                  {reqSuccess ? (
                    <div className="rounded-2xl border border-emerald-800/80 bg-emerald-950/60 p-4 text-center space-y-2 animate-in fade-in">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                      <p className="text-sm font-bold text-white">Request Submitted!</p>
                      <p className="text-xs text-zinc-300 leading-normal">
                        Your account creation request has been routed to institutional Approvers (Dr. Deepak Karia / SPIT Admin). You will receive login access upon verification.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setActiveTab('signin'); setReqSuccess(false); }}
                        className="mt-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 underline"
                      >
                        Return to Sign In
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleAccountRequest} className="space-y-3">
                      {reqError && (
                        <div className="rounded-xl bg-red-950/50 border border-red-800/60 p-2.5 text-xs text-red-300" role="alert">
                          {reqError}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-zinc-300">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={reqFullName}
                          onChange={(e) => setReqFullName(e.target.value)}
                          placeholder="e.g. Prof. Anjali Patil"
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-zinc-300">
                          Institutional Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={reqEmail}
                          onChange={(e) => setReqEmail(e.target.value)}
                          placeholder="name@spit.ac.in"
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-semibold text-zinc-300">
                            Department *
                          </label>
                          <select
                            value={reqDepartment}
                            onChange={(e) => setReqDepartment(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-2 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate"
                          >
                            {DEPARTMENTS.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-semibold text-zinc-300">
                            Requested Role *
                          </label>
                          <select
                            value={reqRole}
                            onChange={(e) => setReqRole(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-2 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="viewer">Viewer (Catalog Access)</option>
                            <option value="asset_manager">Asset Manager (Propose Changes)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-zinc-300">
                          Designation / Purpose
                        </label>
                        <input
                          type="text"
                          value={reqDesignation}
                          onChange={(e) => setReqDesignation(e.target.value)}
                          placeholder="e.g. Lab In-Charge, Room 603"
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={reqLoading}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer pt-2.5"
                      >
                        {reqLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Submitting to Approvers…</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            <span>Send Onboarding Request</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}

              <div className="border-t border-zinc-800/80 pt-3 text-center">
                <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
                  <Lock className="h-3 w-3 text-emerald-400" /> Protected by PostgreSQL Row Level Security (RLS)
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="relative z-10 w-full border-t border-zinc-800/80 bg-zinc-950/80 py-3.5 text-center text-xs text-zinc-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>Sardar Patel Institute of Technology · Bhavan's Campus, Munshi Nagar, Andheri (W), Mumbai 400058</p>
          <p className="font-mono text-[11px] text-zinc-400">Institutional Asset Ledger</p>
        </div>
      </footer>
    </div>
  );
}
