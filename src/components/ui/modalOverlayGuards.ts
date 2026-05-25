import type { MouseEvent, PointerEvent } from "react";

/**
 * Portaled layers rendered outside Dialog/Sheet content (select menus, popovers, etc.).
 * Clicks here must not dismiss the parent modal via onInteractOutside or backdrop onClick.
 */
const PORTAL_OVERLAY_SELECTOR = [
  '[data-slot="select-content"]',
  '[data-slot="popover-content"]',
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="dropdown-menu-sub-content"]',
  '[data-slot="context-menu-content"]',
  '[data-slot="context-menu-sub-content"]',
  '[data-slot="menubar-content"]',
  '[data-slot="menubar-sub-content"]',
  '[data-slot="hover-card-content"]',
  '[data-slot="tooltip-content"]',
  '[data-slot="navigation-menu-viewport"]',
  '[data-radix-select-content]',
  '[data-radix-popper-content-wrapper]',
  '[data-radix-menu-content]',
  '[role="listbox"]',
].join(", ");

export function isPortaledOverlayTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest(PORTAL_OVERLAY_SELECTOR) !== null;
}

type DismissableLayerEvent = {
  preventDefault: () => void;
  target: EventTarget | null;
  defaultPrevented?: boolean;
};

/** Radix Dialog/Sheet/AlertDialog: keep ESC + close button; block dismiss when clicking portaled menus. */
export function guardModalDismissOnPortaledOverlay<E extends DismissableLayerEvent>(
  userHandler?: (event: E) => void,
): (event: E) => void {
  return (event: E) => {
    if (isPortaledOverlayTarget(event.target)) {
      event.preventDefault();
      return;
    }
    userHandler?.(event);
  };
}

/** Custom `fixed inset-0` backdrops that use onClick to close (not Radix Dialog). */
export function createBackdropClickHandler(onClose: () => void) {
  return (event: MouseEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (isPortaledOverlayTarget(event.target)) return;
    onClose();
  };
}

/** Spread on the inner modal panel so clicks do not bubble to a backdrop onClick handler. */
export const stopModalPointerPropagation = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => {
    event.stopPropagation();
  },
  onClick: (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  },
};
