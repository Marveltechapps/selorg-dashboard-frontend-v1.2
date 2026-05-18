/**
 * Decouples MerchOverview (and other callers) from PricingEngine for HMR / Fast Refresh.
 * Only the boolean open request lives here — no React components.
 */
let shouldOpenPendingUpdates = false;

export function setOpenPendingUpdates(v: boolean) {
  shouldOpenPendingUpdates = v;
}

export function takePendingUpdatesOpenRequest(): boolean {
  if (!shouldOpenPendingUpdates) return false;
  shouldOpenPendingUpdates = false;
  return true;
}
