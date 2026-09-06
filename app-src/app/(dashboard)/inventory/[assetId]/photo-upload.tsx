'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Camera, Trash2, Image as ImageIcon, ExternalLink, ShieldCheck } from 'lucide-react';
import { AssetCaptureDialog } from '@/components/asset-capture-dialog';
import { createClient } from '@/lib/supabase/client';

interface PhotoUploadProps {
  assetId: string;
  assetName?: string;
  assetTag?: string;
  initialPhotos: { id: string; url: string; is_primary: boolean; uploaded_at: string }[];
  canManage: boolean;
}

export function PhotoUpload({
  assetId,
  assetName = 'Asset',
  assetTag = '',
  initialPhotos,
  canManage,
}: PhotoUploadProps) {
  const [photos, setPhotos] = React.useState(initialPhotos);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  async function handleDeletePhoto(e: React.MouseEvent, photoId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this photo record?')) return;

    setDeletingId(photoId);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('asset_photos').delete().eq('id', photoId);
      if (error) throw error;

      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast({ variant: 'success', title: 'Photo Removed', description: 'Asset photo has been unlinked.' });
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'error', title: 'Delete Failed', description: err.message || 'Could not delete photo' });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
          <AssetCaptureDialog
            assetId={assetId}
            assetName={assetName}
            assetTag={assetTag}
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
              >
                <Camera className="h-4 w-4" />
                <span>Snap / Upload Photo</span>
              </Button>
            }
          />
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Approver verification required before publishing</span>
          </div>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-2">
            <ImageIcon className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">No verified photos attached yet</p>
          <p className="text-[11px] text-zinc-400 max-w-sm mt-0.5">
            Capture an equipment condition photo or physical audit tag. Once verified by an Approver, it will be displayed here.
          </p>
          {canManage && (
            <div className="mt-3">
              <AssetCaptureDialog
                assetId={assetId}
                assetName={assetName}
                assetTag={assetTag}
                trigger={
                  <Button size="sm" className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white">
                    <Camera className="h-3.5 w-3.5" />
                    Take First Photo
                  </Button>
                }
              />
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-video rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-950 block shadow-sm hover:shadow-md transition-all"
              title="Click to view full size image"
            >
              <img
                src={p.url}
                alt="Asset visual record"
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors pointer-events-none" />

              {p.is_primary && (
                <span className="absolute top-2 left-2 rounded-md bg-indigo-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 shadow">
                  PRIMARY
                </span>
              )}

              <span className="absolute bottom-2 left-2 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-mono">
                <ExternalLink className="h-2.5 w-2.5" /> View
              </span>

              {canManage && (
                <button
                  type="button"
                  onClick={(e) => handleDeletePhoto(e, p.id)}
                  disabled={deletingId === p.id}
                  className="absolute top-2 right-2 rounded-full bg-black/60 text-white p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow"
                  aria-label="Remove photo"
                  title="Remove photo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

