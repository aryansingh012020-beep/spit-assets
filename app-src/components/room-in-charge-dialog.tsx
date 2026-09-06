'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { assignRoomInCharge } from '@/lib/actions/rooms';
import { RoomInChargeProfile } from '@/lib/types';
import { toast } from 'sonner';
import {
  UserCheck,
  Search,
  Check,
  UserX,
  Loader2,
  Shield,
  Briefcase,
  Building2,
} from 'lucide-react';

interface RoomInChargeDialogProps {
  roomId: string;
  roomName: string;
  currentInCharge?: RoomInChargeProfile | null;
  profiles: Array<{
    id: string;
    full_name: string | null;
    role: string;
    department?: string | null;
    designation?: string | null;
    employee_id?: string | null;
  }>;
  trigger?: React.ReactNode;
}

export function RoomInChargeDialog({
  roomId,
  roomName,
  currentInCharge,
  profiles,
  trigger,
}: RoomInChargeDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(
    currentInCharge?.id ?? null
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Sync selectedId when dialog opens or currentInCharge changes
  React.useEffect(() => {
    if (open) {
      setSelectedId(currentInCharge?.id ?? null);
      setSearch('');
    }
  }, [open, currentInCharge]);

  const filteredProfiles = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const name = (p.full_name || '').toLowerCase();
      const dept = (p.department || '').toLowerCase();
      const desig = (p.designation || '').toLowerCase();
      const empId = (p.employee_id || '').toLowerCase();
      return name.includes(q) || dept.includes(q) || desig.includes(q) || empId.includes(q);
    });
  }, [profiles, search]);

  async function handleSave() {
    setIsSubmitting(true);
    try {
      const res = await assignRoomInCharge({
        roomId,
        inChargeUserId: selectedId,
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to update Room In-Charge');
        return;
      }

      if (selectedId) {
        const assigned = profiles.find((p) => p.id === selectedId);
        toast.success(`Assigned ${assigned?.full_name || 'User'} as In-Charge of ${roomName}`);
      } else {
        toast.success(`Removed In-Charge assignment for ${roomName}`);
      }

      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)} className="cursor-pointer inline-flex">
          {trigger}
        </div>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 h-8 font-medium border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
        >
          <UserCheck className="h-3.5 w-3.5" />
          {currentInCharge ? 'Change In-Charge' : 'Assign In-Charge'}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-5 sm:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <UserCheck className="h-5 w-5" />
              <DialogTitle className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                Assign Room In-Charge
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Designate a faculty or staff member responsible for{' '}
              <strong className="text-zinc-700 dark:text-zinc-200 font-semibold">{roomName}</strong>. This designation is visible campus-wide.
            </DialogDescription>
          </DialogHeader>

          {/* Search Bar */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search faculty name, department, designation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Unassign / Clear Option */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left border transition-all text-xs ${
                selectedId === null
                  ? 'border-red-300 dark:border-red-800/80 bg-red-50/70 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-semibold'
                  : 'border-dashed border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-red-500 shrink-0" />
                <span>No In-Charge (Leave Unassigned)</span>
              </span>
              {selectedId === null && <Check className="h-4 w-4 text-red-600 shrink-0" />}
            </button>
          </div>

          {/* Scrollable Profiles List */}
          <div className="mt-2 max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {filteredProfiles.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                No faculty or staff found matching "{search}"
              </div>
            ) : (
              filteredProfiles.map((p) => {
                const isSelected = selectedId === p.id;
                const initials = (p.full_name || 'U')
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`pt-1.5 first:pt-0 cursor-pointer`}
                  >
                    <div
                      className={`flex items-start justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                          : 'border-zinc-200/70 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                              {p.full_name || 'Unnamed Faculty'}
                            </p>
                            <Badge
                              variant={
                                p.role === 'approver'
                                  ? 'default'
                                  : p.role === 'asset_manager'
                                  ? 'secondary'
                                  : 'neutral'
                              }
                              className="text-[9px] py-0 px-1.5 uppercase font-mono"
                            >
                              {p.role === 'approver'
                                ? 'Approver'
                                : p.role === 'asset_manager'
                                ? 'Manager'
                                : 'Staff'}
                            </Badge>
                          </div>
                          {(p.designation || p.department) && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {p.designation ? `${p.designation} · ` : ''}
                              {p.department || ''}
                            </p>
                          )}
                          {p.employee_id && (
                            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              ID: {p.employee_id}
                            </p>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-indigo-600 text-white hover:bg-indigo-500"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Save Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
