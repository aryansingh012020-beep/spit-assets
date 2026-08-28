import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-tight ring-1 ring-inset transition-all duration-150',
  {
    variants: {
      variant: {
        success:   'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25 dark:ring-emerald-500/30',
        warning:   'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-amber-500/25 dark:ring-amber-500/30',
        danger:    'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-rose-500/25 dark:ring-rose-500/30',
        info:      'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-indigo-500/25 dark:ring-indigo-500/30',
        neutral:   'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 ring-zinc-500/20 dark:ring-zinc-700/60',
        secondary: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 ring-zinc-300 dark:ring-zinc-700',
        default:   'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 ring-zinc-300 dark:ring-zinc-700',
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
  danger:    'bg-rose-500',
  info:      'bg-indigo-500',
  neutral:   'bg-zinc-400',
  secondary: 'bg-zinc-400',
  default:   'bg-zinc-400',
};

export function Badge({ className, variant = 'default', dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full shrink-0', DOT_COLORS[variant ?? 'default'])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
