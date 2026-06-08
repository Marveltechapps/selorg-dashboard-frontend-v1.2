import React, { useState, useEffect, useRef } from 'react';
import { useScreenTab } from '../../hooks/useScreenUrlState';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from "sonner";
import { DashboardOverviewView } from '../darkstore/overview/DashboardOverviewView';
import { OrderDetailsDrawer } from '../darkstore/OrderDetailsDrawer';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import {
  getDashboardSummary,
  getStaffLoad,
  getStockAlerts,
  getRTOAlerts,
  getLiveOrders,
  refreshDashboard,
  restockItem,
} from '../../api/dashboard';
import { callCustomer, markRTO } from '../../api/dashboard/orders.api';
import { getAlertHistory } from '../../api/dashboard';
import { setPendingOrderSearch } from '../../utils/pendingOrderSearch';
import { websocketService } from '../../utils/websocket';
import { getPaymentDisplay } from '../../utils/orderPaymentDisplay';
import { useWebSocketConnection } from '../../hooks/useWebSocketConnection';
import { getPickersLive } from '../../api/darkstore/pickers.api';
import { getPipelineStats, getActivityFeed, type PipelineStats, type ActivityFeedItem } from '../../api/darkstore/operations.api';
import { StoreRequiredGuard } from '../darkstore/StoreRequiredGuard';

interface DashboardHomeProps {
  setActiveTab?: (tab: string) => void;
}

type OrderBoardTab = 'new' | 'returns' | 'cancelled';

const WS_STATUS_BY_TAB: Record<OrderBoardTab, string> = {
  new: 'new',
  returns: 'returns',
  cancelled: 'cancelled',
};

export function DashboardHome({ setActiveTab }: DashboardHomeProps = {}) {
  const handleNavigate = (tab: string) => {
    if (setActiveTab) {
      setActiveTab(tab);
    }
  };
  const ORDER_TABS = ['new', 'returns', 'cancelled'] as const;
  const { activeTab: orderTab, changeTab: setOrderTab } = useScreenTab(ORDER_TABS, 'new');
  const orderTabRef = useRef<OrderBoardTab>('new');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { activeStoreId, switchStore } = useAuth();
  const storeId = activeStoreId || '';
  const isWsConnected = useWebSocketConnection();
  
  // Dashboard data state
  const [stats, setStats] = useState({
    queue: 0,
    newOrders: 0,
    returnsOrders: 0,
    cancelledOrders: 0,
    slaThreat: 0,
    capacity: 0,
    riderWait: '0m 0s',
    breakdown: { normal: 0, priority: 0, express: 0 },
    ordersUnder5Min: 0,
    expectedPeakTime: '4:00 PM',
    lastHourData: [],
  });
  
  const [staffLoad, setStaffLoad] = useState({
    pickers: { active: 0, total: 0, load_percentage: 0 },
    packers: { active: 0, total: 0, load_percentage: 0 },
  });
  
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [rtoAlerts, setRTOAlerts] = useState<any[]>([]);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  
  // Track restocked items and calling status
  const [restockedItems, setRestockedItems] = useState<Set<string>>(new Set());
  const [callingOrders, setCallingOrders] = useState<Map<string, string>>(new Map()); // orderId -> phone number
  const [rtoMarkedOrders, setRTOMarkedOrders] = useState<Set<string>>(new Set());
  
  // History state - track which cards have history expanded
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [historyData, setHistoryData] = useState<Map<string, any[]>>(new Map());
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [confirmRtoId, setConfirmRtoId] = useState<string | null>(null);
  const [confirmRestockSku, setConfirmRestockSku] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStats | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const prevStatsRef = useRef<{ queue: number; slaThreat: number } | null>(null);

  const applyOrdersSnapshot = (orders: any[]) => {
    const ordersWithDeadline = orders.map((o: any) => ({
      ...o,
      sla_deadline: o.sla_deadline || null,
    })).slice(0, 5);
    setLiveOrders(ordersWithDeadline);
  };

  const loadOrdersForTab = async (tab: OrderBoardTab = orderTabRef.current) => {
    const status = WS_STATUS_BY_TAB[tab];
    if (isWsConnected) {
      websocketService.emit('get:live_orders', { storeId, status, limit: 5 });
      return;
    }
    try {
      setIsLoading(true);
      const data = await getLiveOrders(storeId, status, 5);
      if (data?.orders) {
        applyOrdersSnapshot(data.orders);
      } else {
        setLiveOrders([]);
      }
    } catch {
      setLiveOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  orderTabRef.current = orderTab;

  // Load dashboard data on mount and when storeId changes
  useEffect(() => {
    loadDashboardData(true);
    loadOrdersForTab(orderTab);
  }, [storeId]);

  const loadOrdersForTabRef = useRef(loadOrdersForTab);
  loadOrdersForTabRef.current = loadOrdersForTab;

  // Reload orders when tab changes or WebSocket connects
  useEffect(() => {
    setLiveOrders([]);
    loadOrdersForTab(orderTab);
  }, [orderTab, isWsConnected, storeId]);

  // Clock effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh for summary stats
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [storeId]);

  // WebSocket: Live Order Board data comes ONLY from WebSocket (snapshot on connect + incremental events)
  useEffect(() => {
    websocketService.connect();

    const onSnapshot = (data: any) => {
      if (!data || !Array.isArray(data.orders)) return;
      if (storeId && data.store_id && data.store_id !== storeId) return;
      const expectedStatus = WS_STATUS_BY_TAB[orderTabRef.current];
      if (data.status && data.status !== expectedStatus) return;

      applyOrdersSnapshot(data.orders);
    };

    const onCreated = (data: any) => {
      if (!data || !data.order_id) return;
      if (storeId && data.store_id && data.store_id !== storeId) return;
      if (orderTabRef.current !== 'new') return;

      const newOrder = {
        order_id: data.order_id,
        customer_name: data.customer_name || 'Customer',
        item_count: data.item_count || 1,
        sla_timer: data.sla_timer || '15:00',
        sla_deadline: data.sla_deadline,
        sla_status: 'safe',
        status: 'new',
        order_type: data.order_type || 'Normal',
        assignee: null,
        created_at: new Date().toISOString(),
        payment_status: data.payment_status || 'pending',
        payment_method: data.payment_method || 'cash',
        total_bill: data.total_bill || 0,
      };

      setLiveOrders(prev => {
        const alreadyExists = prev.some(o => o.order_id === data.order_id);
        if (alreadyExists) return prev;
        setStats(s => ({
          ...s,
          queue: s.queue + 1,
          newOrders: s.newOrders + 1,
          breakdown: { ...s.breakdown, normal: s.breakdown.normal + 1 },
        }));
        return [newOrder, ...prev].slice(0, 5);
      });
    };

    const onUpdated = (data: any) => {
      if (!data || !data.order_id) return;
      if (storeId && data.store_id && data.store_id !== storeId) return;

      const tab = orderTabRef.current;
      const status = (data.status || '').toLowerCase();

      if (tab === 'new' && (status === 'rto' || status === 'cancelled')) {
        setLiveOrders(prev => prev.filter(o => o.order_id !== data.order_id));
        if (status === 'rto') {
          setStats(s => ({ ...s, returnsOrders: s.returnsOrders + 1 }));
        } else {
          setStats(s => ({ ...s, cancelledOrders: s.cancelledOrders + 1 }));
        }
        return;
      }

      if (tab === 'returns' && status === 'rto') {
        setLiveOrders(prev => {
          const idx = prev.findIndex(o => o.order_id === data.order_id);
          const updated = {
            order_id: data.order_id,
            customer_name: data.customer_name || 'Customer',
            item_count: data.item_count || 1,
            sla_timer: data.sla_timer || '--:--',
            sla_deadline: data.sla_deadline,
            sla_status: data.sla_status || 'safe',
            status: 'rto',
            order_type: data.order_type || 'Normal',
            assignee: data.assignee || null,
            created_at: data.created_at || new Date().toISOString(),
            payment_status: data.payment_status || 'pending',
            payment_method: data.payment_method || 'cash',
            total_bill: data.total_bill || 0,
          };
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...updated };
            return next;
          }
          return [updated, ...prev].slice(0, 5);
        });
        return;
      }

      if (tab === 'new') {
        setLiveOrders(prev => prev.map(o => {
          if (o.order_id !== data.order_id) return o;
          return {
            ...o,
            ...(data.status ? { status: data.status } : {}),
            ...(data.sla_status ? { sla_status: data.sla_status } : {}),
          };
        }));
      }
    };

    const onCancelled = (data: any) => {
      if (!data || !data.order_id) return;
      if (storeId && data.store_id && data.store_id !== storeId) return;

      if (orderTabRef.current === 'new') {
        setLiveOrders(prev => prev.filter(o => o.order_id !== data.order_id));
        setStats(prev => ({
          ...prev,
          queue: Math.max(0, prev.queue - 1),
          newOrders: Math.max(0, prev.newOrders - 1),
          cancelledOrders: prev.cancelledOrders + 1,
        }));
      } else if (orderTabRef.current === 'cancelled') {
        loadOrdersForTabRef.current('cancelled');
        setStats(prev => ({ ...prev, cancelledOrders: prev.cancelledOrders + 1 }));
      } else {
        setStats(prev => ({ ...prev, cancelledOrders: prev.cancelledOrders + 1 }));
      }
    };

    const onPaymentCreated = (data: any) => {
      if (!data || !data.orderId) return;
      const isFailed = data.status === 'failed';
      const isSuccess = data.status === 'success' || data.status === 'completed';
      const isCod = (data.methodType || '').toLowerCase() === 'cash' || (data.methodType || '').toLowerCase() === 'cod';
      setLiveOrders(prev => prev.map(o => {
        if (o.order_id !== data.orderId) return o;
        const newStatus = isFailed ? 'failed' : (isSuccess && !isCod) ? 'paid' : o.payment_status;
        return {
          ...o,
          payment_status: newStatus,
        };
      }));
      if (!isFailed) {
        toast.success(`Payment received: ₹${(data.amount || 0).toLocaleString('en-IN')} via ${data.methodDisplay || data.methodType || 'Unknown'}`);
      }
    };

    websocketService.on('live_orders:snapshot', onSnapshot);
    websocketService.on('order:created', onCreated);
    websocketService.on('order:updated', onUpdated);
    websocketService.on('order:cancelled', onCancelled);
    websocketService.on('payment:created', onPaymentCreated);

    return () => {
      websocketService.off('live_orders:snapshot', onSnapshot);
      websocketService.off('order:created', onCreated);
      websocketService.off('order:updated', onUpdated);
      websocketService.off('order:cancelled', onCancelled);
      websocketService.off('payment:created', onPaymentCreated);
    };
  }, [storeId]);

  // Real-time SLA timer update for live orders (runs every second)
  // Timer starts from 15:00 and counts down from createdAt + 15 minutes
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setLiveOrders((prevOrders) => {
        return prevOrders.map((order: any) => {
          // Use sla_deadline if available, otherwise calculate from created_at + 15 minutes
          let deadline: Date;
          if (order.sla_deadline) {
            deadline = new Date(order.sla_deadline);
          } else if (order.created_at) {
            const createdAt = new Date(order.created_at);
            deadline = new Date(createdAt.getTime() + 15 * 60 * 1000); // 15 minutes from creation
          } else {
            return order; // No timestamp available
          }
          
          const now = new Date();
          const diff = deadline.getTime() - now.getTime();
          
          if (diff <= 0) {
            // SLA breached
            return {
              ...order,
              sla_timer: '00:00',
              sla_status: 'critical',
            };
          }
          
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          const formattedTimer = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          
          // Update SLA status based on time remaining
          let slaStatus = 'safe';
          if (minutes < 5) {
            slaStatus = 'critical';
          } else if (minutes < 15) {
            slaStatus = 'warning';
          }
          
          return {
            ...order,
            sla_timer: formattedTimer,
            sla_status: slaStatus,
            sla_deadline: deadline.toISOString(), // Ensure deadline is set for next iteration
          };
        });
      });
    }, 1000); // Update every second

    return () => clearInterval(timerInterval);
  }, []);

  const loadDashboardData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      
      // Load dashboard data in parallel. Live Order Board now uses WebSocket exclusively.
      const promises: Promise<any>[] = [
        getDashboardSummary(storeId).catch(() => null),
        getStaffLoad(storeId).catch(() => null),
        getStockAlerts(storeId).catch(() => null),
        getRTOAlerts(storeId).catch(() => null),
      ];
      
      const results = await Promise.all(promises);
      const [summary, staff, stock, rto] = results;
      const livePickers = await getPickersLive().catch(() => null);
      const [pipelineRes, feedRes] = await Promise.all([
        getPipelineStats({ storeId }).catch(() => null),
        getActivityFeed({ storeId, minutes: 5 }).catch(() => null),
      ]);
      if (pipelineRes?.data) setPipeline(pipelineRes.data);
      if (feedRes?.data) setActivityFeed(feedRes.data);
      setPipelineLoading(false);

      // Update summary stats
      if (summary) {
        const breakdown = summary.queue?.breakdown || { normal: 0, priority: 0, express: 0 };
        // Ensure total = normal + priority + express (as per requirements)
        const calculatedTotal = breakdown.normal + breakdown.priority + breakdown.express;
        
        setStats({
          queue: calculatedTotal, // Use calculated total instead of API total
          newOrders: summary.queue?.new_orders || 0,
          returnsOrders: summary.queue?.returns_count ?? 0,
          cancelledOrders: summary.queue?.cancelled_count ?? 0,
          slaThreat: summary.sla_threat?.percentage || 0,
          capacity: summary.store_capacity?.percentage || 0,
          riderWait: summary.rider_wait_times?.average || '0m 0s',
          breakdown,
          ordersUnder5Min: summary.sla_threat?.orders_under_5min || 0,
          expectedPeakTime: summary.store_capacity?.expected_peak_time || '4:00 PM',
          lastHourData: summary.rider_wait_times?.last_hour_data || [],
        });
      }

      // Update staff load (use API data or genuine empty state)
      const livePickerList = Array.isArray(livePickers?.data) ? livePickers.data : [];
      const livePickerTotal = livePickerList.length;
      const livePickerActive = livePickerList.filter((p: any) =>
        p?.online && ['AVAILABLE', 'PICKING', 'DEVICE_IDLE'].includes(String(p?.derivedStatus || '').toUpperCase())
      ).length;
      const pickerLoadPercent = livePickerTotal > 0 ? Math.round((livePickerActive / livePickerTotal) * 100) : 0;
      setStaffLoad({
        pickers: {
          active: livePickerTotal > 0 ? livePickerActive : (staff?.pickers?.active ?? 0),
          total: livePickerTotal > 0 ? livePickerTotal : (staff?.pickers?.total ?? 0),
          load_percentage: livePickerTotal > 0 ? pickerLoadPercent : (staff?.pickers?.load_percentage ?? 0),
        },
        packers: (staff && staff.packers) ? staff.packers : { active: 0, total: 0, load_percentage: 0 },
      });

      // Update alerts (use API data or genuine empty state)
      setStockAlerts((stock && Array.isArray(stock.alerts)) ? stock.alerts : []);
      setRTOAlerts((rto && Array.isArray(rto.alerts)) ? rto.alerts : []);
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      // Silent fail - don't disrupt UI
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Sync data when WebSocket connects — catch up on any orders missed while disconnected
  const loadDashboardRef = React.useRef(loadDashboardData);
  loadDashboardRef.current = loadDashboardData;
  const prevWsRef = React.useRef(false);
  useEffect(() => {
    if (isWsConnected && !prevWsRef.current) {
      loadDashboardRef.current(false);
      loadOrdersForTab(orderTabRef.current);
    }
    prevWsRef.current = isWsConnected;
  }, [isWsConnected]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshDashboard(storeId);
      await loadDashboardData(false);
      loadOrdersForTab(orderTab);
      toast.success('Dashboard refreshed');
    } catch (error: any) {
      toast.error('Failed to refresh dashboard');
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleHistory = async (type: 'RTO' | 'STOCK', entityId: string) => {
    const key = `${type}-${entityId}`;
    const isExpanded = expandedHistory.has(key);
    
    if (isExpanded) {
      // Collapse
      setExpandedHistory((prev) => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    } else {
      // Expand - load history
      setExpandedHistory((prev) => new Set(prev).add(key));
      
      // Check if we already have history data
      if (!historyData.has(key)) {
        try {
          setLoadingHistory((prev) => new Set(prev).add(key));
          const entityType = type === 'RTO' ? 'ORDER' : 'SKU';
          const alertType = type === 'RTO' ? 'RTO' : 'STOCK_OUT';
          const response = await getAlertHistory(entityType, entityId, alertType);
          
          if (response && response.success) {
            setHistoryData((prev) => {
              const newMap = new Map(prev);
              newMap.set(key, response.history || []);
              return newMap;
            });
          }
        } catch (error: any) {
          console.error('Failed to load history:', error);
          toast.error('Failed to load history');
        } finally {
          setLoadingHistory((prev) => {
            const newSet = new Set(prev);
            newSet.delete(key);
            return newSet;
          });
        }
      }
    }
  };

  const handleRestock = async (sku: string) => {
    try {
      // Optimistic update - mark as restocked immediately
      setRestockedItems((prev) => new Set(prev).add(sku));
      
      const response = await restockItem(sku, storeId, 50, 'high');
      
      if (response && response.success) {
        toast.success('✅ Restock successful');
        
        // Refresh stock alerts to update UI (restocked items will be filtered out)
        const stock = await getStockAlerts(storeId);
        if (stock) {
          setStockAlerts(stock.alerts || []);
        }
        
        // Refresh history if history is expanded for this SKU
        const historyKey = `STOCK-${sku}`;
        if (expandedHistory.has(historyKey)) {
          try {
            const historyResponse = await getAlertHistory('SKU', sku, 'STOCK_OUT');
            if (historyResponse && historyResponse.success) {
              setHistoryData((prev) => {
                const newMap = new Map(prev);
                newMap.set(historyKey, historyResponse.history || []);
                return newMap;
              });
            }
          } catch (error) {
            console.error('Failed to refresh history:', error);
          }
        }
      } else {
        // Revert optimistic update on error
        setRestockedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(sku);
          return newSet;
        });
        toast.error('Failed to initiate restock');
      }
    } catch (error: any) {
      console.error('Restock error:', error);
      // Revert optimistic update on error
      setRestockedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sku);
        return newSet;
      });
      toast.error(error.message || 'Failed to initiate restock');
    }
  };

  const handleCallCustomer = async (orderId: string) => {
    try {
      // Show calling state immediately (optimistic update)
      setCallingOrders((prev) => {
        const newMap = new Map(prev);
        newMap.set(orderId, 'Calling...');
        return newMap;
      });
      
      // Call backend API
      const response = await callCustomer(orderId, { reason: 'Address verification needed' });
      
      if (response && response.success) {
        // Use phone number from backend response if available
        const phoneNumber = response.called_number || 'Customer phone unavailable';
        
        // Update with actual phone number
        setCallingOrders((prev) => {
          const newMap = new Map(prev);
          newMap.set(orderId, phoneNumber);
          return newMap;
        });
        
        toast.success('Call initiated');
        
        // Clear calling state after 3 seconds
        setTimeout(() => {
          setCallingOrders((prev) => {
            const newMap = new Map(prev);
            newMap.delete(orderId);
            return newMap;
          });
        }, 3000);
        
        // Refresh RTO alerts to update UI
        const rto = await getRTOAlerts(storeId);
        if (rto) {
          setRTOAlerts(rto.alerts || []);
        }
        
        // Refresh history if history is expanded for this order
        const historyKey = `RTO-${orderId}`;
        if (expandedHistory.has(historyKey)) {
          try {
            const historyResponse = await getAlertHistory('ORDER', orderId, 'RTO');
            if (historyResponse && historyResponse.success) {
              setHistoryData((prev) => {
                const newMap = new Map(prev);
                newMap.set(historyKey, historyResponse.history || []);
                return newMap;
              });
            }
          } catch (error) {
            console.error('Failed to refresh history:', error);
          }
        }
      } else {
        // Clear calling state on error
        setCallingOrders((prev) => {
          const newMap = new Map(prev);
          newMap.delete(orderId);
          return newMap;
        });
        toast.error('Failed to call customer');
      }
    } catch (error: any) {
      console.error('Call customer error:', error);
      // Clear calling state on error
      setCallingOrders((prev) => {
        const newMap = new Map(prev);
        newMap.delete(orderId);
        return newMap;
      });
      toast.error(error.message || 'Failed to call customer');
    }
  };

  const handleMarkRTO = async (orderId: string) => {
    try {
      // Mark as RTO immediately in state
      setRTOMarkedOrders((prev) => new Set(prev).add(orderId));
      
      const response = await markRTO(orderId, { 
        reason: 'Customer unreachable', 
        notes: 'Multiple delivery attempts failed',
        rto_status: 'marked_rto',
      });
      
      if (response && response.success) {
        toast.success(`Order ${orderId} marked as RTO`);
        
        setStats((prev) => ({ ...prev, returnsOrders: prev.returnsOrders + 1 }));
        if (orderTabRef.current === 'returns') {
          loadOrdersForTabRef.current('returns');
        } else if (orderTabRef.current === 'new') {
          setLiveOrders((prev) => prev.filter((o) => o.order_id !== orderId));
        }

        // Remove from RTO alerts list immediately
        setRTOAlerts((prev) => prev.filter((alert: any) => alert.order_id !== orderId));
        
        // Also refresh from backend to ensure consistency
        const rto = await getRTOAlerts(storeId);
        if (rto) {
          setRTOAlerts(rto.alerts || []);
        }
        
        // Refresh history if history is expanded for this order
        const historyKey = `RTO-${orderId}`;
        if (expandedHistory.has(historyKey)) {
          try {
            const response = await getAlertHistory('ORDER', orderId, 'RTO');
            if (response && response.success) {
              setHistoryData((prev) => {
                const newMap = new Map(prev);
                newMap.set(historyKey, response.history || []);
                return newMap;
              });
            }
          } catch (error) {
            console.error('Failed to refresh history:', error);
          }
        }
      } else {
        // Revert state on error
        setRTOMarkedOrders((prev) => {
          const newSet = new Set(prev);
          newSet.delete(orderId);
          return newSet;
        });
        toast.error('Failed to mark order as RTO');
      }
    } catch (error: any) {
      console.error('Mark RTO error:', error);
      // Revert state on error
      setRTOMarkedOrders((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
      toast.error(error.message || 'Failed to mark order as RTO');
    }
  };

  const queueTrend =
    prevStatsRef.current != null && stats.queue !== prevStatsRef.current.queue
      ? `${stats.queue >= prevStatsRef.current.queue ? '+' : ''}${stats.queue - prevStatsRef.current.queue}`
      : stats.newOrders > 0
        ? `+${stats.newOrders} new`
        : undefined;

  const slaTrend =
    prevStatsRef.current != null && stats.slaThreat !== prevStatsRef.current.slaThreat
      ? `${Math.abs(stats.slaThreat - prevStatsRef.current.slaThreat)}%`
      : stats.ordersUnder5Min > 0
        ? `${stats.ordersUnder5Min} critical`
        : undefined;

  useEffect(() => {
    if (!isLoading) {
      prevStatsRef.current = { queue: stats.queue, slaThreat: stats.slaThreat };
    }
  }, [stats.queue, stats.slaThreat, isLoading]);

  const handleShiftHandoffExport = () => {
    const storeId = activeStoreId || 'unknown';
    const now = new Date();
    const body = [
      'SELORG DARKSTORE — SHIFT HANDOFF SUMMARY',
      '========================================',
      `Store: ${storeId}`,
      `Generated: ${now.toLocaleString()}`,
      '',
      'PIPELINE SNAPSHOT',
      `  Queue: ${stats.queue}`,
      `  SLA Threat: ${stats.slaThreat}%`,
      `  Orders < 5m: ${stats.ordersUnder5Min}`,
      `  Pipeline Active: ${pipeline?.totalActive ?? '—'}`,
      `  Pickers: ${staffLoad.pickers.active}/${staffLoad.pickers.total}`,
      `  Packers: ${staffLoad.packers.active}/${staffLoad.packers.total}`,
      '',
      'OPEN ITEMS',
      `  Stock alerts: ${stockAlerts.length}`,
      `  RTO alerts: ${rtoAlerts.length}`,
      '',
      'NOTES FOR NEXT MANAGER:',
      '  ___________________________',
    ].join('\n');
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shift-handoff-${storeId}-${now.toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Shift handoff summary downloaded');
  };

  if (!storeId) {
    return <StoreRequiredGuard title="Select a store for Store Overview"><span className="sr-only">overview</span></StoreRequiredGuard>;
  }

  return (
    <>
      <DashboardOverviewView
        currentTime={currentTime}
        isRefreshing={isRefreshing}
        isLoading={isLoading}
        isWsConnected={isWsConnected}
        stats={stats}
        staffLoad={staffLoad}
        stockAlerts={stockAlerts}
        rtoAlerts={rtoAlerts}
        liveOrders={liveOrders}
        orderTab={orderTab}
        setOrderTab={setOrderTab}
        restockedItems={restockedItems}
        callingOrders={callingOrders}
        rtoMarkedOrders={rtoMarkedOrders}
        expandedHistory={expandedHistory}
        historyData={historyData}
        loadingHistory={loadingHistory}
        onRefresh={handleManualRefresh}
        onNavigate={handleNavigate}
        onOrderClick={(orderId) => {
          setSelectedOrderId(orderId);
          setOrderDrawerOpen(true);
        }}
        onRestock={(sku) => setConfirmRestockSku(sku)}
        onCallCustomer={handleCallCustomer}
        onMarkRTO={(orderId) => setConfirmRtoId(orderId)}
        onToggleHistory={handleToggleHistory}
        queueTrend={queueTrend}
        slaTrend={slaTrend}
        pipeline={pipeline}
        pipelineLoading={pipelineLoading}
        activityFeed={activityFeed}
        onPipelineStageClick={(stage) => {
          if (setActiveTab) setActiveTab('liveorders');
        }}
        onActivityClick={(item) => {
          if (item.orderId) {
            setSelectedOrderId(item.orderId);
            setOrderDrawerOpen(true);
          } else if (setActiveTab) {
            setActiveTab('exception-inbox');
          }
        }}
        onShiftHandoffExport={handleShiftHandoffExport}
        onStoreSwitch={(storeId) => switchStore(storeId)}
      />
      <OrderDetailsDrawer
        orderId={selectedOrderId}
        open={orderDrawerOpen}
        onOpenChange={setOrderDrawerOpen}
      />
      <ConfirmationDialog
        open={!!confirmRtoId}
        onOpenChange={(o) => !o && setConfirmRtoId(null)}
        title="Mark order as RTO?"
        description="This will move the order to returns. Confirm only if the customer is unreachable."
        variant="destructive"
        confirmText="Mark RTO"
        onConfirm={async () => {
          if (confirmRtoId) await handleMarkRTO(confirmRtoId);
        }}
      />
      <ConfirmationDialog
        open={!!confirmRestockSku}
        onOpenChange={(o) => !o && setConfirmRestockSku(null)}
        title="Initiate restock?"
        description="A replenishment task will be created for this SKU."
        confirmText="Restock"
        onConfirm={async () => {
          if (confirmRestockSku) await handleRestock(confirmRestockSku);
        }}
      />
    </>
  );
}