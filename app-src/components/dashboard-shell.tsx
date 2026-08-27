'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Moon, Sun } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { CommandPalette, useCommandPalette } from '@/components/command-palette';
import { ToastRoot } from '@/components/ui/toast';
import { Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/theme-provider';

interface DashboardShellProps {
  children: React.ReactNode;
  profile: Profile | null;
  pendingCount?: number;
}

export function DashboardShell({ children, profile, pendingCount = 0 }: DashboardShellProps) {
  const router = useRouter();
  const { open, setOpen } = useCommandPalette();
  const { theme, toggle } = useTheme();

  async function handleSignOut() {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      document.cookie = 'demo_session=; path=/; max-age=0';
      router.push('/login');
      router.refresh();
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <ToastRoot>
      <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        {/* Sidebar */}
        <Sidebar
          profile={profile}
          pendingCount={pendingCount}
          onSignOut={handleSignOut}
        />

        {/* Main content */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Subtle Institutional Watermark */}
          <div 
            className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden opacity-[0.04] dark:opacity-[0.05] select-none"
            aria-hidden="true"
          >
            <img
              src="/spit-logo-light.jpg"
              alt="SPIT Emblem"
              className="h-[480px] w-[480px] max-w-[70vw] object-contain grayscale dark:hidden"
            />
            <img
              src="/spit-logo-dark.png"
              alt="SPIT Emblem"
              className="h-[480px] w-[480px] max-w-[70vw] object-contain hidden dark:block"
            />
          </div>

          {/* Top bar */}
          <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm px-6">
            {/* Search / command palette trigger */}
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors w-56"
              aria-label="Open command palette (⌘K)"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1 text-left text-xs">Search assets…</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400 dark:text-zinc-400">
                <span>⌘</span>K
              </kbd>
            </button>

            <div className="flex items-center gap-3">
              {/* Dark mode toggle */}
              <button
                onClick={toggle}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                {theme === 'dark'
                  ? <Sun className="h-3.5 w-3.5" />
                  : <Moon className="h-3.5 w-3.5" />}
              </button>

              <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-700" />

              <div className="text-right">
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{profile?.full_name ?? 'User'}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 capitalize">{profile?.role?.replace('_', ' ')}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                {(profile?.full_name ?? 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="relative z-10 flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Command palette */}
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </ToastRoot>
  );
}
