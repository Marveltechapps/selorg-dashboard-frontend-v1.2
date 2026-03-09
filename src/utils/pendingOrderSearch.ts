/**
 * Pending order search state - used to pass search query from TopBar/DashboardHome
 * to LiveOrders when navigating via search or clicking an order.
 * Kept in a separate module to avoid Fast Refresh issues (LiveOrders must only export components).
 */
let _pendingOrderSearch: string | null = null;

export function setPendingOrderSearch(q: string) {
  _pendingOrderSearch = q;
}

export function getPendingOrderSearch(): string | null {
  const q = _pendingOrderSearch;
  _pendingOrderSearch = null;
  return q;
}
