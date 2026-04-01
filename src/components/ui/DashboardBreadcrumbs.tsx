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
  },
  merch: {
    overview: 'Merchandising Overview',
    catalog: 'Catalog Merchandising',
    pricing: 'Pricing Engine',
    promotions: 'Promotion Campaigns',
    allocation: 'Allocation & Stock',
    geofence: 'Geofence & Targeting',
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
    shifts: 'Staff & Shifts',
    communication: 'Communication Hub',
    health: 'System Health',
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
    monitoring: 'System Monitoring',
    communication: 'Communication Hub',
    utilities: 'Utilities & Tools',
  },
  vendor: {
    overview: 'Vendor Overview',
    'vendor-list': 'Vendor List',
    onboarding: 'Onboarding & Approval',
    po: 'Purchase Orders',
    inbound: 'Inbound Operations',
    inventory: 'Inventory Coordination',
    qc: 'QC & Compliance',
    approvals: 'Task Approvals',
    alerts: 'Alerts & Notifications',
    communication: 'Communication Hub',
    analytics: 'Reports & Analytics',
    system: 'System Monitoring',
    finance: 'Finance Integration',
    utilities: 'Utilities & Tools',
  },
};

export function DashboardBreadcrumbs({ dashboard, activeTab }: { dashboard: DashboardId; activeTab: string }) {
  const base = `/${dashboard}`;
  const rootLabel = DASHBOARD_ROOT_LABEL[dashboard];
  const currentLabel = TAB_LABELS[dashboard]?.[activeTab] ?? activeTab;

  const crumbs = [{ label: rootLabel, to: `${base}/overview` }, { label: currentLabel }];

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
            ) : (
              <Link
                to={crumb.to!}
                className="text-slate-500 hover:text-slate-800 font-medium transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

