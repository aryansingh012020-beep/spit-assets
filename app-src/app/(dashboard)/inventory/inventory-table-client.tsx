'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, EmptyState, Textarea } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { buildLocationString } from '@/lib/utils';
import { Package, ChevronLeft, ChevronRight, ArrowRightLeft, Trash2, Download, CheckSquare, Square, X } from 'lucide-react';
import { InventoryRowActions } from './inventory-row-actions';
import { submitBatchTransferRequest, submitBatchDeleteRequest } from '@/lib/actions/requests';

interface SearchParams {
  q?: string;
  status?: string;
  category?: string;
  room?: string;
  page?: string;
}

interface InventoryTableClientProps {
  assets: any[];
  count: number;
  page: number;
  totalPages: number;
  params: SearchParams;
  categories: { id: string; name: string }[];
  rooms: { id: string; name: string; room_number: string | null }[];
  canRequest: boolean;
  roomName?: string;
}

export function InventoryTableClient({
  assets,
  count,
  page,
  totalPages,
  params,
  categories,
  rooms,
  canRequest,
  roomName,
}: InventoryTableClientProps) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [batchTransferOpen, setBatchTransferOpen] = React.useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const { toast } = useToast();
  const router = useRouter();

  function buildHref(overrides: Partial<SearchParams>) {
    const merged = { ...params, ...overrides };
    const sp = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v) sp.set(k, v as string);
    });
    return `/inventory?${sp.toString()}`;
  }

  const allPageIds = assets.map((a) => a.id);
  const isAllSelected = assets.length > 0 && allPageIds.every((id) => selectedIds.includes(id));
  const isSomeSelected = selectedIds.length > 0;

  function toggleSelectAll() {
    if (isAllSelected) {
      // Remove all current page assets from selection
      setSelectedIds((prev) => prev.filter((id) => !allPageIds.includes(id)));
    } else {
      // Add all current page assets
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allPageIds])));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleBatchTransfer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const toRoomId = fd.get('to_room_id') as string;
      const reason = fd.get('reason') as string;

      await submitBatchTransferRequest({
        asset_ids: selectedIds,
        to_room_id: toRoomId,
        reason,
      });

      toast({
        variant: 'success',
        title: 'Batch Transfer Submitted',
        description: `Transfer requests for ${selectedIds.length} assets submitted for approval.`,
      });

      setBatchTransferOpen(false);
      setSelectedIds([]);
      router.refresh();
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Batch Transfer Failed',
        description: err.message || 'Could not submit batch transfer',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleBatchDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const disposition = fd.get('disposition') as string;
      const reason = fd.get('reason') as string;

      await submitBatchDeleteRequest({
        asset_ids: selectedIds,
        disposition,
        reason,
      });

      toast({
        variant: 'success',
        title: 'Batch Deletion Submitted',
        description: `Disposal requests for ${selectedIds.length} assets submitted for approval.`,
      });

      setBatchDeleteOpen(false);
      setSelectedIds([]);
      router.refresh();
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Batch Deletion Failed',
        description: err.message || 'Could not submit batch deletion',
      });
    } finally {
      setLoading(false);
    }
  }

  const selectedExportUrl = `/api/export?ids=${selectedIds.join(',')}`;

  return (
    <>
      {/* Table */}
      <Card className="relative">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                {/* Selection checkbox column */}
                <th className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    title="Select all on this page"
                  />
                </th>
                {['Asset Tag', 'Name', 'Category', 'Location', 'Status', 'Year'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
                {canRequest && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={canRequest ? 8 : 7} className="py-16">
                    <EmptyState
                      icon={<Package className="h-8 w-8" />}
                      title="No assets found"
                      description="Try adjusting your search criteria"
                    />
                  </td>
                </tr>
              ) : (
                assets.map((asset: any) => {
                  const isSelected = selectedIds.includes(asset.id);
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => toggleSelect(asset.id)}
                      className={`group transition-colors cursor-pointer select-none ${
                        isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/50'
                          : 'hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20'
                      }`}
                    >
                      <td
                        className="w-10 px-3 py-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(asset.id)}
                          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/inventory/${asset.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {asset.asset_tag}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/inventory/${asset.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block"
                        >
                          <p className="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {asset.name}
                          </p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 lg:hidden">
                            {buildLocationString([
                              asset.building?.name,
                              asset.floor?.name,
                              asset.room?.name,
                            ])}
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {asset.category ? (
                          <Badge variant="default">{asset.category.name}</Badge>
                        ) : (
                          <span className="text-zinc-300 dark:text-zinc-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-zinc-600 dark:text-zinc-300">
                          {buildLocationString([
                            asset.building?.name,
                            asset.floor?.name,
                            asset.room?.name,
                          ]) || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={asset.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                        {asset.acquisition_year ?? '—'}
                      </td>
                      {canRequest && (
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <InventoryRowActions
                            assetId={asset.id}
                            assetName={asset.name}
                            assetTag={asset.asset_tag}
                            currentRoomId={asset.room?.id}
                            rooms={rooms}
                            canManage={canRequest}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 px-4 py-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Page {page} of {totalPages} · {count.toLocaleString()} total
            </p>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={buildHref({ page: String(page - 1) })}
                  className="flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildHref({ page: String(page + 1) })}
                  className="flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Floating Multi-Select Action Toolbar */}
      {isSomeSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-zinc-900/95 dark:bg-zinc-800/95 px-5 py-3 text-white shadow-2xl backdrop-blur-md border border-zinc-700 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 border-r border-zinc-700 pr-3">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold px-1.5">
              {selectedIds.length}
            </span>
            <span className="text-xs font-medium text-zinc-200">selected</span>
          </div>

          <div className="flex items-center gap-2">
            {canRequest && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBatchTransferOpen(true)}
                  className="h-8 gap-1.5 bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700 hover:text-white"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Batch Shift
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setBatchDeleteOpen(true)}
                  className="h-8 gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Batch Delete
                </Button>
              </>
            )}

            <a
              href={selectedExportUrl}
              download
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export Selected
            </a>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="ml-1 p-1 text-zinc-400 hover:text-white transition-colors rounded-full"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Batch Shift Modal */}
      <Dialog open={batchTransferOpen} onOpenChange={setBatchTransferOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleBatchTransfer}>
            <DialogHeader>
              <DialogTitle>Batch Shift / Transfer ({selectedIds.length} Assets)</DialogTitle>
              <DialogDescription>
                Relocate all {selectedIds.length} selected physical assets to a new destination room.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Destination Room <span className="text-red-500">*</span>
                </label>
                <select
                  name="to_room_id"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>Select destination room…</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.room_number ? `(${r.room_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Reason for Transfer <span className="text-red-500">*</span>
                </label>
                <Textarea
                  name="reason"
                  required
                  placeholder="e.g. Lab upgrade / Reallocating hardware across departments"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBatchTransferOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={loading}>
                Submit Batch Transfer ({selectedIds.length})
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Modal */}
      <Dialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleBatchDelete}>
            <DialogHeader>
              <DialogTitle className="text-red-600 dark:text-red-400">
                Batch Disposal Request ({selectedIds.length} Assets)
              </DialogTitle>
              <DialogDescription>
                Submit formal condemnation or retirement requests for {selectedIds.length} assets.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Disposal Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="disposition"
                  required
                  defaultValue="retired"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="retired">Retire (End of life / obsolete)</option>
                  <option value="disposed">Dispose (Scrapped / physical disposal)</option>
                  <option value="missing">Mark as Lost / Missing</option>
                  <option value="damaged">Damaged / Non-repairable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Reason & Audit Justification <span className="text-red-500">*</span>
                </label>
                <Textarea
                  name="reason"
                  required
                  placeholder="e.g. Obsolete equipment batch condemnation per audit committee report"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBatchDeleteOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" isLoading={loading}>
                Submit Batch Deletion ({selectedIds.length})
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
