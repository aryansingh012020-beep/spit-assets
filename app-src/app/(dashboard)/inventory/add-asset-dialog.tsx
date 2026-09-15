'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { submitAddRequest } from '@/lib/actions/requests';
import { Plus, PackagePlus, Building2, MapPin, Tag, ClipboardList, Info } from 'lucide-react';

interface AddAssetDialogProps {
  categories: { id: string; name: string }[];
  rooms: { id: string; name: string; room_number: string | null; floor_id?: string; building_id?: string; floor_name?: string; building_name?: string }[];
  buildings?: { id: string; name: string; code: string }[];
  floors?: { id: string; name: string; building_id: string }[];
  /** Pre-select a specific room (e.g. when opened from a room page) */
  defaultRoomId?: string;
  defaultBuildingId?: string;
  defaultFloorId?: string;
  /** Optional custom trigger element — defaults to a standard "Add Asset" button */
  trigger?: React.ReactNode;
}

const STATUS_OPTIONS = [
  { value: 'active',            label: 'Active — in use' },
  { value: 'under_maintenance', label: 'Under Maintenance' },
  { value: 'missing',           label: 'Missing / Lost' },
  { value: 'damaged',           label: 'Damaged' },
  { value: 'transferred',       label: 'Transferred' },
  { value: 'retired',           label: 'Retired' },
  { value: 'disposed',          label: 'Disposed' },
];

const SELECT_CLS =
  'block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 ' +
  'px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

const SECTION_LABEL = 'block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2';

export function AddAssetDialog({
  categories,
  rooms,
  buildings = [],
  floors = [],
  defaultRoomId,
  defaultBuildingId,
  defaultFloorId,
  trigger,
}: AddAssetDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Cascading location state — initialize from defaults if provided
  const [selectedBuilding, setSelectedBuilding] = React.useState(defaultBuildingId ?? '');
  const [selectedFloor, setSelectedFloor] = React.useState(defaultFloorId ?? '');
  const [selectedRoom, setSelectedRoom] = React.useState(defaultRoomId ?? '');

  const { toast } = useToast();
  const router = useRouter();

  // Derived filtered lists
  const filteredFloors = React.useMemo(
    () => floors.filter(f => !selectedBuilding || f.building_id === selectedBuilding),
    [floors, selectedBuilding]
  );

  const filteredRooms = React.useMemo(() => {
    return rooms.filter(r => {
      const buildingMatch = !selectedBuilding || r.building_id === selectedBuilding;
      const floorMatch = !selectedFloor || r.floor_id === selectedFloor;
      return buildingMatch && floorMatch;
    });
  }, [rooms, selectedBuilding, selectedFloor]);

  function resetForm() {
    setSelectedBuilding(defaultBuildingId ?? '');
    setSelectedFloor(defaultFloorId ?? '');
    setSelectedRoom(defaultRoomId ?? '');
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) resetForm();
  }

  function handleBuildingChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedBuilding(e.target.value);
    setSelectedFloor('');
    setSelectedRoom('');
  }

  function handleFloorChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedFloor(e.target.value);
    setSelectedRoom('');
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      await submitAddRequest(formData);

      toast({
        variant: 'success',
        title: 'Request Submitted',
        description: 'Asset addition request submitted for approver review. You can track it in the Approvals section.',
      });
      handleOpenChange(false);
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'error', title: 'Request Failed', description: err.message || 'Failed to submit request' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <PackagePlus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Request New Asset Addition
              </DialogTitle>
              <DialogDescription className="text-sm">
                Fill in all relevant details. This will be sent for approver review before being added to inventory.
              </DialogDescription>
            </DialogHeader>

            {/* Approval notice banner */}
            <div className="mx-6 mt-3 mb-1 flex items-start gap-2.5 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                This request will be reviewed by an approver before the asset is committed to the database.
                You can track its status in <strong>Approvals → My Requests</strong>.
              </span>
            </div>

            <div className="px-6 py-4 space-y-5">

              {/* ── Section 1: Asset Identity ── */}
              <div className="space-y-3">
                <p className={SECTION_LABEL}><Tag className="inline h-3 w-3 mr-1" />Asset Identity</p>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
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
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Asset Tag <span className="text-xs text-zinc-400 dark:text-zinc-500">(optional)</span>
                    </label>
                    <Input
                      name="asset_tag"
                      placeholder="e.g. CS-PC-042"
                    />
                    <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">Leave blank if no tag is assigned yet.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category_id"
                      required
                      defaultValue={categories[0]?.id ?? ''}
                      className={SELECT_CLS}
                    >
                      <option value="" disabled>Select category…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <hr className="border-zinc-100 dark:border-zinc-800" />

              {/* ── Section 2: Location ── */}
              <div className="space-y-3">
                <p className={SECTION_LABEL}><MapPin className="inline h-3 w-3 mr-1" />Location</p>

                {buildings.length > 0 ? (
                  <>
                    {/* Building → Floor → Room cascade */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Building
                        </label>
                        <select
                          value={selectedBuilding}
                          onChange={handleBuildingChange}
                          className={SELECT_CLS}
                        >
                          <option value="">All buildings</option>
                          {buildings.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Floor
                        </label>
                        <select
                          value={selectedFloor}
                          onChange={handleFloorChange}
                          disabled={floors.length > 0 && !selectedBuilding}
                          className={SELECT_CLS}
                        >
                          <option value="">All floors</option>
                          {filteredFloors.map((f) => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Room <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="room_id"
                          required
                          value={selectedRoom}
                          onChange={(e) => setSelectedRoom(e.target.value)}
                          className={SELECT_CLS}
                        >
                          <option value="" disabled>Select room…</option>
                          {filteredRooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}{r.room_number ? ` (${r.room_number})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Fallback: flat room list when no buildings data */
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Room <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="room_id"
                      required
                      defaultValue=""
                      className={SELECT_CLS}
                    >
                      <option value="" disabled>Select room…</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}{r.room_number ? ` (${r.room_number})` : ''}
                          {r.floor_name ? ` — ${r.floor_name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <hr className="border-zinc-100 dark:border-zinc-800" />

              {/* ── Section 3: Details ── */}
              <div className="space-y-3">
                <p className={SECTION_LABEL}><ClipboardList className="inline h-3 w-3 mr-1" />Details</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Acquisition Year
                    </label>
                    <Input
                      type="number"
                      name="acquisition_year"
                      defaultValue={new Date().getFullYear()}
                      min={1980}
                      max={new Date().getFullYear() + 1}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Initial Status
                    </label>
                    <select
                      name="status"
                      defaultValue="active"
                      className={SELECT_CLS}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Specification / Description
                  </label>
                  <Textarea
                    name="description"
                    rows={3}
                    placeholder="Serial number, model number, processor/RAM specs, physical condition notes…"
                  />
                </div>
              </div>

              <hr className="border-zinc-100 dark:border-zinc-800" />

              {/* ── Section 4: Justification ── */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Justification / Reason <span className="text-red-500">*</span>
                </label>
                <Textarea
                  name="reason"
                  required
                  rows={2}
                  placeholder="e.g. New lab procurement approved for Semester 1 / Physical verification of existing asset"
                />
                <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                  This reason will be visible to the approver and stored in the audit log.
                </p>
              </div>

            </div>

            <DialogFooter className="px-6 pb-5 pt-2 border-t border-zinc-100 dark:border-zinc-800 gap-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" isLoading={loading} className="gap-2">
                <PackagePlus className="h-4 w-4" />
                Submit for Approval
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
