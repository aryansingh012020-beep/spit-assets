'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { TopNavbar } from '@/components/top-navbar';
import { SiteFooter } from '@/components/site-footer';
import { CommandPalette, useCommandPalette } from '@/components/command-palette';
import { ToastRoot } from '@/components/ui/toast';
import { Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface DashboardShellProps {
  children: React.ReactNode;
  profile: Profile | null;
  pendingCount?: number;
}

export function DashboardShell({ children, profile, pendingCount = 0 }: DashboardShellProps) {
  const router = useRouter();
  const { open, setOpen } = useCommandPalette();

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
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 relative">
        {/* Subtle Institutional Watermark */}
        <div
          className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden opacity-[0.035] dark:opacity-[0.045] select-none"
          aria-hidden="true"
        >
          <img
            src="/spit-logo-light.jpg"
            alt="SPIT Emblem"
            className="h-[520px] w-[520px] max-w-[70vw] object-contain grayscale dark:hidden"
          />
          <img
            src="/spit-logo-dark.png"
            alt="SPIT Emblem"
            className="h-[520px] w-[520px] max-w-[70vw] object-contain hidden dark:block"
          />
        </div>

        {/* Top Navigation Bar */}
        <TopNavbar
          profile={profile}
          pendingCount={pendingCount}
          onOpenCommandPalette={() => setOpen(true)}
          onSignOut={handleSignOut}
        />

        {/* Page Content Canvas */}
        <main className="relative z-10 flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full max-w-7xl mx-auto">
          {children}
        </main>

        {/* Site Footer with Built by Aryan Singh */}
        <SiteFooter />
      </div>

      {/* Command Palette (⌘K) */}
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </ToastRoot>
  );
}
