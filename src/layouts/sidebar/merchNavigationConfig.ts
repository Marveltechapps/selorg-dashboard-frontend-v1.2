import {
  LayoutDashboard,
  ShoppingBag,
  Tag,
  Megaphone,
  Boxes,
  Map,
  BarChart3,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { buildTabAliases, type OpsNavSection } from './opsNavigationTypes';

export const MERCH_NAV_SECTIONS: OpsNavSection[] = [
  {
    category: 'Overview',
    items: [{ id: 'overview', label: 'Merchandising Overview', icon: LayoutDashboard }],
  },
  {
    category: 'Merchandising',
    items: [
      { id: 'catalog', label: 'Catalog Merchandising', icon: ShoppingBag },
      { id: 'pricing', label: 'Pricing Engine', icon: Tag },
      { id: 'promotions', label: 'Promotion Campaigns', icon: Megaphone },
      { id: 'allocation', label: 'Allocation & Stock', icon: Boxes },
      { id: 'geofence', label: 'Geofence & Targeting', icon: Map },
    ],
  },
  {
    category: 'Insights & Compliance',
    items: [
      { id: 'analytics', label: 'Analytics & Insights', icon: BarChart3 },
      { id: 'alerts', label: 'Alerts & Exceptions', icon: AlertTriangle },
      { id: 'compliance', label: 'Compliance & Approvals', icon: ShieldCheck },
    ],
  },
];

export const MERCH_TAB_ALIASES = buildTabAliases(MERCH_NAV_SECTIONS);

export const MERCH_TAB_IDS = MERCH_NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.id));

export const REMOVED_MERCH_TABS = new Set([
  'inventory-overview',
  'transactions',
  'replenishment',
  'expiry',
  'warehouses',
  'allocations',
  'transfer-orders',
  'vendors',
]);
