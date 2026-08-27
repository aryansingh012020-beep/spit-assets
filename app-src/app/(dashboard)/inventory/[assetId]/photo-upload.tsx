'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { createClient } from '@/lib/supabase/client';
import { UploadCloud, Camera, Trash2, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react';

interface PhotoUploadProps {
  assetId: string;
  initialPhotos: { id: string; url: string; is_primary: boolean; uploaded_at: string }[];
  canManage: boolean;
}

export function PhotoUpload({ assetId, initialPhotos, canManage }: PhotoUploadProps) {
  const [photos, setPhotos] = React.useState(initialPhotos);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'error', title: 'Invalid File', description: 'Please select an image file (JPEG, PNG, WebP).' });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast({ variant: 'error', title: 'File Too Large', description: 'Image size must be under 8MB.' });
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const filename = `${assetId}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('asset-photos')
        .upload(filename, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('asset-photos')
        .getPublicUrl(filename);

      // Insert record
      const isPrimary = photos.length === 0;
      const { data: photoRecord, error: insertError } = await supabase
        .from('asset_photos')
        .insert({
          asset_id: assetId,
          url: publicUrl,
          is_primary: isPrimary,
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      setPhotos(prev => [photoRecord, ...prev]);
      toast({ variant: 'success', title: 'Photo Uploaded', description: 'Asset photo attached successfully.' });
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'error', title: 'Upload Failed', description: err.message || 'Could not upload photo' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeletePhoto(photoId: string, photoUrl: string) {
    try {
      const supabase = createClient();
      await supabase.from('asset_photos').delete().eq('id', photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      toast({ variant: 'success', title: 'Photo Removed' });
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'error', title: 'Delete Failed', description: err.message });
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex items-center justify-between">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            isLoading={uploading}
            className="gap-2"
          >
            <Camera className="h-4 w-4" />
            Upload Photo
          </Button>
          <span className="text-[11px] text-zinc-400">JPG, PNG, WebP up to 8MB</span>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 p-8 text-center bg-zinc-50/50">
          <ImageIcon className="h-8 w-8 text-zinc-300 mb-2" />
          <p className="text-xs font-medium text-zinc-600">No photos attached yet</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Upload visual proof or condition images for audits</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map(p => (
            <div key={p.id} className="group relative aspect-video rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100">
              <img
                src={p.url}
                alt="Asset photo"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              {p.is_primary && (
                <span className="absolute top-2 left-2 rounded bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 shadow">
                  PRIMARY
                </span>
              )}
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(p.id, p.url)}
                  className="absolute top-2 right-2 rounded-full bg-black/60 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  aria-label="Delete photo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
