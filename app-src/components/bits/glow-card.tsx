'use client';

import { useRef, MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: ReactNode;
  /** CSS color string for the glow, e.g. "rgba(99,102,241,0.15)" */
  glowColor?: string;
  /** Radius of the radial glow in px */
  glowRadius?: number;
  className?: string;
}

export function GlowCard({
  children,
  glowColor = 'rgba(99,102,241,0.12)',
  glowRadius = 220,
  className,
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (cardRef.current) {
      cardRef.current.style.setProperty('--glow-x', `${x}px`);
      cardRef.current.style.setProperty('--glow-y', `${y}px`);
    }
  }

  function handleMouseLeave() {
    if (cardRef.current) {
      cardRef.current.style.setProperty('--glow-x', '50%');
      cardRef.current.style.setProperty('--glow-y', '50%');
    }
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn('relative', className)}
      style={
        {
          '--glow-x': '50%',
          '--glow-y': '50%',
          background: `radial-gradient(${glowRadius}px circle at var(--glow-x) var(--glow-y), ${glowColor}, transparent 80%)`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
