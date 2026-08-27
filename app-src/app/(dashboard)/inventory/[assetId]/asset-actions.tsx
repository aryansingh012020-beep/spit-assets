'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { submitTransferRequest, submitEditRequest, submitDeleteRequest } from '@/lib/actions/requests';
import { ArrowRightLeft, Edit3, Trash2, ShieldAlert } from 'lucide-react';

interface AssetActionsProps {
  assetId: string;
  assetName: string;
  assetTag: string;
  currentRoomId?: string;
  currentName?: string;
  currentDescription?: string;
  currentYear?: number;
  currentCategoryId?: string;
  rooms: { id: string; name: string; room_number: string | null }[];
  categories: { id: string; name: string }[];
  canManage: boolean;
}

export function AssetActions({
  assetId,
  assetName,
  assetTag,
  currentRoomId,
  currentName,
  currentDescription,
  currentYear,
  currentCategoryId,
  rooms,
  categories,
  canManage,
}: AssetActionsProps) {
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
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

      toast({ variant: 'success', title: 'Transfer Requested', description: 'Request submitted for review.' });
      setTransferOpen(false);
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'error', title: 'Transfer Failed', description: err.message || 'Could not submit transfer' });
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      await submitEditRequest({
        asset_id: assetId,
        name: fd.get('name') as string,
        category_id: fd.get('category_id') as string,
        acquisition_year: fd.get('acquisition_year') ? parseInt(fd.get('acquisition_year') as string) : undefined,
        description: fd.get('description') as string,
        reason: fd.get('reason') as string,
      });

      toast({ variant: 'success', title: 'Edit Requested', description: 'Changes submitted for approver review.' });
      setEditOpen(false);
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'error', title: 'Edit Failed', description: err.message || 'Could not submit edit' });
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
        disposition: fd.get('disposition') as any,
        reason: fd.get('reason') as string,
      });

      toast({ variant: 'success', title: 'Disposition Requested', description: 'Retirement request submitted for review.' });
      setDeleteOpen(false);
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'error', title: 'Request Failed', description: err.message || 'Could not submit retirement' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)} className="gap-1.5">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        Transfer
      </Button>

      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
        <Edit3 className="h-3.5 w-3.5" />
        Edit
      </Button>

      <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50">
        <Trash2 className="h-3.5 w-3.5" />
        Retire
      </Button>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleTransfer}>
            <DialogHeader>
              <DialogTitle>Request Asset Transfer</DialogTitle>
              <DialogDescription>
                Relocate <span className="font-mono font-medium text-zinc-900">{assetTag}</span> to a different room.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-1.5">
                  Target Room <span className="text-red-500">*</span>
                </label>
                <select
                  name="to_room_id"
                  required
                  defaultValue={rooms.find(r => r.id !== currentRoomId)?.id}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.id} disabled={r.id === currentRoomId}>
                      {r.name} {r.room_number ? `(${r.room_number})` : ''} {r.id === currentRoomId ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-1.5">
                  Transfer Justification <span className="text-red-500">*</span>
                </label>
                <Textarea name="reason" required rows={3} placeholder="Reason for relocation (e.g. Lab expansion, project reassignment)..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={loading}>Submit Transfer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Request Asset Modification</DialogTitle>
              <DialogDescription>
                Submit an edit request for <span className="font-mono font-medium text-zinc-900">{assetTag}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-1.5">Asset Name</label>
                <Input name="name" defaultValue={currentName} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-1.5">Category</label>
                  <select
                    name="category_id"
                    defaultValue={currentCategoryId}
                    className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-1.5">Acquisition Year</label>
                  <Input type="number" name="acquisition_year" defaultValue={currentYear} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-1.5">Description / Specs</label>
                <Textarea name="description" defaultValue={currentDescription} rows={2} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-1.5">Reason for Edit <span className="text-red-500">*</span></label>
                <Textarea name="reason" required rows={2} placeholder="Explain why details are being corrected or updated..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={loading}>Submit Edits</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete/Retire Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleDelete}>
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Request Asset Retirement / Disposal
              </DialogTitle>
              <DialogDescription>
                Assets are never hard-deleted. This submits a formal governance request to transition <span className="font-mono font-medium text-zinc-900">{assetTag}</span> to non-operational status.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-1.5">
                  Disposition Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="disposition"
                  defaultValue="retired"
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="retired">Retired (Decommissioned from service, kept on record)</option>
                  <option value="disposed">Disposed (Permanently scrapped or recycled)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-1.5">
                  Condemnation Justification <span className="text-red-500">*</span>
                </label>
                <Textarea name="reason" required rows={3} placeholder="Provide audit reason (e.g. Beyond economical repair, superseded by new equipment)..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" isLoading={loading}>Submit Retirement</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
