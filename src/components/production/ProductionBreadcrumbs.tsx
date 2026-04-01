import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCTION_TAB_LABELS: Record<string, string> = {
  overview: 'Production Overview',
  raw_materials: 'Raw Material Mgmt',
  planning: 'Planning & Scheduling',
  work_orders: 'Work Orders & Jobs',
  qc: 'Quality Control',
  maintenance: 'Maintenance & Assets',
  workforce: 'Workforce & Shifts',
  alerts: 'Exceptions & Alerts',
  reports: 'Reports & Analytics',
  utilities: 'Utilities',
};

function dashboardBasePath(pathname: string): string {
  const root = pathname.split('/').filter(Boolean)[0];
  return root ? `/${root}` : '/production';
}

interface Crumb {
  label: string;
  to?: string;
}

export function ProductionBreadcrumbs({ activeTab }: { activeTab: string }) {
  const location = useLocation();
  const base = dashboardBasePath(location.pathname);
  const currentLabel = PRODUCTION_TAB_LABELS[activeTab] ?? activeTab;

  const crumbs: Crumb[] = [{ label: 'Production', to: `${base}/overview` }, { label: currentLabel }];

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
              <Link to={crumb.to} className="text-slate-500 hover:text-slate-800 font-medium transition-colors">
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

