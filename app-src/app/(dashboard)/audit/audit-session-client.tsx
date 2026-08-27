'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { verifyAssetStock, resetRoomStockVerification } from '@/lib/actions/audit';
import { formatDateTime } from '@/lib/utils';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Printer,
  Download,
  RotateCcw,
  Search,
  Filter,
  Package,
  DoorOpen,
  Building,
  ShieldCheck,
  FileCheck,
  Sparkles,
  Info,
} from 'lucide-react';

interface AuditClientProps {
  rooms: any[];
  selectedRoomId: string;
  academicYear: string;
  assets: any[];
  verifications: Record<string, any>;
  auditorName: string;
}

export function AuditSessionClient({
  rooms,
  selectedRoomId,
  academicYear,
  assets,
  verifications: initialVerifications,
  auditorName,
}: AuditClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [verifications, setVerifications] = React.useState<Record<string, any>>(initialVerifications);
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'pending' | 'present' | 'missing' | 'damaged'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [loadingAssetId, setLoadingAssetId] = React.useState<string | null>(null);
  const [printModalOpen, setPrintModalOpen] = React.useState(false);

  React.useEffect(() => {
    setVerifications(initialVerifications);
  }, [initialVerifications]);

  const currentRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];

  // Calculate statistics
  const totalAssets = assets.length;
  const presentCount = Object.values(verifications).filter((v) => v.verification_status === 'present').length;
  const missingCount = Object.values(verifications).filter((v) => v.verification_status === 'missing').length;
  const damagedCount = Object.values(verifications).filter((v) => v.verification_status === 'damaged').length;
  const verifiedTotal = presentCount + missingCount + damagedCount;
  const pendingCount = Math.max(totalAssets - verifiedTotal, 0);
  const progressPct = totalAssets > 0 ? Math.round((verifiedTotal / totalAssets) * 100) : 100;

  async function handleVerify(assetId: string, status: 'present' | 'missing' | 'damaged') {
    setLoadingAssetId(assetId);
    try {
      const res = await verifyAssetStock({
        assetId,
        roomId: selectedRoomId,
        academicYear,
        status,
      });

      setVerifications((prev) => ({
        ...prev,
        [assetId]: res.verification,
      }));

      toast({
        variant: status === 'present' ? 'success' : status === 'missing' ? 'error' : 'warning',
        title: status === 'present' ? 'Verified Present' : status === 'missing' ? 'Flagged Missing' : 'Flagged Damaged',
        description: `Asset recorded as ${status}.`,
      });
    } catch (err: any) {
      toast({ variant: 'error', title: 'Verification Failed', description: err.message });
    } finally {
      setLoadingAssetId(null);
    }
  }

  async function handleResetAll() {
    if (!confirm(`Are you sure you want to reset all physical stock verifications for ${currentRoom?.name}?`)) {
      return;
    }

    try {
      await resetRoomStockVerification(selectedRoomId, academicYear);
      setVerifications({});
      toast({ variant: 'success', title: 'Audit Reset', description: 'Room verification session cleared.' });
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'error', title: 'Reset Failed', description: err.message });
    }
  }

  // Filter items
  const filteredAssets = assets.filter((asset) => {
    const v = verifications[asset.id];
    const status = v ? v.verification_status : 'pending';

    if (activeFilter === 'pending' && status !== 'pending') return false;
    if (activeFilter === 'present' && status !== 'present') return false;
    if (activeFilter === 'missing' && status !== 'missing') return false;
    if (activeFilter === 'damaged' && status !== 'damaged') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTag = asset.asset_tag?.toLowerCase().includes(q);
      const matchName = asset.name?.toLowerCase().includes(q);
      const matchCat = asset.category?.name?.toLowerCase().includes(q);
      return matchTag || matchName || matchCat;
    }

    return true;
  });

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-16">
      {/* ── Top Header & Controls ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Annual Physical Stocktake & Audit
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              <ClipboardCheck className="h-3.5 w-3.5" /> NAAC / NBA Compliance
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Physical stock verification & room-by-room institutional equipment audit ledger
          </p>
        </div>

        {/* Room & Year Pickers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Room Selector */}
          <select
            value={selectedRoomId}
            onChange={(e) => router.push(`/audit?room=${e.target.value}&year=${academicYear}`)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} ({room.floor?.name ?? 'Room'})
              </option>
            ))}
          </select>

          {/* Academic Year */}
          <select
            value={academicYear}
            onChange={(e) => router.push(`/audit?room=${selectedRoomId}&year=${e.target.value}`)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="2025-2026">AY 2025-2026</option>
            <option value="2024-2025">AY 2024-2025</option>
            <option value="2023-2024">AY 2023-2024</option>
          </select>

          {/* Generate Report Button */}
          <Button
            onClick={() => setPrintModalOpen(true)}
            className="gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" /> NAAC Audit Report
          </Button>
        </div>
      </div>

      {/* ── Live Progress & Metric Strip ───────────────────────────── */}
      <Card className="overflow-hidden border-indigo-100 dark:border-indigo-950/60 bg-gradient-to-r from-white via-indigo-50/20 to-purple-50/20 dark:from-zinc-900 dark:via-indigo-950/20 dark:to-zinc-900">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                {currentRoom?.name ?? 'Selected Room'} Verification Session
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Auditor: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{auditorName}</span> · Academic Year {academicYear}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {progressPct}%
              </span>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight text-right">
                <p className="font-bold text-zinc-800 dark:text-zinc-200">
                  {verifiedTotal} / {totalAssets}
                </p>
                <p>Units Verified</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
            <div
              style={{ width: `${(presentCount / (totalAssets || 1)) * 100}%` }}
              className="h-full bg-emerald-500 transition-all"
              title={`Present: ${presentCount}`}
            />
            <div
              style={{ width: `${(damagedCount / (totalAssets || 1)) * 100}%` }}
              className="h-full bg-amber-500 transition-all"
              title={`Damaged: ${damagedCount}`}
            />
            <div
              style={{ width: `${(missingCount / (totalAssets || 1)) * 100}%` }}
              className="h-full bg-rose-500 transition-all"
              title={`Missing: ${missingCount}`}
            />
          </div>

          {/* Metric Pills / Filter Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            <button
              onClick={() => setActiveFilter('all')}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                activeFilter === 'all'
                  ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/60 font-bold text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50'
              }`}
            >
              <p className="text-xs">All Expected</p>
              <p className="text-lg font-extrabold">{totalAssets}</p>
            </button>

            <button
              onClick={() => setActiveFilter('present')}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                activeFilter === 'present'
                  ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 font-bold text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50'
              }`}
            >
              <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ Present</p>
              <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{presentCount}</p>
            </button>

            <button
              onClick={() => setActiveFilter('pending')}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                activeFilter === 'pending'
                  ? 'border-indigo-500 bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-900 dark:text-white ring-2 ring-zinc-500/20'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50'
              }`}
            >
              <p className="text-xs text-zinc-500">⏳ Pending</p>
              <p className="text-lg font-extrabold text-zinc-800 dark:text-zinc-200">{pendingCount}</p>
            </button>

            <button
              onClick={() => setActiveFilter('damaged')}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                activeFilter === 'damaged'
                  ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/60 font-bold text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50'
              }`}
            >
              <p className="text-xs text-amber-600 dark:text-amber-400">🔧 Damaged</p>
              <p className="text-lg font-extrabold text-amber-700 dark:text-amber-300">{damagedCount}</p>
            </button>

            <button
              onClick={() => setActiveFilter('missing')}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                activeFilter === 'missing'
                  ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/60 font-bold text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50'
              }`}
            >
              <p className="text-xs text-rose-600 dark:text-rose-400">⚠️ Missing</p>
              <p className="text-lg font-extrabold text-rose-700 dark:text-rose-300">{missingCount}</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── Search & Filter Tools ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Quick search tag, serial, model…"
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAll}
            className="text-xs text-zinc-500 hover:text-rose-600 gap-1.5"
          >
            <RotateCcw className="h-3 w-3" /> Reset Room Audit
          </Button>
        </div>
      </div>

      {/* ── Verification Checklist Table ──────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/60 uppercase font-semibold text-zinc-500 dark:text-zinc-400 text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Asset Tag</th>
                <th className="px-4 py-3">Equipment Details</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Audit Verification State</th>
                <th className="px-4 py-3 text-right">Physical Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-zinc-700 dark:text-zinc-300">No assets match filter</p>
                    <p className="text-[11px] mt-0.5">Try clearing your search query or status filter.</p>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const v = verifications[asset.id];
                  const status = v ? v.verification_status : 'pending';
                  const isLoading = loadingAssetId === asset.id;

                  return (
                    <tr
                      key={asset.id}
                      className={`transition-colors ${
                        status === 'present'
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                          : status === 'missing'
                          ? 'bg-rose-50/30 dark:bg-rose-950/20'
                          : status === 'damaged'
                          ? 'bg-amber-50/30 dark:bg-amber-950/20'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      {/* Asset Tag */}
                      <td className="px-4 py-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        <Link href={`/inventory/${asset.id}`} target="_blank" className="hover:underline">
                          {asset.asset_tag}
                        </Link>
                      </td>

                      {/* Equipment Details */}
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-zinc-900 dark:text-white">{asset.name}</p>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                          {asset.model_number ? `Model: ${asset.model_number}` : ''}
                          {asset.serial_number ? ` · S/N: ${asset.serial_number}` : ''}
                          {asset.acquisition_year ? ` · Year: ${asset.acquisition_year}` : ''}
                        </p>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                          {asset.category?.name ?? 'General'}
                        </span>
                      </td>

                      {/* Verification Status */}
                      <td className="px-4 py-3.5">
                        {status === 'present' && (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" /> Present & Verified
                          </span>
                        )}
                        {status === 'missing' && (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                            <XCircle className="h-4 w-4" /> Flagged Missing
                          </span>
                        )}
                        {status === 'damaged' && (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4" /> Damaged / Repair
                          </span>
                        )}
                        {status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500 font-medium">
                            <Clock className="h-3.5 w-3.5" /> Pending Physical Check
                          </span>
                        )}
                      </td>

                      {/* Physical Verification Action Buttons */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Present Button */}
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleVerify(asset.id, 'present')}
                            className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${
                              status === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white'
                            }`}
                            title="Mark Verified Present"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Present
                          </button>

                          {/* Damaged Button */}
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleVerify(asset.id, 'damaged')}
                            className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${
                              status === 'damaged'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-600 hover:text-white'
                            }`}
                            title="Flag Damaged or Service Required"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" /> Damaged
                          </button>

                          {/* Missing Button */}
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleVerify(asset.id, 'missing')}
                            className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${
                              status === 'missing'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-600 hover:text-white'
                            }`}
                            title="Flag Missing / Not Found"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Missing
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── NAAC / NBA Formal Printable Report Modal ────────────────── */}
      {printModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            {/* Certificate Letterhead */}
            <div className="text-center border-b border-zinc-200 dark:border-zinc-800 pb-5 space-y-1">
              <div className="flex items-center justify-center gap-3 mb-2">
                <img src="/spit-logo-light.jpg" alt="SPIT" className="h-12 w-12 object-contain dark:hidden" />
                <img src="/spit-logo-dark.png" alt="SPIT" className="h-12 w-12 object-contain hidden dark:block" />
                <div className="text-left">
                  <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                    SARDAR PATEL INSTITUTE OF TECHNOLOGY
                  </h2>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    (Autonomous Institute Affiliated to University of Mumbai) · Munshi Nagar, Andheri (W), Mumbai - 400058
                  </p>
                </div>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 pt-2">
                PHYSICAL STOCK VERIFICATION CERTIFICATE (NAAC / NBA AUDIT)
              </h3>
              <p className="text-xs text-zinc-500">
                Academic Year: <span className="font-bold">{academicYear}</span> · Session Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Room & Verification Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl text-xs">
              <div>
                <p className="text-zinc-400 font-medium">Laboratory / Room</p>
                <p className="font-bold text-zinc-900 dark:text-white text-sm">{currentRoom?.name}</p>
              </div>
              <div>
                <p className="text-zinc-400 font-medium">Location</p>
                <p className="font-bold text-zinc-900 dark:text-white text-sm">{currentRoom?.floor?.name ?? 'Main Building'}</p>
              </div>
              <div>
                <p className="text-zinc-400 font-medium">Total Registered Units</p>
                <p className="font-bold text-zinc-900 dark:text-white text-sm">{totalAssets} items</p>
              </div>
              <div>
                <p className="text-zinc-400 font-medium">Compliance Health</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {progressPct}% Verified ({presentCount} Present)
                </p>
              </div>
            </div>

            {/* Summary Findings */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
                Stock Audit Breakdown
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20">
                  <p className="font-bold text-emerald-700 dark:text-emerald-300 text-base">{presentCount}</p>
                  <p className="text-[10px] text-emerald-600">Physical Units Verified Present</p>
                </div>
                <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20">
                  <p className="font-bold text-amber-700 dark:text-amber-300 text-base">{damagedCount}</p>
                  <p className="text-[10px] text-amber-600">Flagged Damaged / Maintenance Needed</p>
                </div>
                <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20">
                  <p className="font-bold text-rose-700 dark:text-rose-300 text-base">{missingCount}</p>
                  <p className="text-[10px] text-rose-600">Flagged Missing / Unaccounted</p>
                </div>
              </div>
            </div>

            {/* Sign-off Blocks */}
            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs">
              <div className="space-y-12">
                <p className="text-[11px] text-zinc-400">Verified By (Auditor / Staff)</p>
                <div className="border-t border-dashed border-zinc-400 pt-1 font-bold text-zinc-800 dark:text-zinc-200">
                  {auditorName}
                </div>
              </div>
              <div className="space-y-12">
                <p className="text-[11px] text-zinc-400">Laboratory / Room In-Charge</p>
                <div className="border-t border-dashed border-zinc-400 pt-1 font-bold text-zinc-800 dark:text-zinc-200">
                  Signature & Seal
                </div>
              </div>
              <div className="space-y-12">
                <p className="text-[11px] text-zinc-400">Head of Department / Principal</p>
                <div className="border-t border-dashed border-zinc-400 pt-1 font-bold text-zinc-800 dark:text-zinc-200">
                  SPIT Institutional Authority
                </div>
              </div>
            </div>

            {/* Print Controls */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="outline" onClick={() => setPrintModalOpen(false)}>
                Close
              </Button>
              <Button onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" /> Print Stocktake Certificate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
