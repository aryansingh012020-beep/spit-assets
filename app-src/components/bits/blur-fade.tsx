'use client';

import { ReactNode, useEffect, useRef, useState, CSSProperties } from 'react';

interface BlurFadeProps {
  children: ReactNode;
  delay?: number;     // ms before animation starts
  duration?: number;  // ms for the animation
  className?: string;
  style?: CSSProperties;
}

export function BlurFade({
  children,
  delay = 0,
  duration = 380,
  className,
  style,
}: BlurFadeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        filter: visible ? 'blur(0px)' : 'blur(6px)',
        transform: visible ? 'translateY(0px)' : 'translateY(8px)',
        transition: `opacity ${duration}ms cubic-bezier(0.16,1,0.3,1), filter ${duration}ms cubic-bezier(0.16,1,0.3,1), transform ${duration}ms cubic-bezier(0.16,1,0.3,1)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
