import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        default:     'bg-zinc-900 text-white hover:bg-zinc-800 focus-visible:ring-zinc-900',
        primary:     'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-600 shadow-sm',
        destructive: 'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-600 shadow-sm',
        outline:     'border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 focus-visible:ring-zinc-900',
        ghost:       'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-zinc-900',
        link:        'text-indigo-600 underline-offset-4 hover:underline focus-visible:ring-indigo-600 px-0 h-auto',
        success:     'bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-600 shadow-sm',
      },
      size: {
        sm:      'h-8 px-3 text-xs',
        default: 'h-9 px-4',
        lg:      'h-10 px-6',
        icon:    'h-9 w-9',
        'icon-sm': 'h-7 w-7',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
