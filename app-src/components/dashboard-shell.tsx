'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { AppTopbar } from '@/components/app-topbar';
import { SiteFooter } from '@/components/site-footer';
import { AIAssistantDrawer } from '@/components/ai-assistant-drawer';
import { ToastRoot } from '@/components/ui/toast';
import { Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// LocalStorage key for sidebar collapsed state
const SIDEBAR_KEY = 'spit_sidebar_collapsed';

interface DashboardShellProps {
  children: React.ReactNode;
  profile: Profile | null;
  pendingCount?: number;
}

export function DashboardShell({ children, profile, pendingCount = 0 }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isFloorsPage = pathname.startsWith('/locations/floors');

  // Sidebar collapsed state — persisted to localStorage
  const [collapsed, setCollapsed] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SIDEBAR_KEY) === 'true';
  });

  // Mobile sidebar open state
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleToggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  }

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
      <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

        {/* ── Mobile backdrop ──────────────────────────── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Sidebar ──────────────────────────────────── */}
        {/* Desktop: always visible, collapsible */}
        <div className="hidden lg:flex h-full">
          <Sidebar
            profile={profile}
            pendingCount={pendingCount}
            onSignOut={handleSignOut}
            collapsed={collapsed}
            onToggleCollapse={handleToggleCollapse}
          />
        </div>

        {/* Mobile: slide-in drawer */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <Sidebar
            profile={profile}
            pendingCount={pendingCount}
            onSignOut={handleSignOut}
            collapsed={false}
            onToggleCollapse={() => setMobileOpen(false)}
          />
        </div>

        {/* ── Main area ────────────────────────────────── */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">

          {/* SPIT Watermark — page background */}
          {isFloorsPage ? (
            <div
              className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden opacity-25 dark:opacity-30 select-none"
              aria-hidden="true"
            >
              <img
                src="/spit-entrance.jpg"
                alt=""
                className="h-full w-full object-cover object-center contrast-125 brightness-90 dark:brightness-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 via-zinc-50/80 to-zinc-50/60 dark:from-zinc-950 dark:via-zinc-950/85 dark:to-zinc-950/70" />
            </div>
          ) : (
            <div
              className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden opacity-[0.06] dark:opacity-[0.09] select-none"
              aria-hidden="true"
            >
              <img
                src="/spit-logo-light.jpg"
                alt=""
                width={520}
                height={520}
                className="w-[min(520px,60vw,60vh)] aspect-square object-contain grayscale dark:hidden shrink-0"
              />
              <img
                src="/spit-logo-dark.png"
                alt=""
                width={520}
                height={520}
                className="w-[min(520px,60vw,60vh)] aspect-square object-contain hidden dark:block shrink-0"
              />
            </div>
          )}

          {/* Slim top bar */}
          <AppTopbar
            profile={profile}
            pendingCount={pendingCount}
            onMobileMenuToggle={() => setMobileOpen(true)}
            onSignOut={handleSignOut}
          />

          {/* Page content */}
          <main
            id="main-content"
            className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6"
          >
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>

          {/* Footer */}
          <SiteFooter />
        </div>

        {/* Floating AI Assistant */}
        <AIAssistantDrawer />
      </div>
    </ToastRoot>
  );
}
