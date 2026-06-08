import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardSummary, getRTOAlerts, getStockAlerts } from '@/api/dashboard';
import { getExceptionQueue, getOperationalAlerts, getSlaMonitor, getPipelineStats } from '@/api/darkstore/operations.api';
import { websocketService } from '@/utils/websocket';

export interface DarkstoreNavCounts {
  liveOrders: number;
  exceptions: number;
  slaCritical: number;
  ordersUnder5Min: number;
  alerts: number;
  stockAlerts: number;
}

const EMPTY: DarkstoreNavCounts = {
  liveOrders: 0,
  exceptions: 0,
  slaCritical: 0,
  ordersUnder5Min: 0,
  alerts: 0,
  stockAlerts: 0,
};

export function useDarkstoreNavCounts(): DarkstoreNavCounts {
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';
  const [counts, setCounts] = useState<DarkstoreNavCounts>(EMPTY);

  const load = useCallback(async () => {
    if (!storeId) {
      setCounts(EMPTY);
      return;
    }
    try {
      const [summary, exceptions, sla, pipeline, rto, stock, opsAlerts] = await Promise.all([
        getDashboardSummary(storeId),
        getExceptionQueue({ storeId, status: 'open', limit: 1, page: 1 }),
        getSlaMonitor({ storeId, risk: 'critical' }),
        getPipelineStats({ storeId }),
        getRTOAlerts(storeId),
        getStockAlerts(storeId),
        getOperationalAlerts({ storeId, status: 'open' }),
      ]);

      setCounts({
        liveOrders: summary?.queue?.total ?? summary?.queue ?? 0,
        exceptions: exceptions?.pagination?.total ?? exceptions?.data?.length ?? 0,
        slaCritical: pipeline?.data?.slaCritical ?? sla?.data?.length ?? 0,
        ordersUnder5Min: pipeline?.data?.ordersUnder5Min ?? summary?.sla_threat?.orders_under_5min ?? 0,
        alerts: (opsAlerts?.data?.length ?? 0) + (rto?.alerts?.length ?? 0),
        stockAlerts: stock?.alerts?.length ?? 0,
      });
    } catch {
      /* keep previous */
    }
  }, [storeId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    const onOrder = () => load();
    websocketService.on('order:created', onOrder);
    websocketService.on('order:updated', onOrder);
    return () => {
      clearInterval(interval);
      websocketService.off('order:created', onOrder);
      websocketService.off('order:updated', onOrder);
    };
  }, [load]);

  return counts;
}
