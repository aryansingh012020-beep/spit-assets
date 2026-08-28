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
} from 'lucide-react';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const DEMO_EMAIL = 'demo@spit.ac.in';
const DEMO_PASS  = 'demo1234';

const QUICK_ACCOUNTS = [
  { label: 'Admin', email: 'admin@spit.ac.in', pass: 'Password@123', role: 'Approver' },
  { label: 'Dr Deepak Karia', email: 'deepak.karia@spit.ac.in', pass: 'admin@2026', role: 'Approver' },
];

export default function LoginPage() {
  const [email, setEmail]       = React.useState(IS_DEMO ? DEMO_EMAIL : '');
  const [password, setPassword] = React.useState(IS_DEMO ? DEMO_PASS  : '');
  const [showPw, setShowPw]     = React.useState(false);
  const [loading, setLoading]   = React.useState(false);
  const [error, setError]       = React.useState('');
  const router = useRouter();

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
                SPIT Asset Platform
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
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16 flex-1 flex items-center">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8 items-center w-full">
          
          {/* Left Column: Feature Highlights & Institutional Value Prop */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-3.5 py-1 text-xs font-semibold text-indigo-300 shadow-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                <span>NAAC A+ Accredited · Institutional Governance</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Complete asset visibility across every lab, floor, and facility.
              </h1>

              <p className="text-base text-zinc-400 max-w-2xl leading-relaxed">
                Centralized physical hardware tracking, multi-tier change request governance, annual NAAC stocktaking, and real-time inventory intelligence for Sardar Patel Institute of Technology.
              </p>
            </div>

            {/* 4 Feature Value Tiles (Asset Panda inspired) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-4 backdrop-blur-xs hover:border-zinc-700 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
                  <Layers className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-white">Hierarchical Campus Architecture</h2>
                <p className="text-xs text-zinc-400 mt-1 leading-normal">
                  9 vertical levels (Ground to 8th Floor) mapped to 125 classrooms and advanced laboratories.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-4 backdrop-blur-xs hover:border-zinc-700 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3">
                  <FileCheck className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-white">Multi-Tier Approval Governance</h2>
                <p className="text-xs text-zinc-400 mt-1 leading-normal">
                  Role-based segregation of duties enforcing atomic approvals for asset relocations and disposals.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-4 backdrop-blur-xs hover:border-zinc-700 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-3">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-white">Annual Stock Verification</h2>
                <p className="text-xs text-zinc-400 mt-1 leading-normal">
                  One-tap physical audits with automated generation of official NAAC & NBA compliance certificates.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-4 backdrop-blur-xs hover:border-zinc-700 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-white">AI Asset Concierge</h2>
                <p className="text-xs text-zinc-400 mt-1 leading-normal">
                  Gemini 3.6 Flash retrieval-augmented generation engine for instant natural language lookups and reports.
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-zinc-800/80">
              <div>
                <p className="text-2xl font-extrabold text-white">2,662+</p>
                <p className="text-xs text-zinc-400">Tracked Physical Units</p>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div>
                <p className="text-2xl font-extrabold text-white">125</p>
                <p className="text-xs text-zinc-400">Campus Rooms & Labs</p>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div>
                <p className="text-2xl font-extrabold text-white">9</p>
                <p className="text-xs text-zinc-400">Vertical Floors</p>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div>
                <p className="text-2xl font-extrabold text-emerald-400">100%</p>
                <p className="text-xs text-zinc-400">Audit Trail Integrity</p>
              </div>
            </div>
          </div>

          {/* Right Column: Portal Sign-In Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/85 p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-xl space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white tracking-tight">Institutional Sign In</h2>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Enter your official SPIT credentials to access your dashboard.
                </p>
              </div>

              {/* Quick Account Fill Selector */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Select Role to Autofill:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleQuickFill(acc)}
                      className="text-left rounded-xl border border-zinc-800 bg-zinc-950/70 p-2.5 hover:border-indigo-500/60 hover:bg-indigo-950/30 transition-all group"
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

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
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
                    className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-xs font-semibold text-zinc-300">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 pr-10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
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
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer pt-3"
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

              <div className="border-t border-zinc-800/80 pt-4 text-center">
                <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
                  <Lock className="h-3 w-3 text-emerald-400" /> Protected by PostgreSQL Row Level Security (RLS)
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="relative z-10 w-full border-t border-zinc-800/80 bg-zinc-950/80 py-4 text-center text-xs text-zinc-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>Sardar Patel Institute of Technology · Bhavan's Campus, Munshi Nagar, Andheri (W), Mumbai 400058</p>
          <p className="font-mono text-[11px] text-zinc-400">Institutional Asset Ledger</p>
        </div>
      </footer>
    </div>
  );
}
