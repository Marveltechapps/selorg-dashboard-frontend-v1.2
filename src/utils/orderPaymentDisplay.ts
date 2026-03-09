/**
 * Derives the correct payment display from payment_method (source of truth) and payment_status.
 * Prevents "PAID" showing for COD orders when payment:created overwrites status incorrectly.
 */
export function getPaymentDisplay(order: { payment_method?: string; payment_status?: string }) {
  const method = (order.payment_method || 'cash').toLowerCase();
  const status = (order.payment_status || 'pending').toLowerCase();
  const isCod = method === 'cash' || method === 'cod';

  if (status === 'failed') {
    return { label: 'Failed', className: 'bg-[#FEE2E2] text-[#DC2626]' };
  }
  if (isCod) {
    return { label: 'COD', className: 'bg-[#FEF9C3] text-[#A16207]' };
  }
  if (status === 'paid') {
    return { label: 'Paid', className: 'bg-[#DCFCE7] text-[#16A34A]' };
  }
  return { label: 'Pending', className: 'bg-[#F5F5F5] text-[#616161]' };
}
