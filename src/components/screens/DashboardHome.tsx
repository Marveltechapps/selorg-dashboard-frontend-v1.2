import React, { useState, useEffect } from 'react';
import { ArrowRight, AlertCircle, Package, User, BarChart3, TrendingUp, AlertTriangle, Users, ClipboardList, Bike, RotateCcw, XCircle, CheckCircle2, Clock, History, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from "../../lib/utils";
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../ui/page-header';
import { toast } from "sonner";
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
import { setPendingOrderSearch } from './LiveOrders';
import { websocketService } from '../../utils/websocket';

interface DashboardHomeProps {
  setActiveTab?: (tab: string) => void;
}

export function DashboardHome({ setActiveTab }: DashboardHomeProps = {}) {
  const handleNavigate = (tab: string) => {
    if (setActiveTab) {
      setActiveTab(tab);
    }
  };
  const [orderTab, setOrderTab] = useState('new');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId || '';
  
  // Dashboard data state
  const [stats, setStats] = useState({
    queue: 0,
    newOrders: 0,
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

  // Load dashboard data (re-fetch when storeId changes)
  useEffect(() => {
    loadDashboardData();
  }, [storeId]);

  // Clock effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh every 30 seconds as fallback (WebSocket is primary)
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [storeId]);

  // WebSocket: real-time order events for instant dashboard updates
  useEffect(() => {
    websocketService.connect();

    const onCreated = (data: any) => {
      if (!data || !data.order_id) return;
      if (storeId && data.store_id && data.store_id !== storeId) return;

      const newOrder = {
        order_id: data.order_id,
        customer_name: data.customer_name || 'Customer',
        item_count: data.item_count || 1,
        sla_timer: '15:00',
        sla_deadline: data.sla_deadline,
        sla_status: 'safe',
        status: 'new',
        order_type: data.order_type || 'Normal',
        assignee: null,
        created_at: new Date().toISOString(),
      };

      setLiveOrders(prev => [newOrder, ...prev].slice(0, 5));
      setStats(prev => ({
        ...prev,
        queue: prev.queue + 1,
        newOrders: prev.newOrders + 1,
        breakdown: { ...prev.breakdown, normal: prev.breakdown.normal + 1 },
      }));
    };

    const onUpdated = (data: any) => {
      if (!data || !data.order_id) return;
      if (storeId && data.store_id && data.store_id !== storeId) return;

      setLiveOrders(prev => prev.map(o => {
        if (o.order_id !== data.order_id) return o;
        return {
          ...o,
          ...(data.status ? { status: data.status } : {}),
          ...(data.sla_status ? { sla_status: data.sla_status } : {}),
        };
      }));
    };

    const onCancelled = (data: any) => {
      if (!data || !data.order_id) return;
      if (storeId && data.store_id && data.store_id !== storeId) return;

      setLiveOrders(prev => prev.filter(o => o.order_id !== data.order_id));
      setStats(prev => ({
        ...prev,
        queue: Math.max(0, prev.queue - 1),
      }));
    };

    websocketService.on('order:created', onCreated);
    websocketService.on('order:updated', onUpdated);
    websocketService.on('order:cancelled', onCancelled);

    return () => {
      websocketService.off('order:created', onCreated);
      websocketService.off('order:updated', onUpdated);
      websocketService.off('order:cancelled', onCancelled);
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
      
      // Load all dashboard data in parallel
      const [summary, staff, stock, rto, orders] = await Promise.all([
        getDashboardSummary(storeId).catch(() => null),
        getStaffLoad(storeId).catch(() => null),
        getStockAlerts(storeId).catch(() => null),
        getRTOAlerts(storeId).catch(() => null),
        getLiveOrders(storeId, 'all', 5).catch(() => null),
      ]);

      // Update summary stats
      if (summary) {
        const breakdown = summary.queue?.breakdown || { normal: 0, priority: 0, express: 0 };
        // Ensure total = normal + priority + express (as per requirements)
        const calculatedTotal = breakdown.normal + breakdown.priority + breakdown.express;
        
        setStats({
          queue: calculatedTotal, // Use calculated total instead of API total
          newOrders: summary.queue?.new_orders || 0,
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
      setStaffLoad({
        pickers: (staff && staff.pickers) ? staff.pickers : { active: 0, total: 0, load_percentage: 0 },
        packers: (staff && staff.packers) ? staff.packers : { active: 0, total: 0, load_percentage: 0 },
      });

      // Update alerts (use API data or genuine empty state)
      setStockAlerts((stock && Array.isArray(stock.alerts)) ? stock.alerts : []);
      setRTOAlerts((rto && Array.isArray(rto.alerts)) ? rto.alerts : []);
      if (orders) {
        // Store orders with sla_deadline for real-time timer updates
        const ordersWithDeadline = (orders.orders || []).map((order: any) => ({
          ...order,
          sla_deadline: order.sla_deadline || null, // Ensure deadline is included
        }));
        setLiveOrders(ordersWithDeadline);
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      // Silent fail - don't disrupt UI
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshDashboard(storeId);
      await loadDashboardData(false);
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
        const phoneNumber = response.called_number || `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        
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

  const orderTabs = [
    { id: 'new', label: 'New Orders', count: stats.newOrders || liveOrders.length, color: 'text-[#1677FF]', bg: 'bg-[#E6F7FF]' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        title="Store Overview"
        subtitle="Live operational metrics and active queues."
        actions={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E6F7FF] text-[#1677FF] rounded-full text-xs font-bold uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-[#1677FF] animate-pulse"></span>
              Live Updates
            </span>
            <div className="flex items-center gap-2 text-sm text-[#9E9E9E] bg-white px-3 py-1.5 rounded-lg border border-[#E0E0E0]">
              <span>Last sync: {currentTime.toLocaleTimeString()}</span>
              <button 
                onClick={handleManualRefresh}
                className={cn("p-1 hover:bg-gray-100 rounded-full transition-all", isRefreshing && "animate-spin")}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        }
      />

      {/* Row 1: Key Operational Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {/* Order Queue */}
         <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
               <div>
                 <p className="text-[#757575] text-xs font-bold uppercase tracking-wider">Order Queue</p>
                 <div className="flex items-baseline gap-2 mt-1">
                   <h3 className="text-3xl font-bold text-[#212121] transition-all duration-300 ease-out">
                     {stats.queue}
                   </h3>
                   <span className="text-xs font-bold text-[#22C55E] bg-[#DCFCE7] px-1.5 py-0.5 rounded">+{stats.newOrders} new</span>
                 </div>
               </div>
               <div className="p-2 bg-[#E6F7FF] text-[#1677FF] rounded-lg">
                 <ClipboardList size={20} />
               </div>
            </div>
            <div className="mt-4 flex gap-1 h-1.5 w-full bg-[#F5F5F5] rounded-full overflow-hidden">
               {stats.queue > 0 ? (
                 <>
                   <div className="bg-[#1677FF] transition-all duration-500" style={{ width: `${(stats.breakdown.normal / stats.queue) * 100}%` }} />
                   <div className="bg-[#FACC15] transition-all duration-500" style={{ width: `${(stats.breakdown.priority / stats.queue) * 100}%` }} />
                   <div className="bg-[#EF4444] transition-all duration-500" style={{ width: `${(stats.breakdown.express / stats.queue) * 100}%` }} />
                 </>
               ) : null}
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-medium text-[#757575]">
              <span>{stats.breakdown.normal} Normal</span>
              <span>{stats.breakdown.priority} Priority</span>
              <span>{stats.breakdown.express} Express</span>
            </div>
         </div>

         {/* SLA Threat Meter */}
         <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#EF4444]" />
            <div className="flex justify-between items-start pl-2">
               <div>
                 <p className="text-[#757575] text-xs font-bold uppercase tracking-wider">SLA Threat Meter</p>
                 <h3 className="text-3xl font-bold text-[#EF4444] mt-1">{stats.slaThreat}%</h3>
               </div>
               <div className="p-2 bg-[#FEE2E2] text-[#EF4444] rounded-lg">
                 <AlertTriangle size={20} />
               </div>
            </div>
            <div className="pl-2 mt-4">
              <div className="w-full bg-[#F5F5F5] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#22C55E] via-[#FACC15] to-[#EF4444] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${stats.slaThreat}%` }}
                />
              </div>
              <p className="text-xs text-[#757575] mt-2">
                <span className="font-bold text-[#EF4444]">{stats.ordersUnder5Min} orders</span> &lt; 5 mins to breach
              </p>
            </div>
         </div>

         {/* Store Capacity */}
         <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
            <div className="flex justify-between items-start">
               <div>
                 <p className="text-[#757575] text-xs font-bold uppercase tracking-wider">Store Capacity</p>
                 <h3 className="text-3xl font-bold text-[#212121] mt-1">{stats.capacity}%</h3>
               </div>
               <div className="p-2 bg-[#F3E8FF] text-[#9333EA] rounded-lg">
                 <BarChart3 size={20} />
               </div>
            </div>
            <div className="mt-4 w-full bg-[#F5F5F5] h-2 rounded-full overflow-hidden">
               <div 
                 className="bg-[#9333EA] h-full rounded-full transition-all duration-500" 
                 style={{ width: `${stats.capacity}%` }}
               />
            </div>
            <p className="text-xs text-[#757575] mt-2">High load expected at {stats.expectedPeakTime}</p>
         </div>

         {/* Rider Wait Times */}
         <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
            <div className="flex justify-between items-start">
               <div>
                 <p className="text-[#757575] text-xs font-bold uppercase tracking-wider">Rider Wait Times</p>
                 <h3 className="text-3xl font-bold text-[#212121] mt-1">{stats.riderWait}</h3>
               </div>
               <div className="p-2 bg-[#DCFCE7] text-[#16A34A] rounded-lg">
                 <Bike size={20} />
               </div>
            </div>
            <div className="flex items-end gap-1 mt-4 h-8 w-full">
               {stats.lastHourData.length > 0 ? (
                 stats.lastHourData.map((h: number, i: number) => (
                   <div key={i} className="flex-1 bg-[#BBF7D0] rounded-t-sm" style={{ height: `${Math.min(100, h)}%` }} />
                 ))
               ) : (
                 <div className="text-xs text-[#9E9E9E] py-2">No wait time data</div>
               )}
            </div>
            <p className="text-xs text-[#757575] mt-2">Avg wait time (last hour)</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Alerts & Staff Load */}
        <div className="space-y-6">
           {/* Picker & Packer Load */}
           <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm">
             <h3 className="font-bold text-[#212121] mb-4 flex items-center gap-2">
               <Users size={18} className="text-[#1677FF]" />
               Picker & Packer Load
             </h3>
             <div className="space-y-4">
                <div>
                   <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#616161]">Pickers ({staffLoad.pickers.active}/{staffLoad.pickers.total} Active)</span>
                      <span className="font-bold text-[#212121]">{staffLoad.pickers.load_percentage}% Load</span>
                   </div>
                   <div className="w-full bg-[#F5F5F5] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#1677FF] h-full rounded-full transition-all duration-500" style={{ width: `${staffLoad.pickers.load_percentage}%` }} />
                   </div>
                </div>
                <div>
                   <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#616161]">Packers ({staffLoad.packers.active}/{staffLoad.packers.total} Active)</span>
                      <span className="font-bold text-[#212121]">{staffLoad.packers.load_percentage}% Load</span>
                   </div>
                   <div className="w-full bg-[#F5F5F5] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#3B82F6] h-full rounded-full transition-all duration-500" style={{ width: `${staffLoad.packers.load_percentage}%` }} />
                   </div>
                </div>
             </div>
           </div>

           {/* Stock-Out Alerts */}
           <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm">
             <h3 className="font-bold text-[#212121] mb-4 flex items-center gap-2">
               <AlertCircle size={18} className="text-[#F97316]" />
               Stock-Out Alerts
             </h3>
             <div className="space-y-3">
               {isLoading ? (
                 <div className="text-center py-4 text-[#9E9E9E] text-sm">Loading alerts...</div>
               ) : stockAlerts.filter((alert: any) => !restockedItems.has(alert.sku)).length === 0 ? (
                 <div className="text-center py-4 text-[#9E9E9E] text-sm">No stock alerts</div>
               ) : (
                 stockAlerts
                   .filter((alert: any) => !restockedItems.has(alert.sku)) // Filter out restocked items
                   .slice(0, 5)
                   .map((alert: any, i: number) => (
                   <div key={i} className="p-3 bg-[#FFF7E6] border border-[#FFD591] rounded-lg">
                     <div className="flex items-center justify-between">
                       <div className="flex-1">
                         <p className="text-sm font-bold text-[#D46B08]">{alert.item_name}</p>
                         <p className="text-xs text-[#FA8C16]">{alert.sku}</p>
                       </div>
                       <div className="text-right flex items-center gap-2">
                         <div>
                           <p className="text-xs font-bold text-[#D46B08]">{alert.current_count} left</p>
                           <button 
                             onClick={() => handleRestock(alert.sku)}
                             disabled={restockedItems.has(alert.sku)}
                             className={restockedItems.has(alert.sku) 
                               ? "text-[10px] font-bold text-[#16A34A] mt-1 cursor-not-allowed"
                               : "text-[10px] font-bold text-[#D46B08] underline mt-1 hover:no-underline"
                             }
                           >
                             {restockedItems.has(alert.sku) ? 'Restocked' : 'Restock'}
                           </button>
                         </div>
                         <button
                           onClick={() => handleToggleHistory('STOCK', alert.sku)}
                           className="p-1 text-[#D46B08] hover:text-[#B45309] transition-colors flex items-center gap-1"
                           title="Toggle History"
                         >
                           <History size={14} />
                           {expandedHistory.has(`STOCK-${alert.sku}`) ? (
                             <ChevronUp size={12} />
                           ) : (
                             <ChevronDown size={12} />
                           )}
                         </button>
                       </div>
                     </div>
                     
                     {/* Inline History Section */}
                     {expandedHistory.has(`STOCK-${alert.sku}`) && (
                       <div className="mt-3 pt-3 border-t border-[#FFD591]">
                         {loadingHistory.has(`STOCK-${alert.sku}`) ? (
                           <div className="text-center py-2 text-xs text-[#9E9E9E]">Loading history...</div>
                         ) : (() => {
                           const historyKey = `STOCK-${alert.sku}`;
                           const history = historyData.get(historyKey) || [];
                           return history.length === 0 ? (
                             <div className="text-center py-2 text-xs text-[#9E9E9E]">No history found</div>
                           ) : (
                             <div className="space-y-2">
                               {history.map((entry: any, idx: number) => (
                                 <div key={idx} className="text-xs bg-white/50 rounded p-2 border border-[#FFD591]/50">
                                   {entry.action === 'RESTOCK' && entry.metadata && (
                                     <>
                                       <div className="font-semibold text-[#D46B08]">
                                         Restocked +{entry.metadata.quantity_added ?? 'N/A'}
                                       </div>
                                       <div className="text-[#757575] mt-0.5">
                                         Stock: {entry.metadata.previous_stock ?? 'N/A'} → <span className="text-[#16A34A] font-semibold">{entry.metadata.updated_stock ?? 'N/A'}</span>
                                       </div>
                                       <div className="text-[#9E9E9E] mt-0.5 text-[10px]">
                                         {new Date(entry.performed_at).toLocaleString()}
                                       </div>
                                     </>
                                   )}
                                 </div>
                               ))}
                             </div>
                           );
                         })()}
                       </div>
                     )}
                   </div>
                 ))
               )}
             </div>
           </div>

           {/* RTO Risk Alerts */}
           <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm">
             <h3 className="font-bold text-[#212121] mb-4 flex items-center gap-2">
               <RotateCcw size={18} className="text-[#EF4444]" />
               RTO Risk Alerts
             </h3>
             <div className="space-y-3">
               {isLoading ? (
                 <div className="text-center py-4 text-[#9E9E9E] text-sm">Loading alerts...</div>
               ) : rtoAlerts.length === 0 ? (
                 <div className="text-center py-4 text-[#9E9E9E] text-sm">No RTO alerts</div>
               ) : (
                 rtoAlerts
                   .filter((alert: any) => !rtoMarkedOrders.has(alert.order_id)) // Filter out marked RTO orders
                   .slice(0, 3)
                   .map((alert: any, i: number) => {
                     const isCalling = callingOrders.has(alert.order_id);
                     const phoneNumber = callingOrders.get(alert.order_id);
                     
                     return (
                   <div key={i} className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg">
                     <div className="flex items-start gap-3">
                       <AlertTriangle size={16} className="text-[#EF4444] mt-0.5" />
                       <div className="flex-1">
                          <p className="text-sm font-bold text-[#991B1B]">Order {alert.order_id} - {alert.issue_type?.replace('_', ' ')}</p>
                          <p className="text-xs text-[#B91C1C] mt-1">{alert.description}</p>
                          {isCalling && (
                            <p className="text-xs text-[#991B1B] mt-1 font-semibold">Calling {phoneNumber}...</p>
                          )}
                          <div className="flex gap-2 mt-2 items-center">
                            <button 
                              onClick={() => handleCallCustomer(alert.order_id)}
                              disabled={isCalling}
                              className={isCalling
                                ? "px-2 py-1 bg-[#FEE2E2] border border-[#FECACA] rounded text-[10px] font-bold text-[#991B1B] cursor-not-allowed opacity-75"
                                : "px-2 py-1 bg-white border border-[#FECACA] rounded text-[10px] font-bold text-[#991B1B] hover:bg-[#FEE2E2]"
                              }
                            >
                              {isCalling ? 'Calling...' : 'Call Cust.'}
                            </button>
                            <button 
                              onClick={() => handleMarkRTO(alert.order_id)}
                              disabled={rtoMarkedOrders.has(alert.order_id)}
                              className={rtoMarkedOrders.has(alert.order_id)
                                ? "px-2 py-1 bg-[#16A34A] text-white rounded text-[10px] font-bold cursor-not-allowed"
                                : "px-2 py-1 bg-[#EF4444] text-white rounded text-[10px] font-bold hover:bg-[#DC2626]"
                              }
                            >
                              {rtoMarkedOrders.has(alert.order_id) ? 'Marked RTO' : 'Mark RTO'}
                            </button>
                            <button
                              onClick={() => handleToggleHistory('RTO', alert.order_id)}
                              className="p-1 text-[#991B1B] hover:text-[#7F1D1D] transition-colors flex items-center gap-1"
                              title="Toggle History"
                            >
                              <History size={14} />
                              {expandedHistory.has(`RTO-${alert.order_id}`) ? (
                                <ChevronUp size={12} />
                              ) : (
                                <ChevronDown size={12} />
                              )}
                            </button>
                          </div>
                       </div>
                     </div>
                     
                     {/* Inline History Section */}
                     {expandedHistory.has(`RTO-${alert.order_id}`) && (
                       <div className="mt-3 pt-3 border-t border-[#FECACA]">
                         {loadingHistory.has(`RTO-${alert.order_id}`) ? (
                           <div className="text-center py-2 text-xs text-[#9E9E9E]">Loading history...</div>
                         ) : (() => {
                           const historyKey = `RTO-${alert.order_id}`;
                           const history = historyData.get(historyKey) || [];
                           return history.length === 0 ? (
                             <div className="text-center py-2 text-xs text-[#9E9E9E]">No history found</div>
                           ) : (
                             <div className="space-y-2">
                               {history.map((entry: any, idx: number) => (
                                 <div key={idx} className="text-xs bg-white/50 rounded p-2 border border-[#FECACA]/50">
                                   {entry.action === 'CALL_CUSTOMER' && entry.metadata && (
                                     <>
                                       <div className="font-semibold text-[#991B1B]">
                                         Called {entry.metadata.called_number || 'N/A'}
                                       </div>
                                       <div className="text-[#757575] mt-0.5">
                                         Status: <span className={`font-semibold ${
                                           entry.metadata.call_status === 'initiated' ? 'text-[#3B82F6]' : 
                                           entry.metadata.call_status === 'success' ? 'text-[#16A34A]' : 
                                           'text-[#EF4444]'
                                         }`}>{entry.metadata.call_status || 'initiated'}</span>
                                       </div>
                                       <div className="text-[#9E9E9E] mt-0.5 text-[10px]">
                                         {new Date(entry.performed_at).toLocaleString()}
                                       </div>
                                     </>
                                   )}
                                   {entry.action === 'MARK_RTO' && entry.metadata && (
                                     <>
                                       <div className="font-semibold text-[#EF4444]">
                                         Marked as RTO
                                       </div>
                                       <div className="text-[#757575] mt-0.5">
                                         Status: {entry.metadata.previous_status || 'N/A'} → <span className="text-[#EF4444] font-semibold">{entry.metadata.new_status || 'RTO'}</span>
                                       </div>
                                       {entry.metadata.reason && (
                                         <div className="text-[#757575] mt-0.5">
                                           Reason: {entry.metadata.reason}
                                         </div>
                                       )}
                                       <div className="text-[#9E9E9E] mt-0.5 text-[10px]">
                                         {new Date(entry.performed_at).toLocaleString()}
                                       </div>
                                     </>
                                   )}
                                 </div>
                               ))}
                             </div>
                           );
                         })()}
                       </div>
                     )}
                   </div>
                 )})
               )}
             </div>
           </div>
        </div>

        {/* Right Column: Live Order Board */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-[#E0E0E0] flex flex-col h-full">
           <div className="p-4 border-b border-[#E0E0E0]">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-bold text-[#212121]">Live Order Board</h2>
                 <button 
                   onClick={() => handleNavigate('liveorders')}
                   className="text-sm font-medium text-[#1677FF] hover:underline flex items-center gap-1"
                 >
                   View All <ArrowRight size={14} />
                 </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                 {orderTabs.map(tab => (
                   <button
                     key={tab.id}
                     onClick={() => setOrderTab(tab.id)}
                     className={cn(
                       "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 border",
                       orderTab === tab.id 
                         ? `${tab.bg} ${tab.color} border-current` 
                         : "bg-white text-[#757575] border-[#E0E0E0] hover:bg-[#F5F5F5]"
                     )}
                   >
                     {tab.label}
                     <span className={cn(
                       "px-1.5 py-0.5 rounded-full text-[10px]",
                       orderTab === tab.id ? "bg-white/50" : "bg-[#F5F5F5] text-[#9E9E9E]"
                     )}>{tab.count}</span>
                   </button>
                 ))}
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-0">
             <table className="w-full text-left text-sm">
               <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0] sticky top-0">
                 <tr>
                   <th className="px-6 py-3 font-medium">Order ID</th>
                   <th className="px-6 py-3 font-medium">Items</th>
                   <th className="px-6 py-3 font-medium">SLA Timer</th>
                   <th className="px-6 py-3 font-medium">Assignee</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-[#F0F0F0]">
                 {isLoading ? (
                   <tr>
                     <td colSpan={4} className="px-6 py-8 text-center text-[#9E9E9E]">Loading orders...</td>
                   </tr>
                 ) : liveOrders.length === 0 ? (
                   <tr>
                     <td colSpan={4} className="px-6 py-8 text-center text-[#9E9E9E]">No orders found</td>
                   </tr>
                 ) : (
                   liveOrders.map((order: any) => {
                     const slaColor = order.sla_status === 'critical' ? 'text-[#EF4444]' : order.sla_status === 'warning' ? 'text-[#FACC15]' : 'text-[#212121]';
                     const initials = order.assignee?.initials || 'UA';
                     const assigneeName = order.assignee?.name || 'Unassigned';
                     
                     return (
                       <tr key={order.order_id} className="hover:bg-[#FAFAFA] group cursor-pointer" onClick={() => { setPendingOrderSearch(order.order_id); handleNavigate('liveorders'); }}>
                         <td className="px-6 py-4">
                           <div className="flex flex-col">
                             <span className="font-bold text-[#212121]">{order.order_id}</span>
                             <span className="text-[10px] text-[#9E9E9E] uppercase tracking-wider">{order.order_type}</span>
                           </div>
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-2 text-[#616161]">
                             <Package size={16} />
                             <span>{order.item_count} items</span>
                           </div>
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                             <Clock size={16} className={slaColor} />
                             <span className={cn("font-mono font-bold", slaColor)}>
                               {order.sla_timer}
                             </span>
                           </div>
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-[#E0E7FF] text-[#4F46E5] flex items-center justify-center text-[10px] font-bold">
                               {initials}
                             </div>
                             <span className="text-[#616161]">{assigneeName}</span>
                           </div>
                         </td>
                       </tr>
                     );
                   })
                 )}
               </tbody>
             </table>
             
             {/* Empty State for Returns/Cancelled if needed */}
             {/* <div className="flex flex-col items-center justify-center h-48 text-[#9E9E9E]">
               <CheckCircle2 size={32} className="mb-2 opacity-20" />
               <p>No active orders in this queue</p>
             </div> */}
           </div>
        </div>
      </div>

    </div>
  );
}