'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Moon, Sun, Menu, Search, Bell, X,
  Package, Building2, DoorOpen, Loader2,
  Users, FileText, Upload,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Profile } from '@/lib/types';
import { cn } from '@/lib/utils';

// ── Page title map ───────────────────────────────────────────
function getPageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard';
  if (pathname === '/inventory/add') return 'Add Assets';
  if (pathname === '/inventory/categories') return 'Asset Categories';
  if (pathname === '/inventory') return 'Asset Inventory';
  if (pathname.startsWith('/inventory/')) return 'Asset Details';
  if (pathname === '/locations/buildings') return 'Buildings';
  if (pathname === '/locations/floors') return 'Floors';
  if (pathname === '/locations/rooms') return 'Rooms';
  if (pathname.startsWith('/locations/rooms/')) return 'Room Details';
  if (pathname === '/approvals') return 'Approvals';
  if (pathname === '/transfers') return 'Transfers';
  if (pathname === '/history') return 'History';
  if (pathname === '/audit') return 'Stock Audit';
  if (pathname === '/profile') return 'My Profile';
  if (pathname === '/admin/users') return 'User Directory';
  if (pathname === '/admin/audit') return 'System Audit Log';
  if (pathname === '/admin/import') return 'Bulk Import';
  return 'SPIT Asset Management';
}

// ── Search result type (matches /api/search) ─────────────────
interface SearchResult {
  id: string;
  type: 'asset' | 'room' | 'building';
  title: string;
  subtitle: string;
  href: string;
  status?: string;
}

function SearchIcon({ type }: { type: SearchResult['type'] }) {
  if (type === 'asset') return <Package className="h-3.5 w-3.5 text-indigo-500 shrink-0" aria-hidden="true" />;
  if (type === 'room') return <DoorOpen className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-hidden="true" />;
  return <Building2 className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />;
}

// ── Global Search Bar ─────────────────────────────────────────
function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Keyboard shortcut: / to focus
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Click outside to close
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`);
        const json = await res.json();
        setResults(json.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function handleSelect(href: string) {
    setOpen(false);
    setQuery('');
    router.push(href);
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm hidden sm:block">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
          {loading
            ? <Loader2 className="h-3.5 w-3.5 text-zinc-400 animate-spin" aria-hidden="true" />
            : <Search className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
          }
        </div>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.trim() && results.length > 0 && setOpen(true)}
          placeholder="Search assets, rooms…"
          spellCheck={false}
          autoComplete="off"
          aria-label="Search assets and rooms"
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 pl-8 pr-8 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
            className="absolute inset-y-0 right-2 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
        {/* Keyboard hint */}
        {!query && (
          <div className="pointer-events-none absolute inset-y-0 right-2.5 hidden sm:flex items-center">
            <kbd className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono border border-zinc-200 dark:border-zinc-700 rounded px-1 py-0.5">/</kbd>
          </div>
        )}
      </div>

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
          <ul role="listbox" aria-label="Search results">
            {results.map(r => (
              <li key={`${r.type}-${r.id}`} role="option" aria-selected="false">
                <button
                  type="button"
                  onClick={() => handleSelect(r.href)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group"
                >
                  <SearchIcon type={r.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{r.title}</p>
                    {r.subtitle && (
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{r.subtitle}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 capitalize shrink-0 hidden group-hover:block">
                    {r.type}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-zinc-100 dark:border-zinc-800 px-3 py-1.5 text-[10px] text-zinc-400 dark:text-zinc-600">
            Press <kbd className="font-mono border border-zinc-200 dark:border-zinc-700 rounded px-1">Esc</kbd> to close
          </div>
        </div>
      )}

      {open && query.trim() && results.length === 0 && !loading && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg px-4 py-3 text-sm text-zinc-400 dark:text-zinc-500 text-center">
          No results for "<span className="font-medium text-zinc-600 dark:text-zinc-300">{query}</span>"
        </div>
      )}
    </div>
  );
}

// ── Main Topbar ───────────────────────────────────────────────
interface AppTopbarProps {
  profile: Profile | null;
  pendingCount?: number;
  onMobileMenuToggle: () => void;
}

export function AppTopbar({ profile, pendingCount = 0, onMobileMenuToggle }: AppTopbarProps) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm px-4 sm:px-5">

      {/* Mobile sidebar toggle */}
      <button
        type="button"
        onClick={onMobileMenuToggle}
        className="lg:hidden flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Page title (desktop) */}
      <h1 className="hidden lg:block text-sm font-semibold text-zinc-700 dark:text-zinc-300 shrink-0 min-w-0 truncate max-w-[160px]">
        {title}
      </h1>

      {/* Page title (mobile only — takes flex-1) */}
      <h1 className="lg:hidden flex-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
        {title}
      </h1>

      {/* ── Global Search (desktop) ── */}
      <GlobalSearch />

      {/* ── Right actions ── */}
      <div className="flex items-center gap-1 ml-auto lg:ml-0">

        {/* Admin toggles — approvers only */}
        {profile?.role === 'approver' && (
          <div className="hidden sm:flex items-center border-r border-zinc-200 dark:border-zinc-800 pr-2 mr-1">
            <div className="inline-flex p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60">
              <Link
                href="/admin/users"
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all",
                  pathname.startsWith('/admin/users')
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm font-semibold"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-700/40"
                )}
                title="User Management"
                aria-label="User management"
              >
                <Users className="h-3.5 w-3.5 text-indigo-500" />
                <span className="hidden md:inline">Users</span>
              </Link>
              <Link
                href="/admin/audit"
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all",
                  pathname.startsWith('/admin/audit')
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm font-semibold"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-700/40"
                )}
                title="System Audit Log"
                aria-label="System audit log"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-500" />
                <span className="hidden md:inline">Audit Log</span>
              </Link>
              <Link
                href="/admin/import"
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all",
                  pathname.startsWith('/admin/import')
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm font-semibold"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-700/40"
                )}
                title="Bulk Import Assets"
                aria-label="Bulk import assets"
              >
                <Upload className="h-3.5 w-3.5 text-amber-500" />
                <span className="hidden md:inline">Import</span>
              </Link>
            </div>
          </div>
        )}

        {/* Approvals bell */}
        <Link
          href="/approvals"
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label={pendingCount > 0 ? `${pendingCount} pending approvals` : 'Approvals'}
          title="Approvals"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {pendingCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-900" aria-hidden="true" />
          )}
        </Link>

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark'
            ? <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
            : <Moon className="h-4 w-4 text-indigo-500" aria-hidden="true" />
          }
        </button>
      </div>
    </header>
  );
}
