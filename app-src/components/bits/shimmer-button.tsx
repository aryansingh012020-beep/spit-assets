'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  shimmerColor?: string;
  className?: string;
}

export function ShimmerButton({
  children,
  className,
  shimmerColor = 'rgba(255, 255, 255, 0.2)',
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      className={cn(
        'relative overflow-hidden group transition-all active:scale-[0.98]',
        className
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"
        style={{
          background: `linear-gradient(90deg, transparent, ${shimmerColor}, transparent)`,
        }}
        aria-hidden
      />
      {children}
    </button>
  );
}
