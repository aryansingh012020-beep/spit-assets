'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { submitAddRequest } from '@/lib/actions/requests';
import { Plus, PackagePlus } from 'lucide-react';

interface AddAssetDialogProps {
  categories: { id: string; name: string }[];
  rooms: { id: string; name: string; room_number: string | null; floor_name?: string }[];
}

export function AddAssetDialog({ categories, rooms }: AddAssetDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      await submitAddRequest(formData);

      toast({
        variant: 'success',
        title: 'Request Submitted',
        description: 'Asset addition request submitted for approver review.',
      });
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'error', title: 'Request Failed', description: err.message || 'Failed to submit request' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Request Asset
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5 text-indigo-600" />
                Request New Asset Addition
              </DialogTitle>
              <DialogDescription>
                Submit an institutional change request to add a new physical asset into inventory.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-1.5">
                  Asset Name <span className="text-red-500">*</span>
                </label>
                <Input
                  name="name"
                  required
                  placeholder="e.g. Dell OptiPlex 7090 Desktop"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category_id"
                    required
                    defaultValue={categories[0]?.id}
                    className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-1.5">
                    Location Room <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="room_id"
                    required
                    defaultValue={rooms[0]?.id}
                    className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.room_number ? `(${r.room_number})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-1.5">
                    Acquisition Year
                  </label>
                  <Input
                    type="number"
                    name="acquisition_year"
                    defaultValue={new Date().getFullYear()}
                    min={1990}
                    max={2030}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-1.5">
                    Initial Status
                  </label>
                  <select
                    name="status"
                    defaultValue="active"
                    className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="under_maintenance">Under Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-1.5">
                  Specification / Description
                </label>
                <Textarea
                  name="description"
                  rows={2}
                  placeholder="Serial numbers, processor/RAM specs, model details..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-1.5">
                  Justification / Reason <span className="text-red-500">*</span>
                </label>
                <Textarea
                  name="reason"
                  required
                  rows={2}
                  placeholder="e.g. New lab procurement approved for Semester 1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={loading}>
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
