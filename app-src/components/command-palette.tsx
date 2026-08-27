'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, Building2, DoorOpen, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/lib/types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results ?? []);
        setSelectedIndex(0);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => controller.abort();
  }, [query]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        router.push(results[selectedIndex].href);
        onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [results, selectedIndex, router, onClose]
  );

  if (!open) return null;

  const ICONS = {
    asset:    <Package className="h-4 w-4 text-indigo-500" />,
    room:     <DoorOpen className="h-4 w-4 text-blue-500" />,
    building: <Building2 className="h-4 w-4 text-violet-500" />,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl bg-white shadow-2xl border border-zinc-200 overflow-hidden"
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <Search className="h-4 w-4 shrink-0 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 outline-none"
            placeholder="Search assets, rooms, buildings…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-autocomplete="list"
            aria-controls="command-results"
          />
          <kbd className="hidden sm:inline-flex items-center rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ul id="command-results" className="max-h-80 overflow-y-auto" role="listbox">
          {loading && (
            <li className="px-4 py-8 text-center text-sm text-zinc-400">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-500" />
            </li>
          )}

          {!loading && results.length === 0 && query.trim() && (
            <li className="px-4 py-8 text-center text-sm text-zinc-400">
              No results for &ldquo;{query}&rdquo;
            </li>
          )}

          {!loading && !query.trim() && (
            <li className="px-4 py-8 text-center text-sm text-zinc-400">
              Start typing to search across all assets, rooms, and buildings
            </li>
          )}

          {results.map((result, i) => (
            <li key={result.id} role="option" aria-selected={i === selectedIndex}>
              <button
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  i === selectedIndex ? 'bg-indigo-50' : 'hover:bg-zinc-50'
                )}
                onClick={() => {
                  router.push(result.href);
                  onClose();
                }}
              >
                <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
                  {ICONS[result.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 truncate">{result.title}</p>
                  <p className="text-xs text-zinc-500 truncate">{result.subtitle}</p>
                </div>
                <span className="shrink-0 text-xs text-zinc-400 capitalize">{result.type}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="flex items-center gap-4 border-t border-zinc-100 px-4 py-2">
            <span className="text-[10px] text-zinc-400">
              <kbd className="font-mono">↑↓</kbd> navigate · <kbd className="font-mono">↵</kbd> select · <kbd className="font-mono">esc</kbd> close
            </span>
          </div>
        )}
      </div>
    </>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen };
}
