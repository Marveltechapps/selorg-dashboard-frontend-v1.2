/**
 * Darkstore optional UI preferences (e.g. search persistence).
 * Received transfers, outbound status, QC resolved, stock overrides, and deleted SKUs
 * are now persisted by the backend API; do not use this module as source of truth for those.
 *
 * All data is held in-memory only and resets on page refresh.
 */

let _receivedTransferIds: string[] = [];
let _outboundTransferStatus: Record<string, 'approved' | 'rejected'> = {};
let _resolvedFailureIds: string[] = [];
let _stockOverrides: Record<string, { stock?: number; status?: string }> = {};
let _deletedSkus: string[] = [];

export const darkstorePersistence = {
  receivedTransferIds: (): string[] => [..._receivedTransferIds],
  setReceivedTransfer: (transferId: string) => {
    if (!_receivedTransferIds.includes(transferId)) _receivedTransferIds.push(transferId);
  },

  outboundTransferStatus: (): Record<string, 'approved' | 'rejected'> => ({ ..._outboundTransferStatus }),
  setOutboundTransferStatus: (requestId: string, status: 'approved' | 'rejected') => {
    _outboundTransferStatus[requestId] = status;
  },

  resolvedFailureIds: (): string[] => [..._resolvedFailureIds],
  setResolvedFailure: (failureId: string) => {
    if (!_resolvedFailureIds.includes(failureId)) _resolvedFailureIds.push(failureId);
  },

  stockOverrides: (): Record<string, { stock?: number; status?: string }> => ({ ..._stockOverrides }),
  setStockOverride: (sku: string, patch: { stock?: number; status?: string; name?: string; category?: string; location?: string }) => {
    _stockOverrides[sku] = { ..._stockOverrides[sku], ...patch };
  },

  deletedSkus: (): string[] => [..._deletedSkus],
  setDeletedSku: (sku: string) => {
    if (!_deletedSkus.includes(sku)) _deletedSkus.push(sku);
  },
};
