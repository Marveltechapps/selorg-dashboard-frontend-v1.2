import React from 'react';
import { RefreshCw, Rows3, LayoutList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDarkstore } from './DarkstoreProvider';
import { ConnectionStatus } from './ConnectionStatus';

interface DarkstoreToolbarProps {
  onRefresh?: () => void;
  refreshing?: boolean;
  lastSync?: Date;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  showDensityToggle?: boolean;
  showConnection?: boolean;
  className?: string;
}

export function DarkstoreToolbar({
  onRefresh,
  refreshing,
  lastSync,
  filters,
  actions,
  showDensityToggle = true,
  showConnection = true,
  className,
}: DarkstoreToolbarProps) {
  const { density, setDensity } = useDarkstore();

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 py-3 px-4 darkstore-card mb-4',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">{filters}</div>
      <div className="flex items-center gap-2">
        {showConnection && <ConnectionStatus lastSync={lastSync} compact />}
        {showDensityToggle && (
          <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
            <button
              type="button"
              title="Comfortable density"
              onClick={() => setDensity('comfortable')}
              className={cn(
                'p-1.5 transition-colors',
                density === 'comfortable' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <LayoutList size={14} />
            </button>
            <button
              type="button"
              title="Compact density"
              onClick={() => setDensity('compact')}
              className={cn(
                'p-1.5 transition-colors',
                density === 'compact' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <Rows3 size={14} />
            </button>
          </div>
        )}
        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="h-8"
          >
            <RefreshCw size={14} className={cn('mr-1.5', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
}
