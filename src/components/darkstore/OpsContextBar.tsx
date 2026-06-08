import React from 'react';
import { Filter, Zap, Clock, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDarkstore } from './DarkstoreProvider';
import type { OpsRole } from './darkstorePreferences';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ROLE_LABELS: Record<OpsRole, string> = {
  manager: 'Store Manager',
  floor_lead: 'Floor Lead',
  inventory: 'Inventory Lead',
  support: 'Support Lead',
};

interface OpsContextBarProps {
  orderTypeFilter?: string;
  onOrderTypeFilterChange?: (v: string) => void;
  zoneFilter?: string;
  onZoneFilterChange?: (v: string) => void;
  zones?: string[];
  className?: string;
}

export function OpsContextBar({
  orderTypeFilter = 'all',
  onOrderTypeFilterChange,
  zoneFilter = 'all',
  onZoneFilterChange,
  zones = [],
  className,
}: OpsContextBarProps) {
  const { preferences, setOpsRole } = useDarkstore();
  const role = preferences.opsRole || 'manager';

  return (
    <div className={cn('darkstore-card px-4 py-2.5 flex flex-wrap items-center gap-3', className)}>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Filter size={14} />
        <span className="font-semibold uppercase tracking-wide">Ops Context</span>
      </div>

      <Select value={role} onValueChange={(v) => setOpsRole(v as OpsRole)}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(ROLE_LABELS) as OpsRole[]).map((r) => (
            <SelectItem key={r} value={r}>
              {ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {onOrderTypeFilterChange && (
        <Select value={orderTypeFilter} onValueChange={onOrderTypeFilterChange}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <Package size={12} className="mr-1 text-slate-400" />
            <SelectValue placeholder="Order type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="Express">Express</SelectItem>
            <SelectItem value="Priority">Priority</SelectItem>
            <SelectItem value="Normal">Normal</SelectItem>
          </SelectContent>
        </Select>
      )}

      {onZoneFilterChange && zones.length > 0 && (
        <Select value={zoneFilter} onValueChange={onZoneFilterChange}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <Zap size={12} className="mr-1 text-slate-400" />
            <SelectValue placeholder="Zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All zones</SelectItem>
            {zones.map((z) => (
              <SelectItem key={z} value={z}>
                {z}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-400">
        <Clock size={12} />
        <span>Shift view: {ROLE_LABELS[role]}</span>
      </div>
    </div>
  );
}
