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
import { createClient } from '@/lib/supabase/client';
import { submitPhotoApprovalRequest } from '@/lib/actions/requests';
import { toast } from 'sonner';
import {
  Camera,
  UploadCloud,
  X,
  Loader2,
  ShieldAlert,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';

interface AssetCaptureDialogProps {
  assetId: string;
  assetTag: string;
  assetName: string;
  trigger?: React.ReactNode;
}

export function AssetCaptureDialog({
  assetId,
  assetTag,
  assetName,
  trigger,
}: AssetCaptureDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');
  const [uploading, setUploading] = React.useState(false);

  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Clean up object URL on unmount or file change
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleSelectFile(selectedFile: File | undefined) {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File too large: Max image size is 10MB.');
      return;
    }

    setFile(selectedFile);
    const objUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objUrl);
  }

  function handleClear() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit() {
    if (!file) {
      toast.error('Please take or select a photo first.');
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const cleanExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '');
      const filename = `${assetId}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${cleanExt}`;

      // 1. Upload to Supabase Storage asset-photos bucket
      const { error: uploadErr } = await supabase.storage
        .from('asset-photos')
        .upload(filename, file, {
          contentType: file.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadErr) {
        throw new Error(`Storage upload failed: ${uploadErr.message}`);
      }

      // 2. Obtain Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('asset-photos').getPublicUrl(filename);

      // 3. Submit change request for Approver authorization
      const res = await submitPhotoApprovalRequest({
        assetId,
        storagePath: filename,
        publicUrl,
        reason: reason.trim() || `Physical audit photo captured for ${assetTag}`,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });

      if (!res?.success) {
        throw new Error('Failed to record photo approval request.');
      }

      toast.success(
        `Photo for ${assetTag} submitted! It will appear after Approver verification.`,
        { duration: 5000 }
      );

      setOpen(false);
      handleClear();
      setReason('');
      router.refresh();
    } catch (err: any) {
      console.error('Photo submission error:', err);
      toast.error(err.message || 'Could not upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      {/* Hidden inputs for camera capture & file chooser */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleSelectFile(e.target.files?.[0])}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => handleSelectFile(e.target.files?.[0])}
      />

      {trigger ? (
        <span onClick={() => setOpen(true)} className="inline-flex cursor-pointer">
          {trigger}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
          title={`Take or upload photo for ${assetTag}`}
        >
          <Camera className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Photo</span>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-5 sm:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Camera className="h-5 w-5" />
              <DialogTitle className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                Equipment Photo Capture
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Capture or upload an image for{' '}
              <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{assetName}</strong>{' '}
              <span className="font-mono text-zinc-500">({assetTag})</span>.
            </DialogDescription>
          </DialogHeader>

          {/* Verification Notice */}
          <div className="flex items-start gap-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 p-2.5 border border-amber-200/80 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <p>
              Uploaded photos require <strong>Approver authorization</strong> before being linked to the asset and published campus-wide.
            </p>
          </div>

          {/* Photo Capture / Preview Box */}
          {!previewUrl ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/40 p-6 text-center space-y-3 transition-colors hover:border-indigo-400 dark:hover:border-indigo-500">
              <div className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ImageIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Take a photo or select an image
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  JPG, PNG, or WebP up to 10MB
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Snap with Camera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5 text-xs"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Browse Files
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-950 group">
                <img
                  src={previewUrl}
                  alt="Captured asset preview"
                  className="h-full w-full object-contain"
                />
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute top-2 right-2 rounded-full bg-black/70 hover:bg-red-600 text-white p-1.5 transition-colors shadow-md"
                  title="Remove and retake photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <span className="absolute bottom-2 left-2 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 font-mono">
                  {file?.name} ({(file!.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Retake / Choose different image
                </button>
              </div>
            </div>
          )}

          {/* Audit Note / Reason Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Verification Note / Reason <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Annual NAAC stocktake photo verification"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <DialogFooter className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                handleClear();
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="bg-indigo-600 text-white hover:bg-indigo-500"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Uploading…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Submit for Approval
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
