'use client';

import * as React from 'react';
import Link from 'next/link';
import { Heart, ShieldCheck, Sparkles, Building2, Code2 } from 'lucide-react';

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 w-full border-t border-zinc-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          {/* Left: Institute Brand */}
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-900 dark:text-white">
              SPIT Asset Management System
            </span>
            <span>·</span>
            <span>Sardar Patel Institute of Technology, Mumbai</span>
          </div>

          {/* Center: Built by Aryan Singh Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-zinc-700 dark:text-zinc-200 font-medium shadow-2xs">
            <Code2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Built by</span>
            <span className="font-bold text-indigo-700 dark:text-indigo-300 tracking-wide">
              Aryan Singh
            </span>
          </div>

          {/* Right: Copyright */}
          <div className="flex items-center gap-3 text-zinc-400 dark:text-zinc-500 text-[11px]">
            <span>© {currentYear} SPIT. All rights reserved.</span>
            <span>·</span>
            <Link href="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Institutional Console
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
