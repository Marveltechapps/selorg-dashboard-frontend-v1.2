import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebSocketConnection } from '@/hooks/useWebSocketConnection';

interface ConnectionStatusProps {
  lastSync?: Date;
  className?: string;
  compact?: boolean;
}

export function ConnectionStatus({ lastSync, className, compact }: ConnectionStatusProps) {
  const isConnected = useWebSocketConnection();
  const [reconnecting, setReconnecting] = React.useState(false);

  React.useEffect(() => {
    if (isConnected) {
      setReconnecting(false);
      return;
    }
    const t = window.setTimeout(() => setReconnecting(true), 3000);
    return () => window.clearTimeout(t);
  }, [isConnected]);

  const status = isConnected ? 'live' : reconnecting ? 'reconnecting' : 'offline';

  const config = {
    live: {
      icon: Wifi,
      label: compact ? 'Live' : 'Live Updates',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-600 animate-pulse',
    },
    reconnecting: {
      icon: Loader2,
      label: compact ? 'Syncing' : 'Reconnecting…',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
    },
    offline: {
      icon: WifiOff,
      label: compact ? 'Offline' : 'Offline — polling',
      className: 'bg-slate-100 text-slate-600 border-slate-200',
      dot: 'bg-slate-400',
    },
  }[status];

  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border',
        config.className,
        className
      )}
      title={lastSync ? `Last sync: ${lastSync.toLocaleTimeString()}` : undefined}
    >
      {status === 'reconnecting' ? (
        <Icon size={12} className="animate-spin" />
      ) : (
        <span className={cn('w-2 h-2 rounded-full', config.dot)} />
      )}
      <span>{config.label}</span>
      {!compact && lastSync && (
        <span className="text-[10px] opacity-70 ml-1 hidden sm:inline">
          · {lastSync.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
