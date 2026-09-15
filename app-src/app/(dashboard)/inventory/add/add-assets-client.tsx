'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  Plus, PackagePlus, Trash2, Pencil, FileSpreadsheet,
  CheckCircle2, Loader2, Info, ChevronRight, X, ClipboardList,
  Tag, MapPin, Building2, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/primitives';
import { submitAddRequest } from '@/lib/actions/requests';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────
interface Category { id: string; name: string; code?: string }
interface Room {
  id: string; name: string; room_number: string | null;
  floor_id?: string; floor_name?: string | null;
  building_id?: string; building_name?: string | null;
}
interface Building { id: string; name: string; code: string }
interface Floor { id: string; name: string; building_id: string }

interface QueuedItem {
  tempId: string;
  name: string;
  asset_tag: string;
  category_id: string;
  category_name: string;
  room_id: string;
  room_name: string;
  room_number: string | null;
  status: string;
  acquisition_year: string;
  description: string;
  reason: string;
}

interface AddAssetsClientProps {
  categories: Category[];
  rooms: Room[];
  buildings: Building[];
  floors: Floor[];
  isApprover: boolean;
}

const STATUS_OPTIONS = [
  { value: 'active',            label: 'Active — in use' },
  { value: 'under_maintenance', label: 'Under Maintenance' },
  { value: 'damaged',           label: 'Damaged' },
  { value: 'missing',           label: 'Missing / Lost' },
  { value: 'retired',           label: 'Retired' },
];

const SELECT_CLS =
  'block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 ' +
  'px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

const LABEL_CLS = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5';
const SECTION_CLS = 'text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2.5 flex items-center gap-1.5';

const EMPTY_FORM = {
  name: '', asset_tag: '', category_id: '',
  room_id: '', status: 'active',
  acquisition_year: String(new Date().getFullYear()),
  description: '', reason: '',
};

export function AddAssetsClient({ categories, rooms, buildings, floors, isApprover }: AddAssetsClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [form, setForm] = React.useState({ ...EMPTY_FORM });
  const [selectedBuilding, setSelectedBuilding] = React.useState('');
  const [selectedFloor, setSelectedFloor] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Queue
  const [queue, setQueue] = React.useState<QueuedItem[]>([]);

  // Submission
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  // Derived
  const filteredFloors = React.useMemo(
    () => floors.filter(f => !selectedBuilding || f.building_id === selectedBuilding),
    [floors, selectedBuilding]
  );
  const filteredRooms = React.useMemo(() =>
    rooms.filter(r => {
      const bMatch = !selectedBuilding || r.building_id === selectedBuilding;
      const fMatch = !selectedFloor || r.floor_id === selectedFloor;
      return bMatch && fMatch;
    }),
    [rooms, selectedBuilding, selectedFloor]
  );

  function field(key: keyof typeof EMPTY_FORM) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value })),
    };
  }

  function handleBuildingChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedBuilding(e.target.value);
    setSelectedFloor('');
    setForm(f => ({ ...f, room_id: '' }));
  }

  function handleFloorChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedFloor(e.target.value);
    setForm(f => ({ ...f, room_id: '' }));
  }

  function validateForm(): string | null {
    if (!form.name.trim()) return 'Asset name is required.';
    if (!form.category_id) return 'Category is required.';
    if (!form.room_id) return 'Destination room is required.';
    if (!form.reason.trim()) return 'Justification is required.';
    return null;
  }

  function handleAddToQueue() {
    const err = validateForm();
    if (err) { toast({ variant: 'error', title: 'Incomplete', description: err }); return; }

    const room = rooms.find(r => r.id === form.room_id);
    const cat = categories.find(c => c.id === form.category_id);

    const item: QueuedItem = {
      tempId: editingId ?? `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: form.name.trim(),
      asset_tag: form.asset_tag.trim(),
      category_id: form.category_id,
      category_name: cat?.name ?? '—',
      room_id: form.room_id,
      room_name: room?.name ?? '—',
      room_number: room?.room_number ?? null,
      status: form.status,
      acquisition_year: form.acquisition_year,
      description: form.description.trim(),
      reason: form.reason.trim(),
    };

    if (editingId) {
      setQueue(q => q.map(i => i.tempId === editingId ? item : i));
      setEditingId(null);
      toast({ variant: 'success', title: 'Item updated' });
    } else {
      setQueue(q => [...q, item]);
      toast({ variant: 'success', title: 'Added to queue', description: `"${item.name}" — ${queue.length + 1} item(s) queued` });
    }

    setForm({ ...EMPTY_FORM });
    setSelectedBuilding('');
    setSelectedFloor('');
  }

  function handleEditItem(item: QueuedItem) {
    setEditingId(item.tempId);
    setForm({
      name: item.name,
      asset_tag: item.asset_tag,
      category_id: item.category_id,
      room_id: item.room_id,
      status: item.status,
      acquisition_year: item.acquisition_year,
      description: item.description,
      reason: item.reason,
    });
    // Try to restore cascade
    const room = rooms.find(r => r.id === item.room_id);
    if (room?.building_id) setSelectedBuilding(room.building_id);
    if (room?.floor_id) setSelectedFloor(room.floor_id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleRemoveItem(tempId: string) {
    setQueue(q => q.filter(i => i.tempId !== tempId));
    if (editingId === tempId) {
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
    }
  }

  async function handleSubmitAll() {
    if (queue.length === 0) return;
    setSubmitting(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const item of queue) {
      try {
        const fd = new FormData();
        fd.set('name', item.name);
        if (item.asset_tag) fd.set('asset_tag', item.asset_tag);
        fd.set('category_id', item.category_id);
        fd.set('room_id', item.room_id);
        fd.set('status', item.status);
        if (item.acquisition_year) fd.set('acquisition_year', item.acquisition_year);
        if (item.description) fd.set('description', item.description);
        fd.set('reason', item.reason);
        await submitAddRequest(fd);
        successCount++;
      } catch (e: any) {
        errors.push(`"${item.name}": ${e.message}`);
      }
    }

    setSubmitting(false);

    if (successCount > 0) {
      setSubmitted(true);
      setQueue([]);
      toast({
        variant: 'success',
        title: `${successCount} item${successCount > 1 ? 's' : ''} submitted!`,
        description: isApprover
          ? 'Assets committed to inventory directly.'
          : 'Pending approver review. Track in Approvals.',
      });
      router.refresh();
    }
    if (errors.length > 0) {
      toast({ variant: 'error', title: `${errors.length} submission(s) failed`, description: errors[0] });
    }
  }

  function handleExportExcel() {
    if (queue.length === 0) return;
    const rows = queue.map(i => ({
      'Asset Name': i.name,
      'Asset Tag': i.asset_tag || '',
      'Category': i.category_name,
      'Destination Room': i.room_name + (i.room_number ? ` (${i.room_number})` : ''),
      'Status': i.status,
      'Acquisition Year': i.acquisition_year,
      'Description': i.description,
      'Justification': i.reason,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pending Assets');
    XLSX.writeFile(wb, `SPIT_Pending_Assets_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
        <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Submission Complete</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
            {isApprover
              ? 'Assets have been added directly to inventory.'
              : 'Your requests are pending approver review. Track them in Approvals.'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setSubmitted(false); }}>
            Add More Assets
          </Button>
          <Button onClick={() => router.push(isApprover ? '/inventory' : '/approvals')} className="gap-2">
            {isApprover ? 'View Inventory' : 'View Approvals'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Add Assets to Inventory</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Fill in the form, add multiple items to the queue, then submit all for{' '}
          {isApprover ? 'direct commit.' : 'approver review.'}
        </p>
      </div>

      {/* Approval notice */}
      {!isApprover && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <Info className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Each item will be submitted as a <strong>change request</strong> and must be approved before it appears in inventory.
            Track status in <strong>Operations → Approvals</strong>.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* ── LEFT: Form ─────────────────────────────── */}
        <div className="lg:col-span-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              {editingId ? <><Pencil className="h-4 w-4 text-indigo-500" /> Edit Item</> : <><PackagePlus className="h-4 w-4 text-indigo-500" /> New Item</>}
            </h2>
          </div>

          <div className="px-5 py-4 space-y-5">
            {/* Identity */}
            <div className="space-y-3">
              <p className={SECTION_CLS}><Tag className="h-3 w-3" aria-hidden="true" /> Asset Identity</p>

              <div>
                <label className={LABEL_CLS} htmlFor="name">Asset Name <span className="text-red-500">*</span></label>
                <Input id="name" name="name" placeholder="e.g. Dell OptiPlex 7090 Desktop" {...field('name')} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLS} htmlFor="asset_tag">
                    Asset Tag <span className="text-xs text-zinc-400">(optional)</span>
                  </label>
                  <Input id="asset_tag" name="asset_tag" placeholder="e.g. CS-PC-042" {...field('asset_tag')} spellCheck={false} />
                  <p className="mt-1 text-[11px] text-zinc-400">Leave blank if not yet assigned.</p>
                </div>
                <div>
                  <label className={LABEL_CLS} htmlFor="category_id">Category <span className="text-red-500">*</span></label>
                  <select id="category_id" name="category_id" className={SELECT_CLS} {...field('category_id')}>
                    <option value="" disabled>Select category…</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-3">
              <p className={SECTION_CLS}><MapPin className="h-3 w-3" aria-hidden="true" /> Destination Location</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={LABEL_CLS} htmlFor="building">Building</label>
                  <select id="building" className={SELECT_CLS} value={selectedBuilding} onChange={handleBuildingChange}>
                    <option value="">All buildings</option>
                    {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS} htmlFor="floor">Floor</label>
                  <select id="floor" className={SELECT_CLS} value={selectedFloor} onChange={handleFloorChange}
                    disabled={buildings.length > 0 && !selectedBuilding}>
                    <option value="">All floors</option>
                    {filteredFloors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS} htmlFor="room_id">Room <span className="text-red-500">*</span></label>
                  <select id="room_id" name="room_id" className={SELECT_CLS} {...field('room_id')}>
                    <option value="" disabled>Select room…</option>
                    {filteredRooms.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}{r.room_number ? ` (${r.room_number})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <p className={SECTION_CLS}><ClipboardList className="h-3 w-3" aria-hidden="true" /> Details</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLS} htmlFor="acquisition_year">Acquisition Year</label>
                  <Input id="acquisition_year" type="number" min={1980} max={new Date().getFullYear() + 1}
                    {...field('acquisition_year')} />
                </div>
                <div>
                  <label className={LABEL_CLS} htmlFor="status">Initial Status</label>
                  <select id="status" name="status" className={SELECT_CLS} {...field('status')}>
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={LABEL_CLS} htmlFor="description">Specifications / Description</label>
                <Textarea id="description" name="description" rows={2}
                  placeholder="Serial no., model, RAM/processor, condition notes…" {...field('description')} />
              </div>
            </div>

            {/* Justification */}
            <div>
              <label className={LABEL_CLS} htmlFor="reason">
                Justification <span className="text-red-500">*</span>
              </label>
              <Textarea id="reason" name="reason" required rows={2}
                placeholder="e.g. New lab procurement for Semester 1 2026 / Physical verification of existing asset"
                {...field('reason')} />
              <p className="mt-1 text-[11px] text-zinc-400">Visible to the approver and stored in the audit log.</p>
            </div>
          </div>

          {/* Form actions */}
          <div className="px-5 py-4 flex items-center justify-between gap-3">
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM }); setSelectedBuilding(''); setSelectedFloor(''); }}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                Cancel edit
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm({ ...EMPTY_FORM })}
              >
                Clear
              </Button>
              <Button type="button" onClick={handleAddToQueue} className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white">
                {editingId
                  ? <><Save className="h-4 w-4" /> Save Changes</>
                  : <><Plus className="h-4 w-4" /> Add to Queue</>
                }
              </Button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Queue ────────────────────────────── */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800 sticky top-20">
          <div className="px-5 py-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <span>Submission Queue</span>
              {queue.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold px-1.5 tabular-nums">
                  {queue.length}
                </span>
              )}
            </h2>
          </div>

          {/* Queue items */}
          <div className="px-5 py-3 min-h-[120px]">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <PackagePlus className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-2" aria-hidden="true" />
                <p className="text-sm text-zinc-400 dark:text-zinc-500">No items yet.</p>
                <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-0.5">Fill the form and click "Add to Queue".</p>
              </div>
            ) : (
              <ul className="space-y-2" aria-label="Queued assets">
                {queue.map((item) => (
                  <li
                    key={item.tempId}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                      editingId === item.tempId
                        ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                        {item.category_name} · {item.room_name}{item.room_number ? ` (${item.room_number})` : ''}
                      </p>
                      {item.asset_tag && (
                        <p className="text-[10px] font-mono text-zinc-400 mt-0.5">{item.asset_tag}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditItem(item)}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        aria-label={`Edit ${item.name}`}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.tempId)}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        aria-label={`Remove ${item.name}`}
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Queue actions */}
          <div className="px-5 py-4 space-y-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={queue.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Export as Excel
            </button>
            <Button
              type="button"
              onClick={handleSubmitAll}
              disabled={queue.length === 0 || submitting}
              className="w-full gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Submitting…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {isApprover
                    ? `Commit ${queue.length} Asset${queue.length !== 1 ? 's' : ''}`
                    : `Submit ${queue.length} for Approval`}
                </>
              )}
            </Button>
            {!isApprover && queue.length > 0 && (
              <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                Items will go to <strong>Approvals</strong> for review before being added to inventory.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
