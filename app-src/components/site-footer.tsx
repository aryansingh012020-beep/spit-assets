'use client';

import * as React from 'react';
import { Code2 } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="relative z-10 w-full border-t border-zinc-100 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4 text-[11px] text-zinc-400 dark:text-zinc-500">
        <span>© {new Date().getFullYear()} SPIT · Sardar Patel Institute of Technology</span>
        <div className="flex items-center gap-1.5">
          <Code2 className="h-3 w-3 text-indigo-400" aria-hidden="true" />
          <span>Built by <span className="font-semibold text-indigo-500 dark:text-indigo-400">Aryan Singh</span></span>
        </div>
      </div>
    </footer>
  );
}
