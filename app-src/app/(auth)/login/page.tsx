'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Package, Eye, EyeOff, Loader2, FlaskConical } from 'lucide-react';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const DEMO_EMAIL = 'demo@spit.ac.in';
const DEMO_PASS  = 'demo1234';

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
        // Set demo session cookie
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
      setError('Invalid email or password. Please try again.');
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-zinc-50 to-indigo-50 flex items-center justify-center p-4 overflow-hidden">
      {/* Background Watermark */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-[0.05] select-none"
        aria-hidden="true"
      >
        <img
          src="/spit-logo-light.jpg"
          alt="SPIT Emblem"
          className="h-[520px] w-[520px] max-w-[85vw] object-contain grayscale"
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-md border border-zinc-200/80 p-2 mb-4">
            <img src="/spit-logo-light.jpg" alt="SPIT Emblem" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Asset Manager</h1>
          <p className="text-sm text-zinc-500 mt-1">Sardar Patel Institute of Technology</p>
        </div>

        {/* Demo banner */}
        {IS_DEMO && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <FlaskConical className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Demo Mode</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Credentials pre-filled — just click <strong>Sign in</strong>
              </p>
            </div>
          </div>
        )}

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
          <h2 className="text-lg font-semibold text-zinc-900 mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@spit.ac.in"
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1.5">
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
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        {IS_DEMO ? (
          <p className="text-center text-xs text-zinc-400 mt-6">
            🔒 Demo mode — no data is saved or sent anywhere
          </p>
        ) : (
          <p className="text-center text-xs text-zinc-400 mt-6">
            Contact your administrator to get access
          </p>
        )}
      </div>
    </div>
  );
}
