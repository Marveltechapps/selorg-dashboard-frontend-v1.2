import {
  LayoutDashboard,
  List,
  Ban,
  Package,
  PackageSearch,
  Clock,
  PackageX,
  AlertTriangle,
  UserCheck,
  FileBarChart,
  Bug,
  Warehouse,
  ArrowDownToLine,
  Send,
  ClipboardCheck,
  Users,
  Activity,
  Bell,
  Smartphone,
  Settings,
  Truck,
  LucideIcon,
} from 'lucide-react';

export interface DarkstoreNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface DarkstoreNavSection {
  category: string;
  items: DarkstoreNavItem[];
}

export const DARKSTORE_NAV_SECTIONS: DarkstoreNavSection[] = [
  {
    category: 'Store',
    items: [{ id: 'overview', label: 'Store Overview', icon: LayoutDashboard }],
  },
  {
    category: 'Orders',
    items: [
      { id: 'liveorders', label: 'Live Orders', icon: List },
      { id: 'cancelledorders', label: 'Cancelled Orders', icon: Ban },
    ],
  },
  {
    category: 'Pick & Pack',
    items: [
      { id: 'pickpackops', label: 'Pick & Pack Ops', icon: Package },
      { id: 'livepickingmonitor', label: 'Live Picking Monitor', icon: PackageSearch },
      { id: 'slamonitor', label: 'SLA Monitor', icon: Clock },
      { id: 'missingitems', label: 'Missing Item Tracker', icon: PackageX },
      { id: 'exceptionqueue', label: 'Exception Queue', icon: AlertTriangle },
      { id: 'livepickerboard', label: 'Live Picker Board', icon: UserCheck },
      { id: 'pickerperformance', label: 'Picker Performance', icon: FileBarChart },
      { id: 'issues', label: 'Issue Management', icon: Bug },
    ],
  },
  {
    category: 'Inventory & Logistics',
    items: [
      { id: 'inventory', label: 'Inventory Mgmt', icon: Warehouse },
      { id: 'inbound', label: 'Inbound Ops', icon: ArrowDownToLine },
      { id: 'outbound', label: 'Outbound Ops', icon: Send },
      { id: 'replenishment', label: 'Replenishment', icon: Truck },
      { id: 'replenishment-tracking', label: 'Replenishment tracking', icon: Truck },
    ],
  },
  {
    category: 'People & Compliance',
    items: [
      { id: 'qc', label: 'QC & Compliance', icon: ClipboardCheck },
      { id: 'staff', label: 'Staff & Shifts', icon: Users },
      { id: 'health', label: 'Store Health', icon: Activity },
      { id: 'escalations', label: 'Escalations', icon: AlertTriangle },
      { id: 'alerts', label: 'Alerts', icon: Bell },
      { id: 'ops-alerts', label: 'Operations Alerts', icon: AlertTriangle },
      { id: 'reports', label: 'Reports', icon: FileBarChart },
    ],
  },
  {
    category: 'System',
    items: [
      { id: 'hsd', label: 'HSD Devices', icon: Smartphone },
      { id: 'utilities', label: 'Utilities', icon: Settings },
    ],
  },
];
