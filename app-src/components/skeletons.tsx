// Shared skeleton primitives
export function SkeletonBox({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800 ${className}`} />
  );
}

export function PageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-5 w-full pb-8">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800 pb-5">
        <div className="space-y-2">
          <SkeletonBox className="h-7 w-56" />
          <SkeletonBox className="h-3.5 w-80" />
        </div>
        <div className="flex gap-2">
          <SkeletonBox className="h-8 w-28 rounded-lg" />
          <SkeletonBox className="h-8 w-28 rounded-lg" />
        </div>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <SkeletonBox key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-5">
          <SkeletonBox className="h-48 rounded-xl" />
          <SkeletonBox className="h-36 rounded-xl" />
          {[...Array(rows)].map((_, i) => (
            <SkeletonBox key={i} className="h-10 rounded-lg" />
          ))}
        </div>
        <div className="lg:col-span-2 space-y-5">
          <SkeletonBox className="h-64 rounded-xl" />
          <SkeletonBox className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-5 w-full pb-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800 pb-5">
        <div className="space-y-2">
          <SkeletonBox className="h-7 w-48" />
          <SkeletonBox className="h-3.5 w-64" />
        </div>
        <SkeletonBox className="h-9 w-32 rounded-lg" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        <SkeletonBox className="h-9 flex-1 max-w-sm rounded-lg" />
        <SkeletonBox className="h-9 w-32 rounded-lg" />
        <SkeletonBox className="h-9 w-32 rounded-lg" />
      </div>

      {/* Table rows */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <SkeletonBox className="h-10 rounded-none" />
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="border-t border-zinc-100 dark:border-zinc-800/60 px-4 py-3 flex items-center gap-4">
            <SkeletonBox className="h-4 w-24" />
            <SkeletonBox className="h-4 flex-1" />
            <SkeletonBox className="h-4 w-20" />
            <SkeletonBox className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="space-y-5 w-full pb-8">
      <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800 pb-5">
        <SkeletonBox className="h-7 w-48" />
        <SkeletonBox className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(cards)].map((_, i) => (
          <SkeletonBox key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
