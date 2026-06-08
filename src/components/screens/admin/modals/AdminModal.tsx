import React, { useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  guardModalDismissOnPortaledOverlay,
  isAnyPortaledOverlayOpen,
  shouldDismissAdminModalBackdrop,
} from '@/components/ui/modalOverlayGuards';

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
  const backdropPointerDownRef = useRef(false);
  const portaledOverlayOpenOnPointerDownRef = useRef(false);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    console.debug('[admin-modal][open-state]', {
      title,
      open,
      pathname: window.location.pathname,
      activeElement: document.activeElement
        ? {
            tag: (document.activeElement as HTMLElement).tagName,
            className: (document.activeElement as HTMLElement).className,
            dataRole: (document.activeElement as HTMLElement).getAttribute('data-role'),
          }
        : null,
    });
    if (open) {
      previouslyFocusedRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        console.debug('[admin-modal][root-onOpenChange]', {
          title,
          pathname: window.location.pathname,
          openBefore: open,
          openAfter: nextOpen,
          activeElement: document.activeElement
            ? {
                tag: (document.activeElement as HTMLElement).tagName,
                className: (document.activeElement as HTMLElement).className,
                dataRole: (document.activeElement as HTMLElement).getAttribute('data-role'),
              }
            : null,
        });
        if (!nextOpen) {
          console.log('[MODAL CLOSE]', {
            reason: 'DialogPrimitive.Root onOpenChange(false)',
            title,
            pathname: window.location.pathname,
          });
        }
        onOpenChange(nextOpen);
      }}
    >
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
            onPointerDown={(e) => {
              backdropPointerDownRef.current = e.target === e.currentTarget;
              portaledOverlayOpenOnPointerDownRef.current = isAnyPortaledOverlayOpen();
              console.debug('[admin-modal][backdrop][onPointerDown]', {
                title,
                pathname: window.location.pathname,
                isBackdropPointerDown: backdropPointerDownRef.current,
                portaledOverlayOpen: portaledOverlayOpenOnPointerDownRef.current,
                targetTag: (e.target as HTMLElement | null)?.tagName || null,
              });
            }}
            onClick={(e) => {
              const shouldClose = shouldDismissAdminModalBackdrop(
                e,
                backdropPointerDownRef.current,
                portaledOverlayOpenOnPointerDownRef.current,
              );
              console.debug('[admin-modal][backdrop][onClick]', {
                title,
                pathname: window.location.pathname,
                isBackdropClick: e.target === e.currentTarget,
                backdropPointerDown: backdropPointerDownRef.current,
                portaledOverlayOpenOnPointerDown: portaledOverlayOpenOnPointerDownRef.current,
                shouldClose,
              });
              if (shouldClose) {
                console.log('[MODAL CLOSE]', {
                  reason: 'overlay container onClick (backdrop)',
                  title,
                  pathname: window.location.pathname,
                });
                onOpenChange(false);
              }
              backdropPointerDownRef.current = false;
              portaledOverlayOpenOnPointerDownRef.current = false;
            }}
          >
            <DialogPrimitive.Content
              asChild
              onCloseAutoFocus={(e) => {
                console.debug('[admin-modal][onCloseAutoFocus]', {
                  title,
                  pathname: window.location.pathname,
                  open,
                  activeElement: document.activeElement
                    ? {
                        tag: (document.activeElement as HTMLElement).tagName,
                        className: (document.activeElement as HTMLElement).className,
                        dataRole: (document.activeElement as HTMLElement).getAttribute('data-role'),
                      }
                    : null,
                });
                e.preventDefault();
                const focusTarget = previouslyFocusedRef.current;
                if (focusTarget && document.contains(focusTarget)) {
                  focusTarget.focus({ preventScroll: true });
                }
              }}
              onPointerDownOutside={guardModalDismissOnPortaledOverlay((e) => {
                console.debug('[admin-modal][onPointerDownOutside]', {
                  title,
                  pathname: window.location.pathname,
                  open,
                  target: (e.target as HTMLElement | null)?.tagName || null,
                });
                e.preventDefault();
              })}
              onInteractOutside={guardModalDismissOnPortaledOverlay((e) => {
                console.debug('[admin-modal][onInteractOutside]', {
                  title,
                  pathname: window.location.pathname,
                  open,
                  target: (e.target as HTMLElement | null)?.tagName || null,
                });
                e.preventDefault();
              })}
              onFocusOutside={guardModalDismissOnPortaledOverlay((e) => {
                console.debug('[admin-modal][onFocusOutside]', {
                  title,
                  pathname: window.location.pathname,
                  open,
                  target: (e.target as HTMLElement | null)?.tagName || null,
                });
                e.preventDefault();
              })}
              onEscapeKeyDown={(e) => {
                console.debug('[admin-modal][onEscapeKeyDown]', {
                  title,
                  pathname: window.location.pathname,
                  open,
                  portaledOverlayOpen: isAnyPortaledOverlayOpen(),
                });
                if (isAnyPortaledOverlayOpen()) return;
                e.preventDefault();
              }}
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
                  <button
                    type="button"
                    data-role="admin-modal-close"
                    className="absolute top-4 right-4 rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100"
                    onClick={() => onOpenChange(false)}
                  >
                    <XIcon className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </button>
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
