'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { submitTransferRequest, submitDeleteRequest } from '@/lib/actions/requests';
import { ArrowRightLeft, Trash2, MoreHorizontal, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface InventoryRowActionsProps {
  assetId: string;
  assetName: string;
  assetTag: string;
  currentRoomId?: string;
  rooms: { id: string; name: string; room_number: string | null }[];
  canManage: boolean;
}

export function InventoryRowActions({
  assetId,
  assetName,
  assetTag,
  currentRoomId,
  rooms,
  canManage,
}: InventoryRowActionsProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const { toast } = useToast();
  const router = useRouter();

  if (!canManage) return null;

  async function handleTransfer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      await submitTransferRequest({
        asset_id: assetId,
        to_room_id: fd.get('to_room_id') as string,
        reason: fd.get('reason') as string,
      });

      toast({ variant: 'success', title: 'Transfer Requested', description: `Transfer request for ${assetTag} submitted for approval.` });
      setTransferOpen(false);
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'error', title: 'Transfer Failed', description: err.message || 'Could not submit transfer' });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      await submitDeleteRequest({
        asset_id: assetId,
        disposition: (fd.get('disposition') as any) || 'retired',
        reason: fd.get('reason') as string,
      });

      toast({ variant: 'success', title: 'Deletion Requested', description: `Disposal request for ${assetTag} submitted for approval.` });
      setDeleteOpen(false);
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'error', title: 'Request Failed', description: err.message || 'Could not submit disposal request' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {/* Quick Action: Shift / Transfer */}
      <button
        type="button"
        onClick={() => setTransferOpen(true)}
        className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
        title="Shift / Transfer asset"
      >
        <ArrowRightLeft className="h-3 w-3" />
        <span className="hidden sm:inline">Shift</span>
      </button>

      {/* Quick Action: Delete / Retire */}
      <button
        type="button"
        onClick={() => setDeleteOpen(true)}
        className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 transition-colors"
        title="Delete / Retire asset"
      >
        <Trash2 className="h-3 w-3" />
        <span className="hidden sm:inline">Delete</span>
      </button>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleTransfer}>
            <DialogHeader>
              <DialogTitle>Shift / Transfer Asset</DialogTitle>
              <DialogDescription>
                Relocate <span className="font-mono font-medium text-zinc-900 dark:text-white">{assetTag}</span> ({assetName}) to a new room.
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
                  {rooms
                    .filter((r) => r.id !== currentRoomId)
                    .map((r) => (
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
                  placeholder="e.g. Relocated for Department expansion / Semester shift"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTransferOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" isLoading={loading}>
                Submit Transfer Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleDelete}>
            <DialogHeader>
              <DialogTitle className="text-red-600 dark:text-red-400">Request Asset Disposal / Deletion</DialogTitle>
              <DialogDescription>
                Submit a formal retirement or disposal request for{' '}
                <span className="font-mono font-medium text-zinc-900 dark:text-white">{assetTag}</span> ({assetName}).
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
                  <option value="retired">Retire (End of lifecycle / obsolete)</option>
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
                  placeholder="e.g. Beyond economical repair / condemnation audit report #2026-A"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" isLoading={loading}>
                Submit Deletion Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
