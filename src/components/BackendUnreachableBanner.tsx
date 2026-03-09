import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useBackendHealth } from '../hooks/useBackendHealth';

export function BackendUnreachableBanner() {
  const { isReachable, recheck } = useBackendHealth();

  if (isReachable !== false) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2.5 flex items-center justify-center gap-3 shadow-lg">
      <AlertTriangle size={18} className="flex-shrink-0" />
      <span className="text-sm font-medium">
        Backend server is unreachable. Data may be outdated or unavailable.
      </span>
      <span className="text-xs opacity-90">
        Start backend: <code className="bg-amber-600/30 px-1.5 py-0.5 rounded">cd selorg-dashboard-backend-v1.1 && npm run dev</code>
      </span>
      <button
        onClick={() => recheck()}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/40 hover:bg-amber-600/60 rounded text-sm font-medium transition-colors"
      >
        <RefreshCw size={14} />
        Retry
      </button>
    </div>
  );
}
