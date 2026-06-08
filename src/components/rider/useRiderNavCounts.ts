import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/api/apiClient';
import { websocketService } from '@/utils/websocket';

export interface RiderNavCounts {
  dispatchQueue: number;
  escalations: number;
  alerts: number;
}

const EMPTY: RiderNavCounts = {
  dispatchQueue: 0,
  escalations: 0,
  alerts: 0,
};

export function useRiderNavCounts(): RiderNavCounts {
  const { activeStoreId } = useAuth();
  const [counts, setCounts] = useState<RiderNavCounts>(EMPTY);

  const load = useCallback(async () => {
    try {
      const params = activeStoreId ? `?hubId=${encodeURIComponent(activeStoreId)}` : '';
      const res = await apiRequest<{ success: boolean; data: RiderNavCounts }>(
        `/rider/dashboard/counts${params}`
      );
      setCounts({
        dispatchQueue: res.data?.dispatchQueue ?? 0,
        escalations: res.data?.escalations ?? 0,
        alerts: res.data?.alerts ?? 0,
      });
    } catch {
      /* keep previous */
    }
  }, [activeStoreId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    const refresh = () => load();
    websocketService.on('order:updated', refresh);
    websocketService.on('order:created', refresh);
    websocketService.on('alert:created', refresh);
    return () => {
      clearInterval(interval);
      websocketService.off('order:updated', refresh);
      websocketService.off('order:created', refresh);
      websocketService.off('alert:created', refresh);
    };
  }, [load]);

  return counts;
}
