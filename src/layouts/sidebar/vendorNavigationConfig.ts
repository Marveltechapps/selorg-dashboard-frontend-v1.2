import {
  LayoutDashboard,
  Building2,
  FileText,
  ArrowDownToLine,
  Package,
  ClipboardCheck,
  CheckSquare,
  AlertTriangle,
  BarChart3,
  Wallet,
  Wrench,
} from 'lucide-react';
import { buildTabAliases, type OpsNavSection } from './opsNavigationTypes';

export const VENDOR_NAV_SECTIONS: OpsNavSection[] = [
  {
    category: 'Command Center',
    items: [
      { id: 'overview', label: 'Vendor Overview', icon: LayoutDashboard },
      { id: 'alerts', label: 'Alerts & Notifications', icon: AlertTriangle },
      { id: 'approvals', label: 'Task Approvals', icon: CheckSquare },
    ],
  },
  {
    category: 'Supply Chain',
    items: [
      { id: 'vendor-list', label: 'Vendor List', icon: Building2 },
      { id: 'po', label: 'Purchase Orders', icon: FileText },
      {
        id: 'inbound',
        label: 'Inbound Operations',
        icon: ArrowDownToLine,
        aliases: ['inbound-tracking', 'inbound-exceptions', 'inbound-returns'],
      },
      { id: 'inbound-tracking', label: 'Shipment Tracking', icon: ArrowDownToLine, screenTabId: 'tracking' },
      { id: 'inbound-exceptions', label: 'Inbound Exceptions', icon: ArrowDownToLine, screenTabId: 'exceptions' },
      { id: 'inbound-returns', label: 'Returns (RTV)', icon: ArrowDownToLine, screenTabId: 'returns' },
      {
        id: 'inventory',
        label: 'Inventory Coordination',
        icon: Package,
        aliases: ['inv-reconciliation', 'inv-aging', 'inv-stockouts'],
      },
      { id: 'inv-reconciliation', label: 'Reconciliation', icon: Package, screenTabId: 'reconciliation' },
      { id: 'inv-aging', label: 'Aging Stock', icon: Package, screenTabId: 'aging' },
      { id: 'inv-stockouts', label: 'Stockouts', icon: Package, screenTabId: 'stockouts' },
    ],
  },
  {
    category: 'Quality & Finance',
    collapseDefault: true,
    items: [
      {
        id: 'qc',
        label: 'QC & Compliance',
        icon: ClipboardCheck,
        aliases: ['vendor-qc', 'vendor-audits'],
      },
      { id: 'vendor-qc', label: 'QC Checks', icon: ClipboardCheck, screenTabId: 'qc' },
      { id: 'vendor-audits', label: 'Audits', icon: ClipboardCheck, screenTabId: 'audits' },
      { id: 'finance', label: 'Finance Integration', icon: Wallet },
      {
        id: 'analytics',
        label: 'Reports & Analytics',
        icon: BarChart3,
        aliases: ['analytics-products', 'analytics-orders', 'analytics-financial'],
      },
      { id: 'analytics-products', label: 'Product Analytics', icon: BarChart3, screenTabId: 'products' },
      { id: 'analytics-orders', label: 'Order Analytics', icon: BarChart3, screenTabId: 'orders' },
      { id: 'analytics-financial', label: 'Financial Reports', icon: BarChart3, screenTabId: 'financial' },
      {
        id: 'utilities',
        label: 'Utilities & Tools',
        icon: Wrench,
        aliases: ['onboarding', 'communication', 'system'],
      },
    ],
  },
];

export const VENDOR_TAB_ALIASES = buildTabAliases(VENDOR_NAV_SECTIONS);

export const VENDOR_TAB_IDS = VENDOR_NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.id));
