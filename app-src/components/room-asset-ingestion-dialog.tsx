'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
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
import {
  validateAssetImport,
  commitAssetImport,
  ValidationReport,
  ValidatedImportRow,
} from '@/lib/actions/ingestion';
import { toast } from 'sonner';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  Sparkles,
  DoorOpen,
  HelpCircle,
} from 'lucide-react';

interface RoomAssetIngestionDialogProps {
  roomId?: string;
  roomName?: string;
  roomNumber?: string | null;
  rooms?: { id: string; name: string; room_number: string | null }[];
  trigger?: React.ReactNode;
}

export function RoomAssetIngestionDialog({
  roomId: initialRoomId,
  roomName: initialRoomName,
  roomNumber: initialRoomNumber,
  rooms = [],
  trigger,
}: RoomAssetIngestionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  // Wizard state: 'upload' -> 'preview' -> 'success'
  const [step, setStep] = React.useState<'upload' | 'preview' | 'success'>('upload');

  // Form & Selection
  const [selectedRoomId, setSelectedRoomId] = React.useState<string>(initialRoomId || '');
  const [file, setFile] = React.useState<File | null>(null);
  const [parsing, setParsing] = React.useState(false);
  const [committing, setCommitting] = React.useState(false);

  // Validation data
  const [report, setReport] = React.useState<ValidationReport | null>(null);
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'valid' | 'warning' | 'error'>('all');
  const [skipErrors, setSkipErrors] = React.useState(true);

  // Result summary
  const [importResult, setImportResult] = React.useState<{
    importedCount: number;
    skippedCount: number;
    firstTag?: string;
    lastTag?: string;
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset state when opening/closing
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('upload');
        setFile(null);
        setReport(null);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 300);
    }
  }, [open]);

  // Current active target room info
  const currentRoom = React.useMemo(() => {
    if (initialRoomId) {
      return { id: initialRoomId, name: initialRoomName || 'Current Room', room_number: initialRoomNumber };
    }
    return rooms.find((r) => r.id === selectedRoomId) || null;
  }, [initialRoomId, initialRoomName, initialRoomNumber, rooms, selectedRoomId]);

  // Handle template download
  function handleDownloadTemplate() {
    const params = new URLSearchParams();
    if (currentRoom?.id) {
      params.set('roomId', currentRoom.id);
    }
    const url = `/api/import/template?${params.toString()}`;
    window.open(url, '_blank');
  }

  // Parse uploaded file client-side then run pre-flight validation on server
  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setFile(selected);
    setParsing(true);

    try {
      const buffer = await selected.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Prefer sheet named "Asset Ingestion", fallback to first sheet
      const sheetName =
        workbook.SheetNames.find((s) => s.toLowerCase().includes('asset') || s.toLowerCase().includes('ingest')) ||
        workbook.SheetNames[0];

      const worksheet = workbook.Sheets[sheetName];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      if (rawJson.length === 0) {
        throw new Error('Spreadsheet appears to be empty. Please fill in rows under "Asset Ingestion".');
      }

      // Execute safety railroads validation on server
      const validationReport = await validateAssetImport({
        rawRows: rawJson,
        targetRoomId: currentRoom?.id,
      });

      setReport(validationReport);
      setStep('preview');
      toast.success(
        `Parsed ${validationReport.totalOriginalRows} rows (${validationReport.totalExpandedItems} expanded items).`
      );
    } catch (err: any) {
      console.error('File parsing error:', err);
      toast.error(err.message || 'Could not parse spreadsheet. Please check format.');
      setFile(null);
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Commit valid assets into the database
  async function handleCommit() {
    if (!report) return;

    const itemsToImport = skipErrors ? report.rows.filter((r) => r.isValid) : report.rows;

    if (itemsToImport.length === 0) {
      toast.error('No valid items to import. Please resolve the highlighted errors.');
      return;
    }

    setCommitting(true);
    try {
      const res = await commitAssetImport({
        items: report.rows,
        skipErrors,
        sourceFileName: file?.name || 'Room_Ingestion.xlsx',
      });

      if (!res.success) throw new Error('Commit failed');

      setImportResult(res);
      setStep('success');
      toast.success(`Successfully ingested ${res.importedCount} assets!`, { duration: 5000 });
      router.refresh();
    } catch (err: any) {
      console.error('Ingestion commit error:', err);
      toast.error(err.message || 'Failed to commit assets.');
    } finally {
      setCommitting(false);
    }
  }

  // Filtered rows for the preview matrix
  const displayedRows = React.useMemo(() => {
    if (!report) return [];
    if (activeFilter === 'valid') return report.rows.filter((r) => r.isValid && r.warnings.length === 0);
    if (activeFilter === 'warning') return report.rows.filter((r) => r.isValid && r.warnings.length > 0);
    if (activeFilter === 'error') return report.rows.filter((r) => !r.isValid);
    return report.rows;
  }, [report, activeFilter]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileSelected}
      />

      {trigger ? (
        <span onClick={() => setOpen(true)} className="inline-flex cursor-pointer">
          {trigger}
        </span>
      ) : (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
        >
          <Upload className="h-4 w-4" />
          <span>Ingest Assets (Excel)</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-5 sm:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <DialogHeader className="shrink-0 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="h-5 w-5" />
              <DialogTitle className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                Room-Wise Asset Ingestion
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Bulk register equipment into campus facilities with automated tag generation and pre-flight safety railroads.
            </DialogDescription>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* ── STEP 1: UPLOAD & TEMPLATE ── */}
            {step === 'upload' && (
              <div className="space-y-4">
                {/* Target Room Banner */}
                {currentRoom ? (
                  <div className="flex items-center justify-between rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 border border-indigo-100 dark:border-indigo-900/50">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                        <DoorOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">
                          Target Destination Facility
                        </p>
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">
                          {currentRoom.name}{' '}
                          {currentRoom.room_number && (
                            <span className="font-mono text-zinc-500 font-normal">
                              ({currentRoom.room_number})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadTemplate}
                      className="gap-1.5 text-xs border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Get Pre-Filled Template
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Destination Room <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                        className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select target room (or specify per-row in Excel)…</option>
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} {r.room_number ? `(${r.room_number})` : ''}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadTemplate}
                        className="gap-1 text-xs shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Template
                      </Button>
                    </div>
                  </div>
                )}

                {/* Drag and Drop Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/40 p-8 text-center cursor-pointer transition-colors hover:border-indigo-500 hover:bg-indigo-50/20 group"
                >
                  <div className="h-14 w-14 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    {parsing ? (
                      <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
                    ) : (
                      <Upload className="h-7 w-7 text-indigo-600" />
                    )}
                  </div>

                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {parsing ? 'Reading and validating spreadsheet…' : 'Click or drop Excel spreadsheet here'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Accepts .XLSX, .XLS, or .CSV with standard headers
                  </p>

                  <Button
                    type="button"
                    size="sm"
                    className="mt-4 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white pointer-events-none"
                  >
                    Select File to Inspect
                  </Button>
                </div>

                {/* Railroads Explanation Card */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-850 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Built-in Safe Railroads (Guardrails)
                  </div>
                  <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 pl-5 list-disc">
                    <li>
                      <strong>Pre-Flight Dry Run:</strong> Data is validated in-memory before committing. You will see an interactive preview of all items.
                    </li>
                    <li>
                      <strong>Duplicate Prevention:</strong> Tags are cross-checked against existing inventory to avoid primary key conflicts.
                    </li>
                    <li>
                      <strong>Smart Serial Expansion:</strong> Rows with Quantity &gt; 1 automatically expand into distinct individual physical units.
                    </li>
                    <li>
                      <strong>Blank Tag Support:</strong> Leave tags blank if items are unassigned. They will be saved with no tag so you can barcode them later.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* ── STEP 2: PREVIEW & RAILROAD INSPECTION ── */}
            {step === 'preview' && report && (
              <div className="space-y-4">
                {/* Metric Summary Counters */}
                <div className="grid grid-cols-4 gap-2.5 text-center">
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5">
                    <p className="text-[10px] uppercase font-bold text-zinc-500">Total Items</p>
                    <p className="text-xl font-extrabold text-zinc-900 dark:text-white">
                      {report.totalExpandedItems}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/40 p-2.5">
                    <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                      Ready
                    </p>
                    <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">
                      {report.validCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/40 p-2.5">
                    <p className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">
                      Warnings
                    </p>
                    <p className="text-xl font-extrabold text-amber-700 dark:text-amber-400">
                      {report.warningCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/40 p-2.5">
                    <p className="text-[10px] uppercase font-bold text-red-700 dark:text-red-400">
                      Errors
                    </p>
                    <p className="text-xl font-extrabold text-red-700 dark:text-red-400">
                      {report.errorCount}
                    </p>
                  </div>
                </div>

                {/* Error Banner if any */}
                {report.errorCount > 0 && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 p-3 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <p className="font-semibold">
                        Safety Railroad Alert: {report.errorCount} items have issues.
                      </p>
                      <p className="mt-0.5 text-red-700 dark:text-red-400">
                        {skipErrors
                          ? 'Valid items will be imported. Errored items will be safely bypassed.'
                          : 'Please fix the spreadsheet errors or enable "Skip invalid items" below to proceed.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Filter Tabs & Safety Toggles */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveFilter('all')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                        activeFilter === 'all'
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      All ({report.rows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('valid')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                        activeFilter === 'valid'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      Clean ({report.validCount - report.warningCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('warning')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                        activeFilter === 'warning'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      Warnings ({report.warningCount})
                    </button>
                    {report.errorCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveFilter('error')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                          activeFilter === 'error'
                            ? 'bg-red-600 text-white'
                            : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                        }`}
                      >
                        Errors ({report.errorCount})
                      </button>
                    )}
                  </div>

                  {/* Railroad control toggle */}
                  {report.errorCount > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={skipErrors}
                        onChange={(e) => setSkipErrors(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Skip invalid items and import valid ones</span>
                    </label>
                  )}
                </div>

                {/* Pre-Flight Preview Matrix */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-64 overflow-y-auto">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/80 sticky top-0 font-semibold text-zinc-600 dark:text-zinc-300">
                      <tr>
                        <th className="px-3 py-2 text-left w-12">#</th>
                        <th className="px-3 py-2 text-left">Asset Name</th>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-left">Asset Tag</th>
                        <th className="px-3 py-2 text-left">Destination</th>
                        <th className="px-3 py-2 text-left">Diagnostics</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                      {displayedRows.map((row) => (
                        <tr
                          key={row.tempId}
                          className={
                            !row.isValid
                              ? 'bg-red-50/40 dark:bg-red-950/20'
                              : row.warnings.length > 0
                              ? 'bg-amber-50/30 dark:bg-amber-950/10'
                              : ''
                          }
                        >
                          <td className="px-3 py-2 text-zinc-400 font-mono">
                            {row.originalRowNumber}
                            {row.totalInGroup > 1 ? `.${row.itemIndex}` : ''}
                          </td>
                          <td className="px-3 py-2 font-medium text-zinc-900 dark:text-white">
                            {row.name}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="default" className="text-[10px]">
                              {row.categoryName}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px]">
                            {row.assetTag ? (
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                {row.assetTag}
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded text-[10px]">
                                — (Blank)
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300 text-[11px]">
                            {row.roomName} {row.roomNumber ? `(${row.roomNumber})` : ''}
                          </td>
                          <td className="px-3 py-2 text-[11px]">
                            {row.isValid ? (
                              row.warnings.length > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {row.warnings[0]}
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Ready
                                </span>
                              )
                            ) : (
                              <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                <XCircle className="h-3 w-3 shrink-0" />
                                {row.errors[0]}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── STEP 3: SUCCESS SUMMARY ── */}
            {step === 'success' && importResult && (
              <div className="text-center py-6 space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="h-10 w-10" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Asset Ingestion Complete!
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                    {importResult.importedCount} equipment items have been recorded in the register and allocated to their facilities.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-3.5 max-w-md mx-auto text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total Ingested:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {importResult.importedCount} assets
                    </span>
                  </div>
                  {importResult.skippedCount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Skipped Errors:</span>
                      <span className="font-medium text-zinc-600 dark:text-zinc-300">
                        {importResult.skippedCount} items
                      </span>
                    </div>
                  )}
                  {importResult.firstTag && (
                    <div className="flex justify-between pt-1 border-t border-zinc-200 dark:border-zinc-700">
                      <span className="text-zinc-500">Allocated Tag Range:</span>
                      <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold text-[11px]">
                        {importResult.firstTag} → {importResult.lastTag}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <DialogFooter className="shrink-0 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
            {step === 'upload' && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={parsing}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Select Spreadsheet
                </Button>
              </>
            )}

            {step === 'preview' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('upload')}
                  disabled={committing}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Re-Upload File
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCommit}
                  disabled={
                    committing ||
                    (report?.errorCount ?? 0) > 0 && !skipErrors ||
                    (report?.validCount ?? 0) === 0
                  }
                  className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
                >
                  {committing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Ingesting Assets…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Commit Ingestion ({skipErrors ? report?.validCount : report?.totalExpandedItems} Assets)
                    </>
                  )}
                </Button>
              </>
            )}

            {step === 'success' && (
              <div className="w-full flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Done
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
