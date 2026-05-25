import {
  LayoutDashboard,
  Settings,
  Warehouse,
  ShoppingCart,
  Truck,
  BarChart3,
  Lock,
  Users,
  Package,
  Clock,
  AlertTriangle,
  FileBarChart,
  CheckCircle2,
  LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
}

export interface NavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  defaultOpen: boolean;
  items: NavItem[];
  permission?: string;
}

export const NAVIGATION_STRUCTURE: NavSection[] = [
  {
    id: 'admin',
    title: 'Admin',
    icon: Lock,
    defaultOpen: false,
    items: [
      { id: 'users', label: 'Users', icon: Users, permission: 'admin.users.read' },
      { id: 'roles', label: 'RBAC', icon: Lock, permission: 'admin.roles.read' },
      { id: 'config', label: 'System Config', icon: Settings, permission: 'admin.config.read' },
      { id: 'audit', label: 'Audit Logs', icon: FileBarChart, permission: 'compliance.audit.read' },
    ],
  },
  {
    id: 'catalog',
    title: 'Catalog',
    icon: Package,
    defaultOpen: true,
    items: [
      { id: 'products', label: 'Products', icon: Package, permission: 'catalog.products.read' },
      { id: 'categories', label: 'Categories', icon: LayoutDashboard, permission: 'catalog.categories.read' },
      { id: 'collections', label: 'Collections', icon: Package, permission: 'catalog.products.read' },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: Warehouse,
    defaultOpen: true,
    items: [
      { id: 'stock', label: 'Stock Levels', icon: Warehouse, permission: 'inventory.stock.read' },
      { id: 'transactions', label: 'Transactions', icon: FileBarChart, permission: 'inventory.stock.read' },
      { id: 'replenishment', label: 'Replenishment', icon: Truck, permission: 'inventory.stock.read' },
      { id: 'expiry', label: 'Expiry Management', icon: Clock, permission: 'inventory.stock.read' },
    ],
  },
  {
    id: 'orders',
    title: 'Orders',
    icon: ShoppingCart,
    defaultOpen: true,
    items: [
      { id: 'liveorders', label: 'Live Orders', icon: ShoppingCart, permission: 'orders.read' },
      { id: 'cancelled', label: 'Cancelled Orders', icon: AlertTriangle, permission: 'orders.read' },
      { id: 'refunds', label: 'Refunds', icon: CheckCircle2, permission: 'orders.refund' },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    icon: Truck,
    defaultOpen: true,
    items: [
      { id: 'overview', label: 'Store Overview', icon: LayoutDashboard, permission: 'orders.read' },
      { id: 'pickpackops', label: 'Pick & Pack', icon: Package, permission: 'orders.read' },
      { id: 'delivery', label: 'Delivery & Riders', icon: Truck, permission: 'delivery.track.read' },
      { id: 'slamonitor', label: 'SLA Monitor', icon: Clock, permission: 'analytics.reports.read' },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    icon: BarChart3,
    defaultOpen: false,
    items: [
      { id: 'payments', label: 'Payments', icon: ShoppingCart, permission: 'payments.read' },
      { id: 'reconciliation', label: 'Reconciliation', icon: CheckCircle2, permission: 'payments.read' },
      { id: 'reports', label: 'Reports', icon: FileBarChart, permission: 'analytics.reports.read' },
    ],
  },
  {
    id: 'people',
    title: 'People',
    icon: Users,
    defaultOpen: false,
    items: [
      { id: 'staff', label: 'Staff & Shifts', icon: Users, permission: 'admin.users.read' },
      { id: 'performance', label: 'Performance', icon: BarChart3, permission: 'analytics.reports.read' },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: BarChart3,
    defaultOpen: false,
    items: [
      { id: 'dashboards', label: 'Dashboards', icon: BarChart3, permission: 'analytics.reports.read' },
      { id: 'reports', label: 'Reports', icon: FileBarChart, permission: 'analytics.reports.read' },
      { id: 'kpis', label: 'KPIs', icon: BarChart3, permission: 'analytics.reports.read' },
    ],
  },
  {
    id: 'compliance',
    title: 'Compliance',
    icon: CheckCircle2,
    defaultOpen: false,
    items: [
      { id: 'qc', label: 'QC & Compliance', icon: CheckCircle2, permission: 'compliance.audit.read' },
      { id: 'alerts', label: 'Alerts', icon: AlertTriangle, permission: 'analytics.reports.read' },
    ],
  },
];

export const OLD_NAVIGATION_ITEMS = [
  { id: 'overview', label: 'Store Overview', icon: LayoutDashboard },
  { id: 'liveorders', label: 'Live Orders', icon: ShoppingCart },
  { id: 'cancelledorders', label: 'Cancelled Orders', icon: AlertTriangle },
  { id: 'pickpackops', label: 'Pick & Pack Ops', icon: Package },
  { id: 'livepickingmonitor', label: 'Live Picking Monitor', icon: Package },
  { id: 'slamonitor', label: 'SLA Monitor', icon: Clock },
  { id: 'missingitems', label: 'Missing Item Tracker', icon: AlertTriangle },
  { id: 'exceptionqueue', label: 'Exception Queue', icon: AlertTriangle },
  { id: 'livepickerboard', label: 'Live Picker Board', icon: Users },
  { id: 'pickerperformance', label: 'Picker Performance', icon: BarChart3 },
  { id: 'issues', label: 'Issue Management', icon: AlertTriangle },
  { id: 'inventory', label: 'Inventory Mgmt', icon: Warehouse },
  { id: 'inbound', label: 'Inbound Ops', icon: Truck },
  { id: 'outbound', label: 'Outbound Ops', icon: Truck },
  { id: 'qc', label: 'QC & Compliance', icon: CheckCircle2 },
  { id: 'staff', label: 'Staff & Shifts', icon: Users },
  { id: 'health', label: 'Store Health', icon: BarChart3 },
  { id: 'escalations', label: 'Escalations', icon: AlertTriangle },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'ops-alerts', label: 'Operations Alerts', icon: AlertTriangle },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'hsd', label: 'HSD Devices', icon: Package },
  { id: 'utilities', label: 'Utilities', icon: Settings },
  { id: 'replenishment', label: 'Replenishment', icon: Truck },
  { id: 'replenishment-tracking', label: 'Replenishment tracking', icon: Truck },
];
