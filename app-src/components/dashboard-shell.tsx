'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { TopNavbar } from '@/components/top-navbar';
import { SiteFooter } from '@/components/site-footer';
import { AIAssistantDrawer } from '@/components/ai-assistant-drawer';
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
        {/* Prominent Institutional Watermark */}
        <div
          className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center p-6 overflow-hidden opacity-[0.09] dark:opacity-[0.12] select-none"
          aria-hidden="true"
        >
          <img
            src="/spit-logo-light.jpg"
            alt="SPIT Emblem"
            width={572}
            height={572}
            className="w-[min(620px,75vw,75vh)] h-[min(620px,75vw,75vh)] aspect-square object-contain grayscale contrast-125 dark:hidden shrink-0"
          />
          <img
            src="/spit-logo-dark.png"
            alt="SPIT Emblem"
            width={572}
            height={572}
            className="w-[min(620px,75vw,75vh)] h-[min(620px,75vw,75vh)] aspect-square object-contain hidden dark:block shrink-0"
          />
        </div>

        {/* Top Navigation Bar */}
        <TopNavbar
          profile={profile}
          pendingCount={pendingCount}
          onSignOut={handleSignOut}
        />

        {/* Page Content Canvas */}
        <main className="relative z-10 flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full max-w-7xl mx-auto">
          {children}
        </main>

        {/* Site Footer with Built by Aryan Singh */}
        <SiteFooter />

        {/* Floating SPIT AI Assistant */}
        <AIAssistantDrawer />
      </div>
    </ToastRoot>
  );
}
