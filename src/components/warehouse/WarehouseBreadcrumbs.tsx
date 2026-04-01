import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const WAREHOUSE_TAB_LABELS: Record<string, string> = {
  overview: 'Warehouse Overview',
  inbound: 'Inbound Ops',
  inventory: 'Inventory & Storage',
  outbound: 'Outbound Ops',
  transfers: 'Transfers',
  qc: 'QC & Compliance',
  workforce: 'Workforce & Shifts',
  'shift-master': 'Shift Master',
  'shift-roster': 'Shift Roster',
  equipment: 'Equipment & Assets',
  devices: 'Devices',
  exceptions: 'Exceptions',
  analytics: 'Reports & Analytics',
  utilities: 'Utilities',
};

const TABS_UNDER_WORKFORCE = new Set(['shift-master', 'shift-roster']);

function dashboardBasePath(pathname: string): string {
  const root = pathname.split('/').filter(Boolean)[0];
  return root ? `/${root}` : '/warehouse';
}

interface Crumb {
  label: string;
  to?: string;
}

export function WarehouseBreadcrumbs({ activeTab }: { activeTab: string }) {
  const location = useLocation();
  const base = dashboardBasePath(location.pathname);
  const currentLabel = WAREHOUSE_TAB_LABELS[activeTab] ?? activeTab;

  const crumbs: Crumb[] = [{ label: 'Warehouse', to: `${base}/overview` }];

  if (TABS_UNDER_WORKFORCE.has(activeTab)) {
    crumbs.push({ label: 'Workforce & Shifts', to: `${base}/workforce` });
  }

  crumbs.push({ label: currentLabel });

  return (
    <nav className="flex flex-wrap items-center gap-2 mb-4 text-sm" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <React.Fragment key={`${crumb.label}-${index}`}>
            {index > 0 && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />}
            {isLast || !crumb.to ? (
              <span
                className={cn(isLast ? 'text-slate-600 font-medium' : 'text-slate-500')}
                aria-current={isLast ? 'page' : undefined}
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to!}
                className="text-slate-500 hover:text-slate-800 font-medium transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
