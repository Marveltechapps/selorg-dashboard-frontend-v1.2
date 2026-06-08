import React from 'react';
import { ArrowRight, LayoutDashboard, UserCheck, Warehouse, Headphones } from 'lucide-react';
import { useDarkstore, type OpsRole } from './DarkstoreProvider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ROLE_CONFIG: Record<
  OpsRole,
  { label: string; description: string; tabs: { id: string; label: string }[]; icon: typeof LayoutDashboard }
> = {
  manager: {
    label: 'Store Manager',
    description: 'Command center view — overview, SLA, and exceptions.',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'slamonitor', label: 'SLA Monitor' },
      { id: 'exception-inbox', label: 'Exceptions' },
    ],
    icon: LayoutDashboard,
  },
  floor_lead: {
    label: 'Floor Lead',
    description: 'Fulfillment floor — picker board and live picks.',
    tabs: [
      { id: 'livepickerboard', label: 'Picker Board' },
      { id: 'pickpackops', label: 'Pick & Pack' },
      { id: 'liveorders', label: 'Live Orders' },
    ],
    icon: UserCheck,
  },
  inventory: {
    label: 'Inventory Lead',
    description: 'Stock health — missing items and replenishment.',
    tabs: [
      { id: 'missingitems', label: 'Missing Items' },
      { id: 'inventory', label: 'Inventory' },
      { id: 'inbound', label: 'Inbound' },
    ],
    icon: Warehouse,
  },
  support: {
    label: 'Support Lead',
    description: 'Customer issues — exceptions and escalations.',
    tabs: [
      { id: 'exception-inbox', label: 'Exception Inbox' },
      { id: 'issues', label: 'Issues' },
      { id: 'escalations', label: 'Escalations' },
    ],
    icon: Headphones,
  },
};

interface RoleLandingBannerProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  className?: string;
}

export function RoleLandingBanner({ activeTab, setActiveTab, className }: RoleLandingBannerProps) {
  const { preferences } = useDarkstore();
  const role = preferences.opsRole || 'manager';
  const config = ROLE_CONFIG[role];
  const Icon = config.icon;

  const isOnRoleTab = config.tabs.some((t) => t.id === activeTab);
  if (isOnRoleTab) return null;

  return (
    <div className={cn('darkstore-card px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-[var(--ds-primary)]', className)}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[var(--ds-primary-muted)]">
          <Icon size={18} className="text-[var(--ds-primary)]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{config.label} workspace</p>
          <p className="text-xs text-slate-500">{config.description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {config.tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={activeTab === tab.id ? 'default' : 'outline'}
            className="h-8 text-xs"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <ArrowRight size={12} className="ml-1" />
          </Button>
        ))}
      </div>
    </div>
  );
}
