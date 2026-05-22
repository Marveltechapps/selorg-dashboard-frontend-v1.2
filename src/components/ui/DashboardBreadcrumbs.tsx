import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

type DashboardId = 'darkstore' | 'merch' | 'rider' | 'finance' | 'vendor';

const DASHBOARD_ROOT_LABEL: Record<DashboardId, string> = {
  darkstore: 'Darkstore',
  merch: 'Merchandising',
  rider: 'Rider',
  finance: 'Finance',
  vendor: 'Vendor',
};

const TAB_LABELS: Record<DashboardId, Record<string, string>> = {
  darkstore: {
    overview: 'Store Overview',
    liveorders: 'Live Orders',
    cancelledorders: 'Cancelled Orders',
    pickpack: 'Pick Tasks & Pack',
    pickpackops: 'Pick & Pack Ops',
    livepickingmonitor: 'Live Picking Monitor',
    slamonitor: 'SLA Monitor',
    missingitems: 'Missing Item Tracker',
    exceptionqueue: 'Exception Queue',
    livepickerboard: 'Live Picker Board',
    pickerperformance: 'Picker Performance',
    issues: 'Issue Management',
    inventory: 'Inventory Mgmt',
    staff: 'Staff & Shifts',
    health: 'Store Health',
    alerts: 'Alerts',
    'ops-alerts': 'Operations Alerts',
    reports: 'Reports',
    hsd: 'HSD Devices',
    inbound: 'Inbound Ops',
    outbound: 'Outbound Ops',
    qc: 'QC & Compliance',
    escalations: 'Escalations',
    utilities: 'Utilities',
    replenishment: 'Replenishment',
    'replenishment-tracking': 'Replenishment tracking',
  },
  merch: {
    overview: 'Merchandising Overview',
    catalog: 'Catalog Merchandising',
    pricing: 'Pricing Engine',
    promotions: 'Promotion Campaigns',
    allocation: 'Allocation & Stock',
    geofence: 'Geofence & Targeting',
    'inventory-overview': 'Inventory Overview',
    transactions: 'Transactions & Audit',
    replenishment: 'Replenishment Orders',
    expiry: 'Expiry Management',
    // Phase 4: Warehouse & Distribution
    warehouses: 'Warehouse Management',
    allocations: 'Allocation Dashboard',
    'transfer-orders': 'Transfer Orders',
    vendors: 'Vendor Management',
    analytics: 'Analytics & Insights',
    alerts: 'Alerts & Exceptions',
    compliance: 'Compliance & Approvals',
  },
  rider: {
    overview: 'Rider Overview',
    hr: 'Rider HR & Docs',
    dispatch: 'Dispatch Operations',
    fleet: 'Fleet & Vehicle',
    escalations: 'Escalations',
    alerts: 'Alerts & Exceptions',
    analytics: 'Analytics & Reports',
    'rider-shifts': 'Rider Shifts',
    communication: 'Communication Hub',
    approvals: 'Task Approvals',
    'training-kit': 'Training & Kit',
    'group-delivery': 'Group Delivery',
  },
  finance: {
    overview: 'Finance Overview',
    'customer-payments': 'Customer Payments',
    'vendor-payments': 'Vendor & Suppliers',
    'rider-cash': 'Rider Cash',
    refunds: 'Refunds & Returns',
    'picker-payouts': 'Picker Payouts',
    reconciliation: 'Reconciliation',
    ledger: 'Accounting Ledger',
    billing: 'Billing & Invoicing',
    alerts: 'Alerts & Exceptions',
    analytics: 'Reports & Analytics',
    approvals: 'Task Approvals',
    utilities: 'Utilities & Tools',
  },
  vendor: {
    overview: 'Vendor Overview',
    'vendor-list': 'Vendor List',
    po: 'Purchase Orders',
    inbound: 'Inbound Operations',
    inventory: 'Inventory Coordination',
    qc: 'QC & Compliance',
    approvals: 'Task Approvals',
    alerts: 'Alerts & Notifications',
    analytics: 'Reports & Analytics',
    finance: 'Finance Integration',
    utilities: 'Utilities & Tools',
  },
};

export function DashboardBreadcrumbs({
  dashboard,
  activeTab,
  pageLabel,
}: {
  dashboard: DashboardId;
  activeTab: string;
  /** Extra trailing segment (e.g. vendor name on detail view). */
  pageLabel?: string;
}) {
  const base = `/${dashboard}`;
  const rootLabel = DASHBOARD_ROOT_LABEL[dashboard];
  const currentLabel = TAB_LABELS[dashboard]?.[activeTab] ?? activeTab;

  const crumbs: { label: string; to?: string }[] = [
    { label: rootLabel, to: `${base}/overview` },
    { label: currentLabel, to: pageLabel ? `${base}/${activeTab}` : undefined },
  ];
  if (pageLabel?.trim()) {
    crumbs.push({ label: pageLabel.trim() });
  }

  return (
    <nav className="flex flex-wrap items-center gap-2 mb-4 text-sm" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <React.Fragment key={`${crumb.label}-${index}`}>
            {index > 0 && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />}
            {isLast ? (
              <span className="text-slate-600 font-medium" aria-current="page">
                {crumb.label}
              </span>
            ) : crumb.to ? (
              <Link
                to={crumb.to}
                className="text-slate-500 hover:text-slate-800 font-medium transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-slate-500 font-medium">{crumb.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

