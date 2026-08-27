'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Tag,
  Building2,
  Layers,
  DoorOpen,
  CheckSquare,
  ArrowRightLeft,
  History,
  Settings,
  Users,
  FileText,
  Upload,
  ChevronDown,
  LogOut,
  User,
  Search,
  Moon,
  Sun,
  Menu,
  X,
  Shield,
  ClipboardCheck,
} from 'lucide-react';
import { cn, getRoleLabel, getInitials } from '@/lib/utils';
import { UserRole, Profile } from '@/lib/types';
import { Badge } from './ui/badge';
import { useTheme } from '@/components/theme-provider';

interface TopNavbarProps {
  profile: Profile | null;
  pendingCount?: number;
  onOpenCommandPalette: () => void;
  onSignOut: () => void;
}

export function TopNavbar({
  profile,
  pendingCount = 0,
  onOpenCommandPalette,
  onSignOut,
}: TopNavbarProps) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [locationsOpen, setLocationsOpen] = React.useState(false);
  const [assetsOpen, setAssetsOpen] = React.useState(false);
  const [operationsOpen, setOperationsOpen] = React.useState(false);
  const [adminOpen, setAdminOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const role = profile?.role ?? 'viewer';

  // Close menus on path change
  React.useEffect(() => {
    setMobileMenuOpen(false);
    setLocationsOpen(false);
    setAssetsOpen(false);
    setOperationsOpen(false);
    setAdminOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const isAssetsActive = pathname.startsWith('/inventory');
  const isLocationsActive = pathname.startsWith('/locations');
  const isOperationsActive = pathname === '/approvals' || pathname === '/transfers';
  const isAdminActive = pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        {/* ── Brand / Logo ────────────────────────────────────────── */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 p-1 shadow-xs group-hover:border-indigo-400 dark:group-hover:border-indigo-600 transition-colors">
              <img src="/spit-logo-light.jpg" alt="SPIT Logo" className="h-full w-full object-contain dark:hidden" />
              <img src="/spit-logo-dark.png" alt="SPIT Logo" className="h-full w-full object-contain hidden dark:block" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                SPIT Assets
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium -mt-0.5 hidden sm:inline">
                Sardar Patel Institute
              </span>
            </div>
          </Link>
        </div>

        {/* ── Desktop Navigation Links ────────────────────────────── */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
              pathname === '/dashboard'
                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>

          {/* Assets Dropdown */}
          <div className="relative" onMouseLeave={() => setAssetsOpen(false)}>
            <button
              onClick={() => setAssetsOpen(!assetsOpen)}
              onMouseEnter={() => setAssetsOpen(true)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
                isAssetsActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              <Package className="h-4 w-4" />
              <span>Assets</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" />
            </button>

            {assetsOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-52 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-xl shadow-zinc-900/10 animate-in fade-in slide-in-from-top-1 z-50">
                <Link
                  href="/inventory"
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname === '/inventory'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  )}
                >
                  <Package className="h-4 w-4 text-indigo-500" />
                  <span>All Catalog Assets</span>
                </Link>
                <Link
                  href="/inventory/categories"
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname === '/inventory/categories'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  )}
                >
                  <Tag className="h-4 w-4 text-indigo-500" />
                  <span>Categories Registry</span>
                </Link>
              </div>
            )}
          </div>

          {/* Locations Dropdown */}
          <div className="relative" onMouseLeave={() => setLocationsOpen(false)}>
            <button
              onClick={() => setLocationsOpen(!locationsOpen)}
              onMouseEnter={() => setLocationsOpen(true)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
                isLocationsActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              <Building2 className="h-4 w-4" />
              <span>Locations</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" />
            </button>

            {locationsOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-52 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-xl shadow-zinc-900/10 animate-in fade-in slide-in-from-top-1 z-50">
                <Link
                  href="/locations/buildings"
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname === '/locations/buildings'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  )}
                >
                  <Building2 className="h-4 w-4 text-indigo-500" />
                  <span>Campus Buildings</span>
                </Link>
                <Link
                  href="/locations/floors"
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname === '/locations/floors'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  )}
                >
                  <Layers className="h-4 w-4 text-indigo-500" />
                  <span>Vertical Floors</span>
                </Link>
                <Link
                  href="/locations/rooms"
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname === '/locations/rooms'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  )}
                >
                  <DoorOpen className="h-4 w-4 text-indigo-500" />
                  <span>Campus Rooms</span>
                </Link>
              </div>
            )}
          </div>

          {/* Operations Dropdown (Approvals & Transfers merged) */}
          {role !== 'viewer' && (
            <div className="relative" onMouseLeave={() => setOperationsOpen(false)}>
              <button
                onClick={() => setOperationsOpen(!operationsOpen)}
                onMouseEnter={() => setOperationsOpen(true)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
                  isOperationsActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span>Operations</span>
                {pendingCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white px-1.5">
                    {pendingCount}
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" />
              </button>

              {operationsOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-56 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-xl shadow-zinc-900/10 animate-in fade-in slide-in-from-top-1 z-50">
                  <Link
                    href="/approvals"
                    className={cn(
                      'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      pathname === '/approvals'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckSquare className="h-4 w-4 text-indigo-500" />
                      <span>Approval Queue</span>
                    </div>
                    {pendingCount > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white px-1">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/transfers"
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      pathname === '/transfers'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    )}
                  >
                    <ArrowRightLeft className="h-4 w-4 text-indigo-500" />
                    <span>Asset Transfers</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* History */}
          <Link
            href="/history"
            className={cn(
              'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
              pathname === '/history'
                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            <History className="h-4 w-4" />
            <span>History</span>
          </Link>

          {/* Stocktake & Audit Mode */}
          <Link
            href="/audit"
            className={cn(
              'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
              pathname === '/audit'
                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            <ClipboardCheck className="h-4 w-4 text-indigo-500" />
            <span>Stock Audit</span>
          </Link>

          {/* Administration Dropdown (Approvers only) */}
          {role === 'approver' && (
            <div className="relative" onMouseLeave={() => setAdminOpen(false)}>
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                onMouseEnter={() => setAdminOpen(true)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
                  isAdminActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                <Settings className="h-4 w-4" />
                <span>Admin</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" />
              </button>

              {adminOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-xl shadow-zinc-900/10 animate-in fade-in slide-in-from-top-1 z-50">
                  <Link
                    href="/admin/users"
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      pathname === '/admin/users'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    )}
                  >
                    <Users className="h-4 w-4 text-indigo-500" />
                    <span>User Directory</span>
                  </Link>
                  <Link
                    href="/admin/audit"
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      pathname === '/admin/audit'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    )}
                  >
                    <FileText className="h-4 w-4 text-indigo-500" />
                    <span>System Audit Trail</span>
                  </Link>
                  <Link
                    href="/admin/import"
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      pathname === '/admin/import'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    )}
                  >
                    <Upload className="h-4 w-4 text-indigo-500" />
                    <span>Bulk Excel Ingest</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* ── Right Actions (Theme, Profile) ──────────────────────── */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Theme switcher */}
          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 shadow-2xs transition-all hover:scale-105 active:scale-95"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400 animate-in spin-in-90" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-600 animate-in spin-in-90" />
            )}
          </button>

          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />

          {/* User Profile Menu */}
          <div className="relative" onMouseLeave={() => setUserMenuOpen(false)}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 rounded-xl p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold shadow-xs group-hover:ring-2 group-hover:ring-indigo-500 transition-all">
                {getInitials(profile?.full_name ?? 'User')}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                  {profile?.full_name ?? 'User'}
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 capitalize leading-tight">
                  {getRoleLabel(role)}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400 hidden sm:block" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-xl shadow-zinc-900/10 animate-in fade-in slide-in-from-top-1 z-50">
                <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    {profile?.full_name ?? 'User Profile'}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 capitalize">
                    {getRoleLabel(role)} · {profile?.department ?? 'SPIT'}
                  </p>
                </div>

                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <User className="h-4 w-4 text-indigo-500" />
                  <span>My Profile & Ledger</span>
                </Link>

                <button
                  onClick={toggle}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
                    <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
                  </span>
                  <span className="text-xs font-mono text-zinc-400 uppercase">{theme}</span>
                </button>

                <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                <button
                  onClick={onSignOut}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Navigation Drawer ──────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4 space-y-3 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            <Link
              href="/dashboard"
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg',
                pathname === '/dashboard' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-bold' : 'text-zinc-700 dark:text-zinc-300'
              )}
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>

            <Link
              href="/inventory"
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg',
                pathname === '/inventory' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-bold' : 'text-zinc-700 dark:text-zinc-300'
              )}
            >
              <Package className="h-4 w-4" /> Assets
            </Link>

            <Link
              href="/locations/buildings"
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg',
                pathname.startsWith('/locations') ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-bold' : 'text-zinc-700 dark:text-zinc-300'
              )}
            >
              <Building2 className="h-4 w-4" /> Locations
            </Link>

            {role !== 'viewer' && (
              <Link
                href="/approvals"
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg',
                  pathname === '/approvals' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-bold' : 'text-zinc-700 dark:text-zinc-300'
                )}
              >
                <CheckSquare className="h-4 w-4" /> Approvals
              </Link>
            )}

            {role !== 'viewer' && (
              <Link
                href="/transfers"
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg',
                  pathname === '/transfers' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-bold' : 'text-zinc-700 dark:text-zinc-300'
                )}
              >
                <ArrowRightLeft className="h-4 w-4" /> Transfers
              </Link>
            )}

            <Link
              href="/history"
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg',
                pathname === '/history' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-bold' : 'text-zinc-700 dark:text-zinc-300'
              )}
            >
              <History className="h-4 w-4" /> History
            </Link>

            <Link
              href="/audit"
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg',
                pathname === '/audit' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-bold' : 'text-zinc-700 dark:text-zinc-300'
              )}
            >
              <ClipboardCheck className="h-4 w-4" /> Stock Audit
            </Link>

            <Link
              href="/profile"
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg',
                pathname === '/profile' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-bold' : 'text-zinc-700 dark:text-zinc-300'
              )}
            >
              <User className="h-4 w-4" /> My Profile
            </Link>

            {role === 'approver' && (
              <Link
                href="/admin/users"
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg',
                  pathname.startsWith('/admin') ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-bold' : 'text-zinc-700 dark:text-zinc-300'
                )}
              >
                <Settings className="h-4 w-4" /> Admin
              </Link>
            )}

            <button
              onClick={toggle}
              className="flex items-center gap-2 p-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 w-full text-left"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
              <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
