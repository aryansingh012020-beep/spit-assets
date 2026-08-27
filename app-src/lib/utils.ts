import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AssetStatus, UserRole } from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export const STATUS_CONFIG: Record<
  AssetStatus,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'secondary' }
> = {
  active:            { label: 'Active',            variant: 'success'   },
  under_maintenance: { label: 'Maintenance',        variant: 'warning'   },
  missing:           { label: 'Missing',            variant: 'danger'    },
  damaged:           { label: 'Damaged',            variant: 'warning'   },
  transferred:       { label: 'Transferred',        variant: 'info'      },
  retired:           { label: 'Retired',            variant: 'neutral'   },
  disposed:          { label: 'Disposed',           variant: 'secondary' },
};

export const ROLE_CONFIG: Record<UserRole, { label: string; description: string }> = {
  viewer:        { label: 'Viewer',        description: 'Read-only access' },
  asset_manager: { label: 'Asset Manager', description: 'Submit change requests' },
  approver:      { label: 'Approver',      description: 'Full administrative access' },
};

export const ROOM_TYPE_LABELS: Record<string, string> = {
  classroom:       'Classroom',
  lab:             'Laboratory',
  office:          'Office',
  faculty_room:    'Faculty Room',
  cabin:           'Cabin',
  library:         'Library',
  canteen:         'Canteen',
  seminar_hall:    'Seminar Hall',
  conference_room: 'Conference Room',
  server_room:     'Server Room',
  reception:       'Reception',
  passage:         'Passage',
  storage:         'Storage',
  general:         'General',
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_CONFIG[role]?.label ?? role;
}

export function canUserApprove(role: UserRole): boolean {
  return role === 'approver';
}

export function canUserSubmitRequests(role: UserRole): boolean {
  return role === 'asset_manager' || role === 'approver';
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

export function buildLocationString(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(' › ');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
