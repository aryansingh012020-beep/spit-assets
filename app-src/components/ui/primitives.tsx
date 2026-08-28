import * as React from 'react';
import { cn } from '@/lib/utils';

// Card
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/90 shadow-xs backdrop-blur-xs transition-all duration-150',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6 pb-0', className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight tracking-tight', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-normal', className)} {...props} />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center p-6 pt-0 border-t border-zinc-100 dark:border-zinc-800/60 mt-4', className)} {...props} />
  );
}

// Input
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {label}
            {props.required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'block w-full rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/60 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100',
              'placeholder:text-zinc-400 dark:placeholder:text-zinc-600',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900',
              error
                ? 'border-red-300 dark:border-red-800 focus:border-red-400 focus:ring-red-400'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-zinc-500 dark:text-zinc-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// Textarea
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {label}
            {props.required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            'block w-full rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/60 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100',
            'placeholder:text-zinc-400 dark:placeholder:text-zinc-600 resize-y min-h-[85px]',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900',
            error
              ? 'border-red-300 dark:border-red-800 focus:ring-red-400'
              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700',
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// Select
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {label}
            {props.required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
          </label>
        )}
        <select
          id={inputId}
          ref={ref}
          className={cn(
            'block w-full rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/60 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900',
            'transition-all duration-150 cursor-pointer',
            error
              ? 'border-red-300 dark:border-red-800 focus:ring-red-400'
              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700',
            className
          )}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

// Skeleton
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80', className)}
      {...props}
    />
  );
}

// Separator
export function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <div
      className={cn(
        'shrink-0 bg-zinc-200/80 dark:bg-zinc-800',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className
      )}
      role="separator"
      aria-orientation={orientation}
      {...props}
    />
  );
}

// Empty State
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 p-4 text-zinc-400 dark:text-zinc-500 border border-zinc-200/60 dark:border-zinc-700/60">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// Stat Card
export interface StatCardProps {
  title: string;
  value: string | number;
  delta?: { value: number; label: string };
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({ title, value, delta, icon, trend }: StatCardProps) {
  return (
    <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all group">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">{title}</p>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tabular-nums tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {value}
            </p>
            {delta && (
              <p
                className={cn(
                  'mt-1.5 text-xs font-semibold flex items-center gap-1',
                  trend === 'up'   && 'text-emerald-600 dark:text-emerald-400',
                  trend === 'down' && 'text-red-600 dark:text-red-400',
                  trend === 'neutral' && 'text-zinc-500 dark:text-zinc-400'
                )}
              >
                <span>{delta.value > 0 ? '+' : ''}{delta.value}</span>
                <span className="font-normal text-zinc-400">{delta.label}</span>
              </p>
            )}
          </div>
          {icon && (
            <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 p-3 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 [&_svg]:h-5 [&_svg]:w-5 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
