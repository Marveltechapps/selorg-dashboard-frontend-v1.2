/**
 * Derives the correct payment display label from payment_method (source of truth) and payment_status.
 * Prevents "PAID" showing for COD orders when payment:created overwrites status incorrectly.
 */
export function getPaymentDisplay(order: { payment_method?: string; payment_status?: string }) {
  const method = (order.payment_method || 'cash').toLowerCase();
  const status = (order.payment_status || 'pending').toLowerCase();
  const isCod = method === 'cash' || method === 'cod';

  if (status === 'failed') {
    return { label: 'Failed' };
  }
  if (isCod) {
    return { label: 'COD' };
  }
  if (status === 'paid') {
    return { label: 'Paid' };
  }
  return { label: 'Pending' };
}
