'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Tag, Building2, Layers, DoorOpen,
  CheckSquare, ArrowRightLeft, History, Settings, Users, FileText,
  Upload, ChevronDown, ChevronRight, LogOut, User
} from 'lucide-react';
import { cn, getRoleLabel, getInitials } from '@/lib/utils';
import { UserRole, Profile } from '@/lib/types';
import { Badge } from './ui/badge';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  roles?: UserRole[];
  children?: Omit<NavItem, 'children'>[];
}

interface SidebarProps {
  profile: Profile | null;
  pendingCount?: number;
  onSignOut: () => void;
}

function buildNavItems(role: UserRole, pendingCount: number): NavItem[] {
  return [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      label: 'Assets',
      href: '/inventory',
      icon: <Package className="h-4 w-4" />,
      children: [
        { label: 'All Assets', href: '/inventory', icon: <Package className="h-3.5 w-3.5" /> },
        { label: 'Categories', href: '/inventory/categories', icon: <Tag className="h-3.5 w-3.5" /> },
      ],
    },
    {
      label: 'Locations',
      href: '/locations',
      icon: <Building2 className="h-4 w-4" />,
      children: [
        { label: 'Buildings', href: '/locations/buildings', icon: <Building2 className="h-3.5 w-3.5" /> },
        { label: 'Floors', href: '/locations/floors', icon: <Layers className="h-3.5 w-3.5" /> },
        { label: 'Rooms', href: '/locations/rooms', icon: <DoorOpen className="h-3.5 w-3.5" /> },
      ],
    },
    ...(role !== 'viewer'
      ? [
          {
            label: 'Approvals',
            href: '/approvals',
            icon: <CheckSquare className="h-4 w-4" />,
            badge: pendingCount > 0 ? pendingCount : undefined,
          },
          {
            label: 'Transfers',
            href: '/transfers',
            icon: <ArrowRightLeft className="h-4 w-4" />,
          },
        ]
      : []),
    {
      label: 'History',
      href: '/history',
      icon: <History className="h-4 w-4" />,
    },
    {
      label: 'My Profile',
      href: '/profile',
      icon: <User className="h-4 w-4" />,
    },
    ...(role === 'approver'
      ? [
          {
            label: 'Administration',
            href: '/admin',
            icon: <Settings className="h-4 w-4" />,
            children: [
              { label: 'Users', href: '/admin/users', icon: <Users className="h-3.5 w-3.5" /> },
              { label: 'Audit Log', href: '/admin/audit', icon: <FileText className="h-3.5 w-3.5" /> },
              { label: 'Import', href: '/admin/import', icon: <Upload className="h-3.5 w-3.5" /> },
            ],
          },
        ]
      : []),
  ];
}

function NavGroup({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = hasChildren && (isActive || item.children!.some(c => pathname.startsWith(c.href)));

  return (
    <li>
      {hasChildren ? (
        <div>
          <Link
            href={item.href}
            className={cn(
              'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            <span className={cn('shrink-0', isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-300')}>
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <Badge variant="danger" className="text-[10px] h-4 min-w-[16px] flex items-center justify-center px-1">
                {item.badge > 99 ? '99+' : item.badge}
              </Badge>
            )}
            {isExpanded
              ? <ChevronDown className="h-3 w-3 text-zinc-400 dark:text-zinc-600" />
              : <ChevronRight className="h-3 w-3 text-zinc-400 dark:text-zinc-600" />
            }
          </Link>
          {isExpanded && (
            <ul className="mt-0.5 ml-4 space-y-0.5 border-l border-zinc-200 dark:border-zinc-700 pl-3">
              {item.children!.map((child) => {
                const childActive = pathname === child.href;
                return (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                        childActive
                          ? 'text-indigo-700 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-950/60'
                          : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      )}
                    >
                      <span className={childActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-600'}>
                        {child.icon}
                      </span>
                      {child.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <Link
          href={item.href}
          className={cn(
            'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
          )}
        >
          <span className={cn('shrink-0', isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-300')}>
            {item.icon}
          </span>
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <Badge variant="danger" className="text-[10px] h-4 min-w-[16px] flex items-center justify-center px-1">
              {item.badge > 99 ? '99+' : item.badge}
            </Badge>
          )}
        </Link>
      )}
    </li>
  );
}

export function Sidebar({ profile, pendingCount = 0, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const role = profile?.role ?? 'viewer';
  const navItems = buildNavItems(role, pendingCount);

  return (
    <aside className="flex h-full w-60 flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 p-1 shadow-sm">
          <img src="/spit-logo-light.jpg" alt="SPIT Logo" className="h-full w-full object-contain dark:hidden" />
          <img src="/spit-logo-dark.png" alt="SPIT Logo" className="h-full w-full object-contain hidden dark:block" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">SPIT Asset Manager</p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">Sardar Patel Institute</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <p className="px-3 mb-2 text-[10px] font-semibold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">
          Navigation
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <NavGroup key={item.href} item={item} pathname={pathname} />
          ))}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 p-2.5">
        <div className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
          <Link
            href="/profile"
            className="flex items-center gap-2.5 min-w-0 flex-1 group"
            title="My Profile & Settings"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-xs font-semibold text-indigo-700 dark:text-indigo-300 group-hover:ring-2 group-hover:ring-indigo-500 transition-all">
              {getInitials(profile?.full_name ?? profile?.id?.slice(0, 6) ?? 'U')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {profile?.full_name ?? 'User'}
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate capitalize">
                {getRoleLabel(role)}
              </p>
            </div>
          </Link>
          <button
            onClick={onSignOut}
            className="shrink-0 rounded-md p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
