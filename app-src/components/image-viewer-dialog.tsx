'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function ImageViewerDialog({ url, alt = 'Image', children, className }: { url: string, alt?: string, children: React.ReactNode, className?: string }) {
  const [open, setOpen] = React.useState(false);
  
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-1 bg-black/95 border-none shadow-2xl h-[90vh] flex flex-col justify-center">
          <DialogTitle className="sr-only">Image View</DialogTitle>
          <DialogDescription className="sr-only">Full size view of the image</DialogDescription>
          <img src={url} alt={alt} className="w-full h-full object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}
