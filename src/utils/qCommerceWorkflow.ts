/**
 * End-to-end q-commerce chain: vendor → warehouse → production → darkstore → rider → finance → customer.
 * Used for breadcrumbs, cross-dashboard navigation, and workflow context labels.
 */

export type QCommerceDashboard =
  | 'vendor'
  | 'warehouse'
  | 'production'
  | 'darkstore'
  | 'rider'
  | 'finance'
  | 'merch'
  | 'admin';

export interface WorkflowHandoff {
  from: { dashboard: QCommerceDashboard; tab: string; label: string };
  to: { dashboard: QCommerceDashboard; tab: string; label: string };
  description: string;
}

/** Canonical supply-to-customer handoffs across dashboards */
export const Q_COMMERCE_HANDOFFS: WorkflowHandoff[] = [
  {
    from: { dashboard: 'vendor', tab: 'po', label: 'Purchase Orders' },
    to: { dashboard: 'warehouse', tab: 'inbound', label: 'Inbound Ops' },
    description: 'Vendor PO received at warehouse dock',
  },
  {
    from: { dashboard: 'warehouse', tab: 'outbound', label: 'Outbound Ops' },
    to: { dashboard: 'darkstore', tab: 'inbound', label: 'Inbound Ops' },
    description: 'Warehouse dispatch to darkstore replenishment',
  },
  {
    from: { dashboard: 'production', tab: 'work_orders', label: 'Work Orders' },
    to: { dashboard: 'warehouse', tab: 'inbound', label: 'Inbound Ops' },
    description: 'Finished goods to warehouse storage',
  },
  {
    from: { dashboard: 'darkstore', tab: 'liveorders', label: 'Live Orders' },
    to: { dashboard: 'rider', tab: 'dispatch', label: 'Dispatch Operations' },
    description: 'Packed orders handed to rider fleet',
  },
  {
    from: { dashboard: 'rider', tab: 'dispatch', label: 'Dispatch Operations' },
    to: { dashboard: 'finance', tab: 'rider-cash', label: 'Rider Cash' },
    description: 'COD collection and rider settlement',
  },
  {
    from: { dashboard: 'darkstore', tab: 'liveorders', label: 'Live Orders' },
    to: { dashboard: 'finance', tab: 'customer-payments', label: 'Customer Payments' },
    description: 'Order payment capture and reconciliation',
  },
  {
    from: { dashboard: 'merch', tab: 'allocation', label: 'Allocation & Stock' },
    to: { dashboard: 'darkstore', tab: 'inventory', label: 'Inventory Mgmt' },
    description: 'Stock allocation to store catalog',
  },
];

export const WORKFLOW_CONTEXT_BY_DASHBOARD: Record<QCommerceDashboard, Record<string, string>> = {
  vendor: {
    overview: 'Supply Chain Command',
    po: 'Procurement',
    inbound: 'Vendor → Warehouse',
    inventory: 'Stock Coordination',
  },
  warehouse: {
    overview: 'Fulfillment Hub Command',
    inbound: 'Vendor → Warehouse',
    outbound: 'Warehouse → Darkstore',
    exceptions: 'Hub Exceptions',
    logistics: 'Replenishment Logistics',
  },
  production: {
    overview: 'Plant Command',
    work_orders: 'Manufacturing Floor',
    raw_materials: 'Materials Intake',
  },
  darkstore: {
    overview: 'Store Command Center',
    liveorders: 'Order Fulfillment',
    fulfillment: 'Pick & Pack Floor',
    'exception-inbox': 'Store Exceptions',
    outbound: 'Ready for Dispatch',
  },
  rider: {
    overview: 'Last-Mile Command',
    dispatch: 'Darkstore → Customer',
    escalations: 'Delivery Exceptions',
    fleet: 'Fleet Operations',
  },
  finance: {
    overview: 'Finance Command',
    'customer-payments': 'Order Revenue',
    'rider-cash': 'Last-Mile Settlement',
    'picker-payouts': 'Store Labor Payouts',
    'vendor-payments': 'Supplier Settlement',
  },
  merch: {
    overview: 'Merchandising Command',
    allocation: 'Stock → Stores',
    pricing: 'Store Pricing',
  },
  admin: {
    citywide: 'Platform Command',
    'master-data': 'Network Master Data',
  },
};

export function getWorkflowContext(dashboard: QCommerceDashboard, tab: string): string | undefined {
  return WORKFLOW_CONTEXT_BY_DASHBOARD[dashboard]?.[tab];
}

export function navigateToDashboard(dashboard: QCommerceDashboard, tab: string, detail?: Record<string, string>) {
  const path = `/${dashboard}/${tab}`;
  const eventName = `${dashboard}:navigate`;
  window.dispatchEvent(new CustomEvent(eventName, { detail: { tab, ...detail } }));
  if (window.location.pathname !== path) {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

export function getHandoffsFor(dashboard: QCommerceDashboard, tab: string): WorkflowHandoff[] {
  return Q_COMMERCE_HANDOFFS.filter(
    (h) => h.from.dashboard === dashboard && h.from.tab === tab
  );
}
