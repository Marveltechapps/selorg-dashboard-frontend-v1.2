import React from 'react';
import { Clock, CheckCircle2, CircleDot } from 'lucide-react';
import { cn } from './utils';

export interface ActionLog {
  _id?: string;
  actionType: string;
  pickerId: string;
  orderId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const ACTION_LABELS: Record<string, string> = {
  punch_in: 'Punch In',
  punch_out: 'Punch Out',
  break_start: 'Break Start',
  break_end: 'Break End',
  order_assigned: 'Order Assigned',
  start_picking: 'Start Picking',
  complete_picking: 'Complete Picking',
  bag_rack_assigned: 'Bag/Rack Assigned',
  issue_report: 'Issue Reported',
  withdrawal_request: 'Withdrawal Requested',
  device_return: 'Device Returned',
};

interface ActionLogsTimelineProps {
  logs: ActionLog[];
  loading?: boolean;
  emptyMessage?: string;
}

export function ActionLogsTimeline({ logs, loading, emptyMessage = 'No action logs' }: ActionLogsTimelineProps) {
  if (loading) {
    return (
      <div className="relative pl-6 py-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-4/5" />
        </div>
      </div>
    );
  }
  if (!logs || logs.length === 0) {
    return <p className="text-sm text-gray-500 py-4">{emptyMessage}</p>;
  }

  const isSuccess = (t: ActionLog) => ['complete_picking', 'bag_rack_assigned', 'punch_out', 'device_return'].includes(t.actionType);
  const isActive = (t: ActionLog) => ['start_picking', 'order_assigned', 'punch_in', 'break_start'].includes(t.actionType);

  return (
    <div className="relative pl-6">
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
      {logs.map((t, idx) => {
        const label = ACTION_LABELS[t.actionType] || t.actionType.replace(/_/g, ' ');
        const badgeColor = isSuccess(t) ? 'border-green-500 bg-green-50' :
          isActive(t) ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50';
        const textColor = isSuccess(t) ? 'text-green-700' : isActive(t) ? 'text-blue-700' : 'text-gray-600';
        return (
          <div key={t._id || idx} className="relative flex items-start gap-3 pb-4">
            <div className={cn(
              "w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 border-2 z-10 bg-white",
              badgeColor
            )}>
              {isSuccess(t) ? (
                <CheckCircle2 size={14} className="text-green-600" />
              ) : isActive(t) ? (
                <CircleDot size={14} className="text-blue-500" />
              ) : (
                <Clock size={14} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium capitalize", textColor)}>{label}</p>
              {t.timestamp && (
                <p className="text-xs text-gray-500">{new Date(t.timestamp).toLocaleString()}</p>
              )}
              {t.orderId && (
                <p className="text-xs text-gray-400">Order: {t.orderId}</p>
              )}
              {t.metadata && Object.keys(t.metadata).length > 0 && (
                <p className="text-xs text-gray-400 truncate">
                  {JSON.stringify(t.metadata).slice(0, 80)}
                  {JSON.stringify(t.metadata).length > 80 ? '…' : ''}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
