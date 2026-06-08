/** Dialog / sheet modal layer (see dialog.tsx). */
export const Z_DIALOG = 10000;

/** Portaled lists (select, popover, menus) must stack above modals. */
export const Z_DROPDOWN = 10100;

/** Use on SelectContent inside Dialog when you need extra max-height control. */
export const DIALOG_SELECT_CONTENT_CLASS =
  'z-[10100] max-h-[min(16rem,50vh)] overflow-y-auto';

export {
  createBackdropClickHandler,
  guardModalDismissOnPortaledOverlay,
  isAnyPortaledOverlayOpen,
  isPortaledOverlayTarget,
  shouldDismissAdminModalBackdrop,
  stopModalPointerPropagation,
} from "./modalOverlayGuards";
