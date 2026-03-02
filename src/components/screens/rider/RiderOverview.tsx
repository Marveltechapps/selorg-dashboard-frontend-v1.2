import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { api } from './overview/riderApi';
import { DashboardSummary, Order, Rider } from './overview/types';
import { SummaryCards } from './overview/SummaryCards';
import { LiveOrderBoard } from './overview/LiveOrderBoard';
import { OrderDetailsDrawer } from './overview/OrderDetailsDrawer';
import { DispatchDrawer } from './overview/DispatchDrawer';
import { RiderMapModal } from './overview/RiderMapModal';
import { ReassignRiderModal } from '../alerts/modals/ReassignRiderModal';
import { MapPin } from 'lucide-react';

interface RiderOverviewProps {
  searchQuery?: string;
}

let _autoAssignPref = true;

export function RiderOverview({ searchQuery = '' }: RiderOverviewProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(_autoAssignPref);
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const localOrderUpdates = useRef<Record<string, Partial<Order>>>({});
  const lastOrdersRef = useRef<Order[]>([]);
  const persistAutoAssign = (enabled: boolean) => {
    _autoAssignPref = enabled;
    setAutoAssignEnabled(enabled);
  };
  
  // Drawers & Modals state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [orderToReassign, setOrderToReassign] = useState<Order | null>(null);
  const [orderToAssign, setOrderToAssign] = useState<Order | null>(null);

  const applyLocalOrderUpdates = (list: Order[]) =>
    list.map(o => {
      const normalizedId = o.id.replace(/^ord-/i, 'ORD-');
      const update = localOrderUpdates.current[o.id] || localOrderUpdates.current[normalizedId];
      return update ? { ...o, ...update } : o;
    });

  const fetchData = async (showLoading = false) => {
    setRefreshStatus('idle');
    try {
      if (showLoading) setLoading(true);
      const [summaryResult, ordersResult, ridersResult] = await Promise.allSettled([
        api.getSummary(),
        api.getOrders(searchQuery ? { search: searchQuery } : undefined),
        api.getRiders()
      ]);

      const summaryData = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
      const ordersData = ordersResult.status === 'fulfilled' ? ordersResult.value : [];
      const ridersData = ridersResult.status === 'fulfilled' ? ridersResult.value : [];

      setSummary(summaryData ?? null);

      const baseOrders = ordersData.length > 0 ? ordersData : (lastOrdersRef.current.length > 0 ? lastOrdersRef.current : []);

      const merged = baseOrders.map(o => {
        const normalizedId = o.id.replace(/^ord-/i, 'ORD-');
        // Only apply local updates if they don't conflict with server data
        // Server data takes precedence for persistence
        const update = localOrderUpdates.current[o.id] || localOrderUpdates.current[normalizedId];
        if (update && o.riderId && update.riderId && o.riderId !== update.riderId) {
          // Server has different riderId, use server data (more recent)
          delete localOrderUpdates.current[o.id];
          delete localOrderUpdates.current[normalizedId];
          return o;
        }
        return update ? { ...o, ...update } : o;
      });
      
      lastOrdersRef.current = merged;
      setOrders(merged);
      setRiders(ridersData ?? []);

      if (summaryResult.status === 'rejected' || ordersResult.status === 'rejected' || ridersResult.status === 'rejected') {
        setRefreshStatus('error');
        toast.error('Failed to load data. Check connection and try again.');
      } else {
        setRefreshStatus('success');
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
      setSummary(null);
      setOrders([]);
      setRiders([]);
      setRefreshStatus('error');
      toast.error('Failed to load data. Check connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  const searchFetchedRef = React.useRef(false);
  useEffect(() => {
    if (!searchFetchedRef.current) {
      searchFetchedRef.current = true;
      return;
    }
    fetchData(false);
  }, [searchQuery]);

  // Debug logging removed - useEffect was only for development

  // Auto Assign Logic simulation - disabled automatic polling
  // useEffect(() => {
  //   let interval: NodeJS.Timeout;
  //   if (autoAssignEnabled) {
  //      interval = setInterval(async () => {
  //          const count = await api.autoAssign();
  //          if (count > 0) {
  //              toast.success(`Auto-assigned ${count} orders`);
  //              fetchData();
  //          }
  //      }, 5000);
  //   }
  //   return () => clearInterval(interval);
  // }, [autoAssignEnabled]);

  // Handlers
  const handleTrackOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handleAssignOrder = (order: Order) => {
    // For pending orders, open Dispatch Drawer with this order pre-selected
    if (order.status === 'pending') {
      setOrderToAssign(order);
      setIsDispatchOpen(true);
    } else {
      // For assigned orders, open reassign modal
      setOrderToReassign(order);
      setIsReassignModalOpen(true);
    }
  };

  const handleAlertOrder = async (order: Order) => {
    try {
      // Step 1: Call API to send alert
      await api.alertOrder(order.id, "Delayed Order Alert");
      
      // Step 2: Show success message
      toast.success(`Alert sent for Order #${order.id}`);
      
      // Step 3: Refresh data from server
      // Background refresh - don't show loading state
      await fetchData(false);
    } catch (error) {
      console.error("Failed to send alert:", error);
      toast.error(`Failed to send alert: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReassign = async (order: Order) => {
    // Open reassign modal from OrderDetailsDrawer
    setOrderToReassign(order);
    setIsDetailsOpen(false);
    setIsReassignModalOpen(true);
  };

  const handleReassignConfirm = async (riderId: string, riderName: string) => {
    if (!orderToReassign) return;
    const orderId = orderToReassign.id;
    const normalizedId = orderId.replace(/^ord-/i, 'ORD-');
    const orderToUpdate = orderToReassign;
    const wasReassignment = !!orderToUpdate.riderId;
    
    // Close modal immediately
    setIsReassignModalOpen(false);
    setOrderToReassign(null);
    
    try {
      // Call API first - wait for server confirmation before showing success
      const result = await api.assignOrder(orderId, riderId);
      
      // Verify we got a valid response with required fields
      if (!result) {
        throw new Error('No response from server');
      }
      if (!result.orderId) {
        throw new Error('Invalid response: missing orderId');
      }
      if (!result.riderId) {
        throw new Error('Invalid response: missing riderId');
      }
      
      // Only proceed if API call was successful
      const serverOrderId = result.orderId;
      const serverNormalizedId = serverOrderId.replace(/^ord-/i, 'ORD-');
      const serverRiderId = result.riderId;
      const serverStatus = (result.status || 'assigned') as Order['status'];
      
      // Clear any stale local updates first
      delete localOrderUpdates.current[orderId];
      delete localOrderUpdates.current[normalizedId];
      delete localOrderUpdates.current[serverOrderId];
      delete localOrderUpdates.current[serverNormalizedId];
      
      // Update local state with server response - immediately update UI
      const update = { riderId: serverRiderId, status: serverStatus };
      
      // Helper function to check if an order ID matches the target order
      const isTargetOrder = (o: Order) => {
        const oId = o.id;
        const oNormalized = oId.replace(/^ord-/i, 'ORD-');
        return oId === orderId || oId === normalizedId || oId === serverOrderId || oId === serverNormalizedId ||
               oNormalized === orderId || oNormalized === normalizedId || oNormalized === serverOrderId || oNormalized === serverNormalizedId;
      };
      
      setOrders(prev => prev.map(o => 
        isTargetOrder(o) ? { ...o, ...update } : o
      ));
      
      // Update selectedOrder immediately if it's the same order being reassigned (for dynamic update in drawer)
      // This ensures the drawer shows the new rider name immediately
      if (selectedOrder && isTargetOrder(selectedOrder)) {
        setSelectedOrder(prev => prev ? { ...prev, ...update, riderId: serverRiderId } : null);
      }
      
      // Show success message ONLY after API call succeeds
      toast.success(`Order ${serverOrderId} ${wasReassignment ? 'reassigned' : 'assigned'} to ${riderName}`);
      
      // Refresh data from server to get the updated order with correct rider
      // This ensures persistence and shows the correct data after refresh
      try {
        // Fetch fresh data
        const [summaryResult, ordersResult, ridersResult] = await Promise.allSettled([
          api.getSummary(),
          api.getOrders(searchQuery ? { search: searchQuery } : undefined),
          api.getRiders()
        ]);

        const ordersData = ordersResult.status === 'fulfilled' ? ordersResult.value : [];
        const ridersData = ridersResult.status === 'fulfilled' ? ridersResult.value : [];

        // Use the current orders state (which has the optimistic update) instead of lastOrdersRef
        // This ensures we have the most up-to-date state
        setOrders(currentState => {
          const currentOrders = currentState.length > 0 ? currentState : [];
          
          // Merge API data with current state, ensuring the just-assigned order is preserved
          const baseOrders = ordersData.length > 0 ? ordersData : [];
          
          // Start with API orders as the source of truth, then merge in current orders for any missing ones
          const merged: Order[] = [];
          const processedIds = new Set<string>();
          
          // Helper to normalize and create a unique key
          const getOrderKey = (o: Order) => {
            const normalized = o.id.replace(/^ord-/i, 'ORD-');
            return `${o.id.toLowerCase()}|${normalized.toLowerCase()}`;
          };

          // First, add all API orders (source of truth from server)
          baseOrders.forEach(apiOrder => {
            const key = getOrderKey(apiOrder);
            if (!processedIds.has(key)) {
              // If this is the just-assigned order, ensure it has the server rider ID
              if (isTargetOrder(apiOrder)) {
                // Force the server rider ID even if API returns different/null riderId
                // Use the server rider ID from the assignment response, not from API
                const finalRiderId = serverRiderId || apiOrder.riderId;
                merged.push({ 
                  ...apiOrder, 
                  riderId: finalRiderId, 
                  status: serverStatus 
                });
                console.log('[Reassign] Updated order from API:', apiOrder.id, 'API riderId:', apiOrder.riderId, 'Server riderId:', serverRiderId, 'Final:', finalRiderId);
              } else {
                // Regular order, use API data as-is
                const apiNormalized = apiOrder.id.replace(/^ord-/i, 'ORD-');
                const localUpdate = localOrderUpdates.current[apiOrder.id] || localOrderUpdates.current[apiNormalized];
                if (localUpdate && apiOrder.riderId && localUpdate.riderId && apiOrder.riderId !== localUpdate.riderId) {
                  // Server data conflicts with local update, use server data
                  delete localOrderUpdates.current[apiOrder.id];
                  delete localOrderUpdates.current[apiNormalized];
                }
                merged.push(localUpdate ? { ...apiOrder, ...localUpdate } : apiOrder);
              }
              processedIds.add(key);
            }
          });

          // Then, add any current orders that aren't in API results (to preserve the list)
          currentOrders.forEach(currentOrder => {
            const key = getOrderKey(currentOrder);
            if (!processedIds.has(key)) {
              // Check if this order exists in merged list by ID matching (exact match only)
              const exists = merged.some(m => {
                const mKey = getOrderKey(m);
                return mKey === key;
              });
              
              if (!exists) {
                // Order not in API results, preserve it from current state
                if (isTargetOrder(currentOrder)) {
                  // This is the just-assigned order, ensure it has the server rider ID
                  merged.push({ ...currentOrder, riderId: serverRiderId, status: serverStatus });
                  console.log('[Reassign] Preserved order from current state:', currentOrder.id, 'with rider:', serverRiderId);
                } else {
                  // Regular order, preserve as-is (don't apply the update to other orders!)
                  const currentNormalized = currentOrder.id.replace(/^ord-/i, 'ORD-');
                  const localUpdate = localOrderUpdates.current[currentOrder.id] || localOrderUpdates.current[currentNormalized];
                  merged.push(localUpdate ? { ...currentOrder, ...localUpdate } : currentOrder);
                }
                processedIds.add(key);
              }
            }
          });
          
          // Update lastOrdersRef with the merged result
          lastOrdersRef.current = merged;
          
          setRiders(ridersData ?? []);
          
          // Immediately update selectedOrder with fresh data if drawer is still open
          if (isDetailsOpen) {
            const refreshedOrder = merged.find(o => isTargetOrder(o));
            if (refreshedOrder) {
              // Update selectedOrder with the fresh order data
              setSelectedOrder(refreshedOrder);
            }
          }
          
          return merged;
        });
      } catch (fetchErr) {
        // If fetch fails, log but don't show error to user (assignment was successful)
        console.error('Failed to refresh data after assignment:', fetchErr);
        // Even if fetch fails, ensure selectedOrder is updated with the optimistic update
        if (isDetailsOpen && selectedOrder && (selectedOrder.id === orderId || selectedOrder.id === normalizedId || selectedOrder.id === serverOrderId || selectedOrder.id === serverNormalizedId)) {
          setSelectedOrder(prev => prev ? { ...prev, ...update, riderId: serverRiderId } : null);
        }
      }
    } catch (err) {
      // Extract error message properly - avoid [object Object]
      let errorMessage = 'Operation failed';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object') {
        // Try to extract message from various possible locations
        const possiblePaths = [
          (err as any)?.message,
          (err as any)?.error,
          (err as any)?.error?.message,
          (err as any)?.response?.data?.message,
          (err as any)?.response?.data?.error,
          (err as any)?.response?.data?.error?.message,
        ];
        
        for (const path of possiblePaths) {
          if (path && typeof path === 'string' && path !== '[object Object]' && path !== '{}') {
            errorMessage = path;
            break;
          }
        }
        
        // If still not found, try to extract from nested objects
        if (errorMessage === 'Operation failed' || errorMessage === '[object Object]') {
          // Try to find message in nested structure
          const findMessage = (obj: any): string | null => {
            if (typeof obj === 'string' && obj !== '[object Object]' && obj !== '{}') {
              return obj;
            }
            if (obj && typeof obj === 'object') {
              if (obj.message && typeof obj.message === 'string') return obj.message;
              if (obj.error && typeof obj.error === 'string') return obj.error;
              if (obj.msg && typeof obj.msg === 'string') return obj.msg;
              // Try nested
              for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                  const nested = findMessage(obj[key]);
                  if (nested) return nested;
                }
              }
            }
            return null;
          };
          
          const foundMsg = findMessage(err);
          if (foundMsg) {
            errorMessage = foundMsg;
          }
        }
      }
      
      // Ensure we have a valid error message - never show [object Object]
      if (!errorMessage || errorMessage === '[object Object]' || errorMessage === '{}') {
        errorMessage = `Failed to ${wasReassignment ? 'reassign' : 'assign'} order`;
      }
      
      // Prefix with "Failed to reassign:" for clarity
      if (!errorMessage.toLowerCase().includes('failed') && !errorMessage.toLowerCase().includes('error')) {
        errorMessage = `Failed to ${wasReassignment ? 'reassign' : 'assign'}: ${errorMessage}`;
      }
      
      toast.error(errorMessage);
      
      // Refresh to get correct state from server
      try {
        await fetchData(false);
      } catch (fetchErr) {
        // Ignore fetch errors in error handler
        console.error('Failed to refresh after error:', fetchErr);
      }
    }
  };

  const handleDispatchAssign = async (orderId: string, riderId: string) => {
    const patch = { riderId, status: 'assigned' as Order['status'], etaMinutes: 12 };
    try {
      await api.assignOrder(orderId, riderId);
      localOrderUpdates.current[orderId] = { ...localOrderUpdates.current[orderId], ...patch };
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...patch } : o));
      toast.success(`Order ${orderId} assigned successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assign failed');
    } finally {
      await fetchData(false);
    }
  };

  const handleAlertFromDrawer = async (orderId: string, reason: string) => {
      try {
          // Step 1: Call API to send alert
          await api.alertOrder(orderId, reason);
          
          // Step 2: Show success message
          toast.success(`Alert sent for Order #${orderId}`);
          
          // Step 3: Refresh data from server
          // Background refresh - don't show loading state
          await fetchData(false);
      } catch (error) {
          console.error("Failed to send alert:", error);
          toast.error(`Failed to send alert: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw error; // Re-throw so drawer can handle it
      }
  };

  const unassignedOrders = orders.filter(o => o.status === 'pending');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rider Operations"
        subtitle="Fleet management and delivery oversight"
        actions={
          <button
            onClick={() => fetchData(false)}
            className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {refreshStatus === 'success' ? 'Refreshed' : refreshStatus === 'error' ? 'Refresh failed' : 'Refresh'}
          </button>
        }
      />

      {/* Summary Cards */}
      <SummaryCards data={summary} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Order Board */}
          <div className="lg:col-span-2 h-full">
            <LiveOrderBoard
                orders={orders}
                riders={riders}
                loading={loading}
                onTrackOrder={handleTrackOrder}
                onAlertOrder={handleAlertOrder}
                onAssignOrder={handleAssignOrder}
                autoAssignEnabled={autoAssignEnabled}
                onToggleAutoAssign={persistAutoAssign}
                refreshData={fetchData}
                initialSearchQuery={searchQuery}
            />
          </div>

          {/* Rider Distribution / Map Teaser */}
          <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm flex flex-col h-[400px] lg:h-auto">
              <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
                  <h3 className="font-bold text-[#212121]">Rider Distribution</h3>
                  <button onClick={() => setIsMapOpen(true)} className="text-xs text-[#F97316] hover:underline font-medium">Expand</button>
              </div>
              <div className="flex-1 bg-gray-100 flex items-center justify-center relative min-h-[300px] group cursor-pointer" onClick={() => setIsMapOpen(true)}>
                  {/* Mini Map Placeholder */}
                   <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center"></div>
                  
                  <div className="z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center backdrop-blur-sm mb-3 shadow-lg group-hover:scale-110 transition-transform">
                        <MapPin size={32} className="text-[#F97316]" />
                    </div>
                    <span className="text-gray-500 text-sm font-medium bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm">Click to view live map</span>
                  </div>

                  {/* Rider Status Stats - derive from summary or riders when available */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg border border-[#E0E0E0] shadow-sm">
                      <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-2">
                          <span className="text-xs text-[#757575] font-medium">Idle Riders</span>
                          <span className="font-bold text-[#212121]">{summary?.idleRiders ?? riders.filter(r => r.status === 'idle').length ?? 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-xs text-[#757575] font-medium">Busy Riders</span>
                          <span className="font-bold text-[#F97316]">{summary?.busyRiders ?? riders.filter(r => r.status === 'busy').length ?? 0}</span>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Drawers & Modals */}
      <OrderDetailsDrawer 
        order={selectedOrder}
        rider={selectedOrder?.riderId ? (() => {
          // Try exact match first
          let rider = riders.find(r => r.id === selectedOrder.riderId);
          if (rider) return rider;
          
          // Try normalized matching for different ID formats
          const normalizeId = (id: string) => {
            const match = id.match(/^(?:r|rider-?)(\d+)$/i);
            if (match) {
              const num = parseInt(match[1], 10);
              return `RIDER-${String(num).padStart(4, '0')}`;
            }
            const riderMatch = id.match(/^RIDER-(\d+)$/i);
            if (riderMatch) {
              const num = parseInt(riderMatch[1], 10);
              return `RIDER-${String(num).padStart(4, '0')}`;
            }
            return id;
          };
          
          const normalizedId = normalizeId(selectedOrder.riderId);
          rider = riders.find(r => {
            const rNormalized = normalizeId(r.id);
            return rNormalized === normalizedId || r.id === normalizedId || r.id === selectedOrder.riderId;
          });
          
          return rider || undefined;
        })() : undefined}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedOrder(null);
        }}
        onReassign={handleReassign}
        onAlert={handleAlertFromDrawer}
      />

      <DispatchDrawer 
        isOpen={isDispatchOpen}
        onClose={() => {
          setIsDispatchOpen(false);
          setOrderToAssign(null);
        }}
        unassignedOrders={unassignedOrders}
        riders={riders}
        onAssign={handleDispatchAssign}
        preselectedOrder={orderToAssign}
      />

      <ReassignRiderModal
        isOpen={isReassignModalOpen}
        onClose={() => {
          setIsReassignModalOpen(false);
          setOrderToReassign(null);
        }}
        onConfirm={handleReassignConfirm}
        riders={riders.map(r => ({ 
          id: r.id, 
          name: r.name, 
          status: r.status, 
          load: r.capacity?.currentLoad ?? 0 
        }))}
      />

      <RiderMapModal 
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        riders={riders}
      />
    </div>
  );
}