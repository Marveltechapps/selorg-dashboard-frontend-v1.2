import React from 'react';
import { Activity, Package, AlertTriangle, RotateCcw, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityFeedItem } from '@/api/darkstore/operations.api';

const TYPE_ICONS: Record<string, typeof Package> = {
  order_created: Package,
  order_updated: Package,
  sla_breach: AlertTriangle,
  rto: RotateCcw,
  stock_out: AlertTriangle,
  ops_alert: Bell,
};

const TYPE_COLORS: Record<string, string> = {
  order_created: 'text-blue-600 bg-blue-50',
  order_updated: 'text-indigo-600 bg-indigo-50',
  sla_breach: 'text-red-600 bg-red-50',
  rto: 'text-orange-600 bg-orange-50',
  stock_out: 'text-amber-600 bg-amber-50',
  ops_alert: 'text-violet-600 bg-violet-50',
};

interface ActivityFeedProps {
  items: ActivityFeedItem[];
  loading?: boolean;
  onItemClick?: (item: ActivityFeedItem) => void;
  className?: string;
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export function ActivityFeed({ items, loading, onItemClick, className }: ActivityFeedProps) {
  return (
    <div className={cn('darkstore-card p-5', className)}>
      <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2 text-sm">
        <Activity size={16} className="text-[var(--ds-primary)]" />
        Last 5 Minutes
      </h3>
      <p className="text-xs text-slate-500 mb-4">What changed in your store</p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No recent activity</p>
      ) : (
        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {items.map((item) => {
            const Icon = TYPE_ICONS[item.type] || Package;
            const color = TYPE_COLORS[item.type] || 'text-slate-600 bg-slate-50';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onItemClick?.(item)}
                className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left group"
              >
                <div className={cn('p-1.5 rounded-md shrink-0', color)}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate group-hover:text-[var(--ds-primary)]">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{item.description}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">{formatTimeAgo(item.createdAt)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
