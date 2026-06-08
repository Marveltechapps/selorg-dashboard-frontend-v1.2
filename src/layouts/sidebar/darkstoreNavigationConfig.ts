import {
  LayoutDashboard,
  List,
  Package,
  PackageX,
  UserCheck,
  FileBarChart,
  Bug,
  Warehouse,
  ArrowDownToLine,
  Send,
  ClipboardCheck,
  Users,
  Activity,
  Smartphone,
  Settings,
  Truck,
  Inbox,
  Clock,
  BarChart3,
  LucideIcon,
} from 'lucide-react';

export interface DarkstoreNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: keyof DarkstoreNavBadgeKeys;
  /** Legacy route ids that redirect to this item */
  aliases?: string[];
}

export interface DarkstoreNavSection {
  category: string;
  items: DarkstoreNavItem[];
  collapseDefault?: boolean;
}

export type DarkstoreNavBadgeKeys =
  | 'liveOrders'
  | 'exceptions'
  | 'slaCritical'
  | 'alerts'
  | 'stockAlerts';

/** Hub-based navigation — Command Center focused */
export const DARKSTORE_NAV_SECTIONS: DarkstoreNavSection[] = [
  {
    category: 'Command Center',
    items: [
      { id: 'my-shift', label: 'My Shift', icon: UserCheck },
      { id: 'overview', label: 'Store Overview', icon: LayoutDashboard },
      { id: 'liveorders', label: 'Live Orders', icon: List, badgeKey: 'liveOrders' },
      { id: 'exception-inbox', label: 'Exception Inbox', icon: Inbox, badgeKey: 'exceptions' },
      { id: 'slamonitor', label: 'SLA Monitor', icon: Clock, badgeKey: 'slaCritical' },
    ],
  },
  {
    category: 'Fulfillment',
    collapseDefault: true,
    items: [
      {
        id: 'fulfillment',
        label: 'Fulfillment Floor',
        icon: Package,
        aliases: ['pickpackops', 'packing-station', 'livepickingmonitor', 'picklists', 'pickpack'],
      },
      { id: 'livepickerboard', label: 'Live Picker Board', icon: UserCheck },
      { id: 'pickerperformance', label: 'Picker Performance', icon: FileBarChart },
      { id: 'missingitems', label: 'Missing Item Tracker', icon: PackageX },
      { id: 'issues', label: 'Issue Management', icon: Bug },
    ],
  },
  {
    category: 'Inventory & Dispatch',
    items: [
      { id: 'inventory', label: 'Inventory Mgmt', icon: Warehouse, badgeKey: 'stockAlerts' },
      { id: 'inbound', label: 'Inbound Ops', icon: ArrowDownToLine },
      { id: 'outbound', label: 'Outbound Ops', icon: Send },
      { id: 'replenishment', label: 'Replenishment', icon: Truck, aliases: ['replenishment-tracking'] },
    ],
  },
  {
    category: 'People & Compliance',
    items: [
      { id: 'staff', label: 'Staff & Shifts', icon: Users },
      { id: 'qc', label: 'QC & Compliance', icon: ClipboardCheck },
      { id: 'health', label: 'Store Health', icon: Activity },
      { id: 'reports', label: 'Reports', icon: FileBarChart },
      { id: 'ops-analytics', label: 'Ops Analytics', icon: BarChart3 },
    ],
  },
  {
    category: 'Store Systems',
    items: [
      { id: 'hsd', label: 'HSD Devices', icon: Smartphone },
      { id: 'regional', label: 'Regional Command', icon: LayoutDashboard },
      { id: 'store-settings', label: 'Store Settings', icon: Settings, aliases: ['utilities'] },
    ],
  },
];

export const DARKSTORE_FAVORITE_DEFAULTS = ['overview', 'liveorders', 'exception-inbox', 'slamonitor', 'fulfillment'];

/** Map legacy tab ids to canonical nav ids */
export const DARKSTORE_TAB_ALIASES: Record<string, string> = DARKSTORE_NAV_SECTIONS.flatMap((s) =>
  s.items.flatMap((item) => (item.aliases ?? []).map((alias) => [alias, item.id] as const))
).reduce<Record<string, string>>((acc, [alias, id]) => {
  acc[alias] = id;
  return acc;
}, {
  cancelledorders: 'liveorders',
  exceptionqueue: 'exception-inbox',
  alerts: 'exception-inbox',
  'ops-alerts': 'exception-inbox',
  escalations: 'exception-inbox',
});
