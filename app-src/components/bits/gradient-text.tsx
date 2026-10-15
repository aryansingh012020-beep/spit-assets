import { ReactNode } from 'react';

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  /**
   * Tailwind gradient class string.
   * Defaults to indigo → purple → indigo animated sweep.
   */
  gradient?: string;
}

export function GradientText({
  children,
  className = '',
  gradient = 'bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400',
}: GradientTextProps) {
  return (
    <span
      className={`${gradient} bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x ${className}`}
    >
      {children}
    </span>
  );
}
