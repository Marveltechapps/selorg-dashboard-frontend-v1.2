import { useEffect, useCallback, useRef } from 'react';
import {
  DASHBOARD_TOPICS,
  emitDashboardRefresh,
  subscribeDashboardRefresh,
  type DashboardTopic,
} from '../lib/dashboardRefreshBus';

export { DASHBOARD_TOPICS, emitDashboardRefresh };

/**
 * Re-run the latest `callback` whenever `emitDashboardRefresh(topic)` is called (e.g. after API mutations).
 * Does not run on mount — keep your existing useEffect for initial load.
 */
export function useOnDashboardRefresh(topic: DashboardTopic | string, callback: () => void): void {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => {
    const run = () => {
      ref.current();
    };
    return subscribeDashboardRefresh(topic, run);
  }, [topic]);
}

/** Imperative invalidation from components (e.g. after a local-only mutation). */
export function useEmitDashboardRefresh() {
  return useCallback((topic: DashboardTopic | string) => {
    emitDashboardRefresh(topic);
  }, []);
}
