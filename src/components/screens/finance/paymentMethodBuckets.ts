import type { LiveTransaction, PaymentMethodSplitItem } from './financeApi';

export type PaymentMethodBucket = 'cards' | 'digital_wallets' | 'cod' | 'other';

const BUCKET_LABELS: Record<PaymentMethodBucket, string> = {
  cards: 'Cards',
  digital_wallets: 'UPI & Wallets',
  cod: 'Cash on Delivery',
  other: 'Other',
};

export function resolveBucketFromPaymentEvent(data: {
  methodType?: string;
  methodDisplay?: string;
  gateway?: string;
}): PaymentMethodBucket {
  const type = String(data.methodType || '').toLowerCase();
  if (type === 'card') return 'cards';
  if (type === 'upi' || type === 'wallet' || type === 'net_banking') return 'digital_wallets';
  if (type === 'cod' || type === 'cash') return 'cod';

  const method = String(data.methodDisplay || '').toLowerCase();
  const gateway = String(data.gateway || '').toLowerCase();
  if (gateway === 'cod' || method.includes('cash on delivery') || /\bcod\b/.test(method)) return 'cod';
  if (method.includes('upi') || method.includes('wallet')) return 'digital_wallets';
  if (method.includes('card') || method.includes('credit') || method.includes('debit')) return 'cards';
  return 'other';
}

/** Apply a live payment event to split rows (percentages recalculated). */
export function applyPaymentToSplit(
  prev: PaymentMethodSplitItem[],
  data: { methodType?: string; methodDisplay?: string; gateway?: string; amount?: number }
): PaymentMethodSplitItem[] {
  const amount = Number(data.amount) || 0;
  if (amount <= 0) return prev;

  const key = resolveBucketFromPaymentEvent(data);
  const label = BUCKET_LABELS[key];
  const rows = [...prev];
  const idx = rows.findIndex((r) => r.method === key);
  if (idx >= 0) {
    rows[idx] = {
      ...rows[idx],
      amount: rows[idx].amount + amount,
      txnCount: rows[idx].txnCount + 1,
    };
  } else {
    rows.push({ method: key, label, amount, txnCount: 1, percentage: 0 });
  }
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return rows.map((r) => ({
    ...r,
    percentage: total > 0 ? (r.amount / total) * 100 : 0,
  }));
}

export function txnMatchesPaymentBucket(txn: LiveTransaction, bucket: string): boolean {
  const method = String(txn.methodDisplay || '').toLowerCase();
  const gateway = String(txn.gateway || '').toLowerCase();

  if (bucket === 'cod') {
    return gateway === 'cod' || method.includes('cash on delivery') || /\bcod\b/.test(method) || method.includes('cash');
  }
  if (bucket === 'digital_wallets') {
    return (
      method.includes('upi') ||
      method.includes('wallet') ||
      method.includes('net banking') ||
      method.includes('gpay') ||
      method.includes('phonepe') ||
      method.includes('paytm')
    );
  }
  if (bucket === 'cards') {
    return method.includes('card') || method.includes('credit') || method.includes('debit') || (gateway !== 'cod' && gateway !== '' && gateway !== 'internal');
  }
  if (bucket === 'other') {
    return !txnMatchesPaymentBucket(txn, 'cod') &&
      !txnMatchesPaymentBucket(txn, 'digital_wallets') &&
      !txnMatchesPaymentBucket(txn, 'cards');
  }
  return method.includes(bucket.toLowerCase());
}
