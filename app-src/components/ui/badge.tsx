import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors',
  {
    variants: {
      variant: {
        success:   'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 ring-emerald-600/20 dark:ring-emerald-500/30',
        warning:   'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 ring-amber-600/20 dark:ring-amber-500/30',
        danger:    'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 ring-red-600/20 dark:ring-red-500/30',
        info:      'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 ring-blue-600/20 dark:ring-blue-500/30',
        neutral:   'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 ring-zinc-500/20 dark:ring-zinc-500/30',
        secondary: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 ring-zinc-400/20 dark:ring-zinc-500/30',
        default:   'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 ring-zinc-600/20 dark:ring-zinc-500/30',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

const DOT_COLORS: Record<string, string> = {
  success:   'bg-emerald-500',
  warning:   'bg-amber-500',
  danger:    'bg-red-500',
  info:      'bg-blue-500',
  neutral:   'bg-zinc-400',
  secondary: 'bg-zinc-300',
  default:   'bg-zinc-400',
};

export function Badge({ className, variant = 'default', dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', DOT_COLORS[variant ?? 'default'])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
