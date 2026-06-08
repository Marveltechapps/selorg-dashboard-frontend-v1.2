import React, { useEffect, useState } from 'react';
import { ArrowRight, LayoutDashboard, UserCheck, Warehouse, Headphones, Clock, Package, Inbox } from 'lucide-react';
import { useDarkstore, type OpsRole } from './DarkstoreProvider';
import { DarkstoreScreenShell } from './DarkstoreScreenShell';
import { MetricCard } from './MetricCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getPipelineStats } from '@/api/darkstore/operations.api';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_CONFIG: Record<
  OpsRole,
  {
    label: string;
    description: string;
    icon: typeof LayoutDashboard;
    tabs: { id: string; label: string; description: string }[];
  }
> = {
  manager: {
    label: 'Store Manager',
    description: 'Command center — pipeline health, SLA threats, and exceptions.',
    icon: LayoutDashboard,
    tabs: [
      { id: 'overview', label: 'Store Overview', description: 'Live pipeline & KPIs' },
      { id: 'slamonitor', label: 'SLA Monitor', description: 'Orders at risk' },
      { id: 'exception-inbox', label: 'Exception Inbox', description: 'Triage queue' },
    ],
  },
  floor_lead: {
    label: 'Floor Lead',
    description: 'Fulfillment floor — picker lanes, pick & pack, live queue.',
    icon: UserCheck,
    tabs: [
      { id: 'livepickerboard', label: 'Picker Board', description: 'Lanes & reassign' },
      { id: 'fulfillment', label: 'Fulfillment Floor', description: 'Pick, pack & monitor' },
      { id: 'liveorders', label: 'Live Orders', description: 'Full order queue' },
    ],
  },
  inventory: {
    label: 'Inventory Lead',
    description: 'Stock health — missing items, replenishment, inbound.',
    icon: Warehouse,
    tabs: [
      { id: 'missingitems', label: 'Missing Items', description: 'Substitution workflow' },
      { id: 'inventory', label: 'Inventory', description: 'Stock levels' },
      { id: 'inbound', label: 'Inbound', description: 'Receiving' },
    ],
  },
  support: {
    label: 'Support Lead',
    description: 'Customer issues — exceptions, RTO, and issue management.',
    icon: Headphones,
    tabs: [
      { id: 'exception-inbox', label: 'Exception Inbox', description: 'Unified triage' },
      { id: 'issues', label: 'Issue Management', description: 'Open tickets' },
      { id: 'liveorders', label: 'Live Orders', description: 'Order lookup' },
    ],
  },
};

interface MyShiftLandingProps {
  setActiveTab: (tab: string) => void;
}

export function MyShiftLanding({ setActiveTab }: MyShiftLandingProps) {
  const { preferences } = useDarkstore();
  const { activeStoreId } = useAuth();
  const role = preferences.opsRole || 'manager';
  const config = ROLE_CONFIG[role];
  const Icon = config.icon;
  const [pipeline, setPipeline] = useState<{ totalActive: number; slaCritical: number; ordersUnder5Min: number } | null>(null);

  useEffect(() => {
    const storeId = activeStoreId || '';
    getPipelineStats({ storeId })
      .then((res) => {
        if (res?.data) {
          setPipeline({
            totalActive: res.data.totalActive,
            slaCritical: res.data.slaCritical,
            ordersUnder5Min: res.data.ordersUnder5Min,
          });
        }
      })
      .catch(() => setPipeline(null));
  }, [activeStoreId]);

  return (
    <DarkstoreScreenShell
      title="My Shift"
      subtitle={`${config.label} workspace — your operational command post for this shift.`}
      toolbar={{ showDensityToggle: false, showConnection: true }}
    >
      <div className="darkstore-card-elevated p-6 border-l-4 border-l-[var(--ds-primary)] darkstore-fade-in">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-[var(--ds-primary-muted)]">
            <Icon size={24} className="text-[var(--ds-primary)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{config.label}</h2>
            <p className="text-sm text-slate-500 mt-1">{config.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <MetricCard label="Pipeline Active" value={(pipeline?.totalActive ?? '—') as number | string} icon={Package} loading={!pipeline} />
          <MetricCard label="SLA Critical" value={(pipeline?.slaCritical ?? '—') as number | string} icon={Clock} accent="danger" loading={!pipeline} />
          <MetricCard label="< 5m to Breach" value={(pipeline?.ordersUnder5Min ?? '—') as number | string} icon={Inbox} accent="warning" loading={!pipeline} />
        </div>

        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Your workspaces</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {config.tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-[var(--ds-primary)] hover:shadow-md transition-all group'
              )}
            >
              <p className="text-sm font-semibold text-slate-800 group-hover:text-[var(--ds-primary)]">{tab.label}</p>
              <p className="text-xs text-slate-500 mt-1">{tab.description}</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ds-primary)] mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowRight size={12} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </DarkstoreScreenShell>
  );
}
