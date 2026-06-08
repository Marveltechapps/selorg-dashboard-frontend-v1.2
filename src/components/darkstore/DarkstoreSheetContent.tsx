import React, { useCallback, useRef } from 'react';
import { SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useDarkstore } from './DarkstoreProvider';

type DarkstoreSheetContentProps = React.ComponentPropsWithoutRef<typeof SheetContent> & {
  resizable?: boolean;
};

/** Right-side drawer with optional resize handle. Width persisted in preferences. */
export const DarkstoreSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetContent>,
  DarkstoreSheetContentProps
>(({ className, side = 'right', resizable = true, children, ...props }, ref) => {
  const { setDrawerWidth } = useDarkstore();
  const dragging = useRef(false);

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!resizable) return;
      e.preventDefault();
      dragging.current = true;
      const startX = e.clientX;
      const startWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ds-drawer-width') || '480', 10);

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = startX - ev.clientX;
        setDrawerWidth(startWidth + delta);
      };

      const onUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [resizable, setDrawerWidth]
  );

  return (
    <SheetContent
      ref={ref}
      side={side}
      className={cn('darkstore-sheet-content', className)}
      {...props}
    >
      {resizable && side === 'right' && (
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={onResizeStart}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--ds-primary)]/20 active:bg-[var(--ds-primary)]/30 z-50 transition-colors"
          title="Drag to resize"
        />
      )}
      {children}
    </SheetContent>
  );
});
DarkstoreSheetContent.displayName = 'DarkstoreSheetContent';
