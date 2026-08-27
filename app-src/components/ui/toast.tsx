'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitive.Provider;
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-[380px]',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

const TOAST_STYLES: Record<ToastVariant, { container: string; icon: React.ReactNode }> = {
  success: {
    container: 'border-emerald-200 bg-emerald-50',
    icon: <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />,
  },
  error: {
    container: 'border-red-200 bg-red-50',
    icon: <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />,
  },
  warning: {
    container: 'border-amber-200 bg-amber-50',
    icon: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />,
  },
  info: {
    container: 'border-blue-200 bg-blue-50',
    icon: <Info className="h-4 w-4 text-blue-600 shrink-0" />,
  },
};

export interface ToastData {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastData[];
  toast: (toast: Omit<ToastData, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastRoot');
  return ctx;
}

export function ToastRoot({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const toast = React.useCallback((data: Omit<ToastData, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...data, id }]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      <ToastProvider swipeDirection="right">
        {children}
        {toasts.map((t) => {
          const styles = TOAST_STYLES[t.variant];
          return (
            <ToastPrimitive.Root
              key={t.id}
              duration={t.duration ?? 4000}
              onOpenChange={(open) => { if (!open) dismiss(t.id); }}
              className={cn(
                'group pointer-events-auto relative flex w-full items-start gap-3',
                'rounded-xl border p-4 shadow-lg',
                'data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full data-[state=open]:fade-in-0',
                'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full data-[state=closed]:fade-out-0',
                'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
                'data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=end]:animate-out data-[swipe=end]:fade-out-0',
                styles.container
              )}
            >
              <div className="mt-0.5">{styles.icon}</div>
              <div className="flex-1 min-w-0">
                <ToastPrimitive.Title className="text-sm font-semibold text-zinc-900">
                  {t.title}
                </ToastPrimitive.Title>
                {t.description && (
                  <ToastPrimitive.Description className="mt-0.5 text-xs text-zinc-600">
                    {t.description}
                  </ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close
                className="shrink-0 rounded-md p-0.5 text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  );
}
