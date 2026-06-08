import {
  LayoutDashboard,
  Activity,
  ArrowDownToLine,
  Package,
  ArrowUpFromLine,
  ArrowRightLeft,
  ClipboardCheck,
  Users,
  Clock,
  Calendar,
  Wrench,
  TabletSmartphone,
  AlertTriangle,
  BarChart3,
  Settings,
  Truck,
} from 'lucide-react';
import { buildTabAliases, type OpsNavSection } from './opsNavigationTypes';

export type WarehouseNavBadgeKeys = 'exceptions' | 'inboundQueue' | 'outboundQueue';

export const WAREHOUSE_NAV_SECTIONS: OpsNavSection[] = [
  {
    category: 'Command Center',
    items: [
      { id: 'overview', label: 'Warehouse Overview', icon: LayoutDashboard },
      { id: 'exceptions', label: 'Exception Inbox', icon: AlertTriangle, badgeKey: 'exceptions' },
      { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3 },
    ],
  },
  {
    category: 'Inbound & Storage',
    items: [
      { id: 'inbound', label: 'Inbound Ops', icon: ArrowDownToLine, badgeKey: 'inboundQueue' },
      { id: 'inventory', label: 'Inventory & Storage', icon: Package },
      { id: 'qc', label: 'QC & Compliance', icon: ClipboardCheck },
    ],
  },
  {
    category: 'Outbound & Transfer',
    collapseDefault: true,
    items: [
      { id: 'outbound', label: 'Outbound Ops', icon: ArrowUpFromLine, badgeKey: 'outboundQueue' },
      { id: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
    ],
  },
  {
    category: 'Workforce',
    collapseDefault: true,
    items: [
      { id: 'workforce', label: 'Workforce & Shifts', icon: Users },
      { id: 'shift-master', label: 'Shift Master', icon: Clock },
      { id: 'shift-roster', label: 'Shift Roster', icon: Calendar },
    ],
  },
  {
    category: 'Assets & Systems',
    collapseDefault: true,
    items: [
      { id: 'equipment', label: 'Equipment & Assets', icon: Wrench },
      { id: 'devices', label: 'Devices', icon: TabletSmartphone },
      { id: 'navigation', label: 'Floor Navigation', icon: Activity },
      { id: 'utilities', label: 'Utilities', icon: Settings },
    ],
  },
  {
    category: 'Logistics',
    items: [
      {
        id: 'logistics',
        label: 'Hub Logistics',
        icon: Truck,
        aliases: ['logistics-tracking', 'logistics-estimate', 'replenishment', 'replenishment-tracking'],
      },
    ],
  },
];

export const WAREHOUSE_TAB_ALIASES = buildTabAliases(WAREHOUSE_NAV_SECTIONS);

export const WAREHOUSE_TAB_IDS = WAREHOUSE_NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.id));
