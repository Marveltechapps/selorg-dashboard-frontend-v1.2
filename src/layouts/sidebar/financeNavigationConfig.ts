import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  RotateCcw,
  Scale,
  Truck,
  BookOpen,
  FileText,
  AlertTriangle,
  BarChart3,
  CheckSquare,
  Wrench,
  Users,
} from 'lucide-react';
import { buildTabAliases, type OpsNavSection } from './opsNavigationTypes';

export const FINANCE_NAV_SECTIONS: OpsNavSection[] = [
  {
    category: 'Command Center',
    items: [
      { id: 'overview', label: 'Finance Overview', icon: LayoutDashboard },
      { id: 'alerts', label: 'Alerts & Exceptions', icon: AlertTriangle },
      { id: 'approvals', label: 'Task Approvals', icon: CheckSquare },
    ],
  },
  {
    category: 'Customer & Orders',
    items: [
      { id: 'customer-payments', label: 'Customer Payments', icon: CreditCard },
      { id: 'refunds', label: 'Refunds & Returns', icon: RotateCcw },
    ],
  },
  {
    category: 'Operations Payouts',
    items: [
      { id: 'picker-payouts', label: 'Picker Payouts', icon: Users },
      { id: 'rider-cash', label: 'Rider Cash', icon: Truck },
    ],
  },
  {
    category: 'Vendor & Supply',
    collapseDefault: true,
    items: [
      { id: 'vendor-payments', label: 'Vendor & Suppliers', icon: Wallet },
      { id: 'billing', label: 'Billing & Invoicing', icon: FileText },
    ],
  },
  {
    category: 'Accounting',
    collapseDefault: true,
    items: [
      { id: 'reconciliation', label: 'Reconciliation', icon: Scale },
      { id: 'ledger', label: 'Accounting Ledger', icon: BookOpen },
      { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3 },
      { id: 'utilities', label: 'Utilities & Tools', icon: Wrench, aliases: ['monitoring', 'communication'] },
    ],
  },
];

export const FINANCE_TAB_ALIASES = buildTabAliases(FINANCE_NAV_SECTIONS);

export const FINANCE_TAB_IDS = FINANCE_NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.id));
