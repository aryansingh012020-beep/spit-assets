'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Tag, Building2, Layers, DoorOpen,
  CheckSquare, ArrowRightLeft, History, Settings, Users, FileText,
  Upload, LogOut, User, ClipboardCheck,
  PanelLeftClose, PanelLeftOpen, PackagePlus,
} from 'lucide-react';
import { cn, getRoleLabel, getInitials } from '@/lib/utils';
import { UserRole, Profile } from '@/lib/types';
import { Badge } from './ui/badge';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  exact?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  profile: Profile | null;
  pendingCount?: number;
  onSignOut: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function buildNavSections(role: UserRole, pendingCount: number): NavSection[] {
  const sections: NavSection[] = [];

  sections.push({
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
    ],
  });

  sections.push({
    label: 'Assets',
    items: [
      { label: 'All Assets', href: '/inventory', icon: <Package className="h-4 w-4" />, exact: true },
      { label: 'Add Asset', href: '/inventory/add', icon: <PackagePlus className="h-4 w-4" />, exact: true },
      { label: 'Categories', href: '/inventory/categories', icon: <Tag className="h-4 w-4" />, exact: true },
    ],
  });

  if (role !== 'viewer') {
    sections.push({
      label: 'Operations',
      items: [
        { label: 'Approvals', href: '/approvals', icon: <CheckSquare className="h-4 w-4" />, badge: pendingCount > 0 ? pendingCount : undefined, exact: true },
        { label: 'Transfers', href: '/transfers', icon: <ArrowRightLeft className="h-4 w-4" />, exact: true },
        { label: 'History', href: '/history', icon: <History className="h-4 w-4" />, exact: true },
        { label: 'Stock Audit', href: '/audit', icon: <ClipboardCheck className="h-4 w-4" />, exact: true },
      ],
    });
  } else {
    sections.push({
      label: 'Operations',
      items: [
        { label: 'History', href: '/history', icon: <History className="h-4 w-4" />, exact: true },
        { label: 'Stock Audit', href: '/audit', icon: <ClipboardCheck className="h-4 w-4" />, exact: true },
      ],
    });
  }

  sections.push({
    label: 'Locations',
    items: [
      { label: 'Buildings', href: '/locations/buildings', icon: <Building2 className="h-4 w-4" />, exact: true },
      { label: 'Floors', href: '/locations/floors', icon: <Layers className="h-4 w-4" />, exact: true },
      { label: 'Rooms', href: '/locations/rooms', icon: <DoorOpen className="h-4 w-4" /> },
    ],
  });

  return sections;
}

function NavLink({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const isActive = item.exact
    ? pathname === item.href || (item.href !== '/inventory' && pathname.startsWith(item.href + '/'))
    : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        collapsed ? 'justify-center px-2' : '',
        isActive
          ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100'
      )}
    >
      {/* Active left border indicator */}
      {isActive && (
        <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
      )}

      <span
        className={cn(
          'shrink-0 transition-colors',
          isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400'
        )}
        aria-hidden="true"
      >
        {item.icon}
      </span>

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge !== undefined && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white tabular-nums">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </>
      )}

      {/* Badge dot in collapsed mode */}
      {collapsed && item.badge !== undefined && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" aria-label={`${item.badge} pending`} />
      )}
    </Link>
  );
}

export function Sidebar({ profile, pendingCount = 0, onSignOut, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const role = profile?.role ?? 'viewer';
  const sections = buildNavSections(role, pendingCount);

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-200 shrink-0',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* ── Logo / Brand ─────────────────────────────── */}
      <div className={cn(
        'flex items-center border-b border-zinc-100 dark:border-zinc-800',
        collapsed ? 'h-14 justify-center px-0' : 'h-14 gap-2.5 px-4'
      )}>
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 group">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 shadow-xs">
            <img src="/spit-logo-light.jpg" alt="SPIT" className="h-full w-full object-contain dark:hidden" />
            <img src="/spit-logo-dark.png" alt="SPIT" className="h-full w-full object-contain hidden dark:block" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">SPIT Assets</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate leading-tight">Asset Management</p>
            </div>
          )}
        </Link>

        {/* Collapse toggle — shown only when not collapsed */}
        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="ml-auto shrink-0 rounded-md p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Expand toggle — visible only when collapsed */}
      {collapsed && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-8 w-full items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="h-3.5 w-3.5" />
        </button>
      )}

      {/* ── Navigation ───────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2" aria-label="Main navigation">
        <ul className="space-y-4">
          {sections.map((section) => (
            <li key={section.label}>
              {/* Section label */}
              {!collapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 select-none">
                  {section.label}
                </p>
              )}
              {collapsed && (
                <div className="mb-1 flex justify-center">
                  <div className="h-px w-6 bg-zinc-200 dark:bg-zinc-800" />
                </div>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} pathname={pathname} collapsed={collapsed} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
