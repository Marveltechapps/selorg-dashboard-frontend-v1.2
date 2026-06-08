import {
  LayoutDashboard,
  Users,
  MapPin,
  Bike,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  MessageSquare,
  ClipboardCheck,
  Video,
  Map,
  MessageCircle,
  Activity,
  Wallet,
} from 'lucide-react';
import { buildTabAliases, type OpsNavSection } from './opsNavigationTypes';

export type RiderNavBadgeKeys = 'escalations' | 'alerts' | 'dispatchQueue';

export const RIDER_NAV_SECTIONS: OpsNavSection[] = [
  {
    category: 'Command Center',
    items: [
      { id: 'overview', label: 'Fleet Overview', icon: LayoutDashboard },
      { id: 'dispatch', label: 'Dispatch Operations', icon: MapPin, badgeKey: 'dispatchQueue' },
      { id: 'escalations', label: 'Delivery Escalations', icon: AlertTriangle, badgeKey: 'escalations' },
      { id: 'alerts', label: 'Alerts & Exceptions', icon: AlertTriangle, badgeKey: 'alerts' },
    ],
  },
  {
    category: 'Fleet Operations',
    items: [
      { id: 'fleet', label: 'Fleet & Vehicles', icon: Bike },
      { id: 'group-delivery', label: 'Group Delivery', icon: Map },
      { id: 'rider-cash', label: 'Rider Cash & COD', icon: Wallet },
    ],
  },
  {
    category: 'Rider Management',
    collapseDefault: true,
    items: [
      { id: 'hr', label: 'Rider HR & Docs', icon: Users },
      { id: 'rider-shifts', label: 'Rider Shifts', icon: CalendarClock },
      { id: 'training-kit', label: 'Training & Kit', icon: Video },
      { id: 'approvals', label: 'Task Approvals', icon: ClipboardCheck },
    ],
  },
  {
    category: 'Support',
    collapseDefault: true,
    items: [
      { id: 'live-chat-support', label: 'Live Chat Support', icon: MessageCircle },
      { id: 'communication', label: 'Communication Hub', icon: MessageSquare },
      { id: 'health', label: 'System Health', icon: Activity },
    ],
  },
  {
    category: 'Insights',
    collapseDefault: true,
    items: [{ id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 }],
  },
];

export const RIDER_TAB_ALIASES = buildTabAliases(RIDER_NAV_SECTIONS);

export const RIDER_TAB_IDS = RIDER_NAV_SECTIONS.flatMap((s) =>
  s.items.filter((i) => !i.hidden).map((i) => i.id)
);
