import React, { useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Tailwind max-width class for the panel (default: max-w-2xl) */
  maxWidth?: string;
  /** When false, children manage their own scroll (e.g. tabbed forms). Default: true */
  scrollBody?: boolean;
  bodyClassName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AdminModal({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  maxWidth = 'max-w-2xl',
  scrollBody = true,
  bodyClassName,
  children,
  footer,
}: AdminModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 5000,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              minHeight: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) onOpenChange(false);
            }}
          >
            <DialogPrimitive.Content
              asChild
              onPointerDownOutside={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
              onFocusOutside={(e) => e.preventDefault()}
              aria-describedby={undefined}
            >
              <div
                style={{ position: 'relative', zIndex: 5001 }}
                className={cn(
                  'flex w-full max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-xl',
                  maxWidth,
                )}
              >
                {/* Sticky header */}
                <div className="sticky top-0 z-10 shrink-0 border-b border-gray-200 bg-white px-6 py-4 pr-12">
                  <div className="flex items-center gap-3">
                    {icon && <span className="text-gray-500">{icon}</span>}
                    <div>
                      <DialogPrimitive.Title className="text-lg font-semibold text-gray-900">
                        {title}
                      </DialogPrimitive.Title>
                      {subtitle && (
                        <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
                      )}
                    </div>
                  </div>
                  <DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100">
                    <XIcon className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </DialogPrimitive.Close>
                </div>

                {/* Body */}
                <div
                  className={cn(
                    scrollBody
                      ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain'
                      : 'flex min-h-0 flex-1 flex-col overflow-hidden',
                    bodyClassName,
                  )}
                >
                  {children}
                </div>

                {/* Sticky footer */}
                {footer && (
                  <div className="sticky bottom-0 flex w-full shrink-0 border-t border-gray-200 bg-white px-6 py-4">
                    {footer}
                  </div>
                )}
              </div>
            </DialogPrimitive.Content>
          </div>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
