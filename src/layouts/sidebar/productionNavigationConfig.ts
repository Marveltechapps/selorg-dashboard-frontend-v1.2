import {
  LayoutDashboard,
  Boxes,
  CalendarDays,
  ClipboardList,
  ClipboardCheck,
  Wrench,
  Users,
  AlertTriangle,
  BarChart3,
  Settings,
} from 'lucide-react';
import { buildTabAliases, type OpsNavSection } from './opsNavigationTypes';

export const PRODUCTION_NAV_SECTIONS: OpsNavSection[] = [
  {
    category: 'Command Center',
    items: [
      { id: 'overview', label: 'Production Overview', icon: LayoutDashboard },
      { id: 'alerts', label: 'Alerts & Exceptions', icon: AlertTriangle },
    ],
  },
  {
    category: 'Planning & Materials',
    items: [
      { id: 'raw_materials', label: 'Raw Materials', icon: Boxes },
      { id: 'planning', label: 'Production Planning', icon: CalendarDays },
    ],
  },
  {
    category: 'Production Floor',
    items: [
      { id: 'work_orders', label: 'Work Orders', icon: ClipboardList },
      { id: 'qc', label: 'QC & Compliance', icon: ClipboardCheck },
    ],
  },
  {
    category: 'Assets & People',
    collapseDefault: true,
    items: [
      { id: 'maintenance', label: 'Maintenance & Assets', icon: Wrench },
      { id: 'workforce', label: 'Workforce', icon: Users },
    ],
  },
  {
    category: 'Insights',
    collapseDefault: true,
    items: [
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'utilities', label: 'Utilities', icon: Settings },
    ],
  },
];

export const PRODUCTION_TAB_ALIASES = buildTabAliases(PRODUCTION_NAV_SECTIONS);

export const PRODUCTION_TAB_IDS = PRODUCTION_NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.id));
