import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { WORKFLOW_CONTEXT } from '@/utils/orderWorkflow';
import { getWorkflowContext, type QCommerceDashboard } from '@/utils/qCommerceWorkflow';

type DashboardId = QCommerceDashboard;

const DASHBOARD_ROOT_LABEL: Record<DashboardId, string> = {
  darkstore: 'Darkstore',
  warehouse: 'Warehouse',
  production: 'Production',
  merch: 'Merchandising',
  rider: 'Rider',
  finance: 'Finance',
  vendor: 'Vendor',
  admin: 'Admin',
};

const TAB_LABELS: Record<DashboardId, Record<string, string>> = {
  darkstore: {
    'my-shift': 'My Shift',
    overview: 'Store Overview',
    regional: 'Regional Command',
    liveorders: 'Live Orders',
    'exception-inbox': 'Exception Inbox',
    fulfillment: 'Fulfillment Floor',
    pickpackops: 'Fulfillment Floor',
    'packing-station': 'Fulfillment Floor',
    livepickingmonitor: 'Fulfillment Floor',
    picklists: 'Fulfillment Floor',
    slamonitor: 'SLA Monitor',
    missingitems: 'Missing Item Tracker',
    livepickerboard: 'Live Picker Board',
    pickerperformance: 'Picker Performance',
    issues: 'Issue Management',
    inventory: 'Inventory Mgmt',
    staff: 'Staff & Shifts',
    health: 'Store Health',
    reports: 'Reports',
    'ops-analytics': 'Ops Analytics',
    hsd: 'HSD Devices',
    inbound: 'Inbound Ops',
    outbound: 'Outbound Ops',
    qc: 'QC & Compliance',
    'store-settings': 'Store Settings',
    utilities: 'Store Settings',
    replenishment: 'Replenishment',
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
    communication: 'Communication Hub',
    approvals: 'Task Approvals',
    'training-kit': 'Training & Kit',
    'group-delivery': 'Group Delivery',
    'live-chat-support': 'Live Chat Support',
    health: 'System Health',
    'rider-cash': 'Rider Cash & COD',
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
  warehouse: {
    overview: 'Warehouse Overview',
    navigation: 'Floor Navigation',
    inbound: 'Inbound Ops',
    inventory: 'Inventory & Storage',
    outbound: 'Outbound Ops',
    transfers: 'Transfers',
    qc: 'QC & Compliance',
    workforce: 'Workforce & Shifts',
    'shift-master': 'Shift Master',
    'shift-roster': 'Shift Roster',
    equipment: 'Equipment & Assets',
    devices: 'Devices',
    exceptions: 'Exception Inbox',
    analytics: 'Reports & Analytics',
    utilities: 'Utilities',
    logistics: 'Hub Logistics',
    'logistics-tracking': 'Hub Logistics',
    'logistics-estimate': 'Hub Logistics',
  },
  production: {
    overview: 'Production Overview',
    raw_materials: 'Raw Materials',
    planning: 'Production Planning',
    work_orders: 'Work Orders',
    qc: 'QC & Compliance',
    maintenance: 'Maintenance & Assets',
    workforce: 'Workforce',
    alerts: 'Alerts & Exceptions',
    reports: 'Reports',
    utilities: 'Utilities',
  },
  admin: {
    citywide: 'Citywide Control',
    'master-data': 'Master Data',
    users: 'Users & Roles',
    customers: 'Customers',
    catalog: 'Catalog',
    pricing: 'Coupons',
    finance: 'Finance Rules',
    support: 'Support Center',
    fraud: 'Fraud & Risk',
    analytics: 'Analytics',
    notifications: 'Notifications',
    geofence: 'Geofence Manager',
    compliance: 'Compliance Center',
    audit: 'Audit Logs',
    'app-cms': 'App CMS',
    'system-tools': 'System Tools',
    pickers: 'Picker Management',
  },
};

export function DashboardBreadcrumbs({
  dashboard,
  activeTab,
  pageLabel,
  workflowContext,
}: {
  dashboard: DashboardId;
  activeTab: string;
  /** Extra trailing segment (e.g. vendor name on detail view). */
  pageLabel?: string;
  /** Workflow context e.g. "Fulfillment › Order #1234" */
  workflowContext?: string;
}) {
  const base = `/${dashboard}`;
  const rootLabel = DASHBOARD_ROOT_LABEL[dashboard];
  const currentLabel = TAB_LABELS[dashboard]?.[activeTab] ?? activeTab;
  const contextLabel =
    workflowContext ||
    (dashboard === 'darkstore' ? WORKFLOW_CONTEXT[activeTab] : getWorkflowContext(dashboard, activeTab));

  const crumbs: { label: string; to?: string }[] = [
    { label: rootLabel, to: `${base}/overview` },
  ];
  if (contextLabel && contextLabel !== currentLabel) {
    crumbs.push({ label: contextLabel });
  }
  crumbs.push({ label: currentLabel, to: pageLabel ? `${base}/${activeTab}` : undefined });
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

