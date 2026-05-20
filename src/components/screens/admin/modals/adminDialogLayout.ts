import { cn } from '@/lib/utils';

export {
  adminFormClass,
  adminFormGrid2Class,
  adminFormGrid3Class,
  adminFieldClass,
  adminSectionTitleClass,
  adminInputErrorClass,
} from './adminFormLayout';

/** Max height for admin dialogs — fits viewport with positioner padding. */
export const ADMIN_DIALOG_MAX_H = 'max-h-[80dvh]';

/**
 * Tall admin create/edit dialogs: capped height, fixed header/footer, scrollable body.
 * Use with DialogContent + ScrollArea for tabbed forms.
 */
export function adminTallDialogClass(maxWidthClass = 'max-w-lg sm:max-w-lg') {
  return cn(
    '!gap-0 !p-0',
    'flex w-full min-h-0 flex-col overflow-hidden',
    ADMIN_DIALOG_MAX_H,
    'border border-[#e4e4e7] bg-white text-[#18181b] shadow-xl',
    maxWidthClass
  );
}

/** Simple tall dialog — scroll the main body; keep header/footer as direct children with shrink-0. */
export function adminScrollableDialogClass(maxWidthClass = 'max-w-lg sm:max-w-lg') {
  return cn(
    '!gap-0 !p-0',
    'flex w-full min-h-0 flex-col overflow-hidden',
    ADMIN_DIALOG_MAX_H,
    maxWidthClass
  );
}

export const adminDialogHeaderClass =
  'shrink-0 border-b border-[#e4e4e7] px-6 py-4 pr-12';

export const adminTabPanelClass =
  'mt-0 block w-full space-y-3 pb-6 pt-1 outline-none data-[state=inactive]:hidden';

export const adminDialogFormClass = 'flex min-h-0 flex-1 flex-col overflow-hidden';

export const adminDialogTabsClass =
  'flex min-h-0 flex-1 flex-col gap-0 overflow-hidden !gap-0';

/** Scrollable body between tabs and footer — native overflow (Radix ScrollArea needs a fixed height chain). */
export const adminDialogScrollAreaClass =
  'min-h-0 flex-1 overflow-y-auto overscroll-contain px-6';

export const adminScrollableBodyClass =
  'min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-4';

export const adminDialogFooterClass =
  'flex shrink-0 justify-end gap-2 border-t border-[#e4e4e7] bg-white px-6 py-4';
