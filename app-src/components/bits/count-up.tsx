'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  to: number;
  duration?: number;
  className?: string;
  suffix?: string;
}

export function CountUp({ to, duration = 1400, className, suffix }: CountUpProps) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const start = performance.now();
    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(ease * to));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [to, duration]);

  return (
    <span className={className}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}
