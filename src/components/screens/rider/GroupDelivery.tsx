import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, Marker, useJsApiLoader, InfoWindow, Polyline } from '@react-google-maps/api';
import { PageHeader } from '../../ui/page-header';
import { RefreshCw, MapPin, Package, Layers, Info, AlertCircle, Users, Save, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from './overview/riderApi';
import { Order, Rider } from './overview/types';
import { toast } from 'sonner';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: 13.0827, lng: 80.2707 }; // Chennai

interface Cluster {
  id: string;
  clusterId?: string; // Backend ID
  orders: Order[];
  center: { lat: number; lng: number };
  color: string;
  status?: 'active' | 'assigned' | 'completed' | 'cancelled';
  isSaved?: boolean;
}

const CLUSTER_COLORS = [
  '#F97316', // Orange
  '#3B82F6', // Blue
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];

// Fallback coordinate generation based on address hash (consistent but unique per address)
const generateFallbackCoords = (address: string) => {
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // Using Chennai as base for fallback
  const lat = 13.0827 + ((hash % 100) - 50) / 1000;
  const lng = 80.2707 + ((hash % 200) - 100) / 1000;
  return { lat, lng };
};

export function GroupDelivery({ searchQuery = '' }: { searchQuery?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [unclusteredOrders, setUnclusteredOrders] = useState<Order[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [distanceThreshold, setDistanceThreshold] = useState(2); // 2km
  const [geocodingProgress, setGeocodingProgress] = useState(0);
  const [useFallback, setUseFallback] = useState(false);
  const [showRiderSelector, setShowRiderSelector] = useState(false);
  const [saving, setSaving] = useState(false);

  const geocodeCache = useRef<Record<string, { lat: number; lng: number }>>({});

  const hasMapsKey = Boolean(GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.trim().length > 0);
  const { isLoaded } = useJsApiLoader({
    id: 'group-delivery-map',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
  });

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | undefined> => {
    if (geocodeCache.current[address]) return geocodeCache.current[address];
    if (!GOOGLE_MAPS_API_KEY) return undefined;
    
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results[0]) {
        const coords = data.results[0].geometry.location;
        geocodeCache.current[address] = coords;
        return coords;
      }
      return undefined;
    } catch (error) {
      console.error('Geocoding error:', error);
      return undefined;
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const performClustering = useCallback((allOrders: Order[]) => {
    // Filter orders with valid coordinates and status is a "live" deliverable status
    const liveStatuses = [
      'pending', 'assigned', 'delayed', 'picked_up', 'in_transit',
      'new', 'processing', 'ready', 'picking', 'picked', 'packed', 'ready_for_dispatch',
      'assigned', 'picked'
    ];
    
    const validOrders = allOrders.filter(
      (o) => o.coordinates && o.status && liveStatuses.includes(String(o.status).toLowerCase())
    );

    if (validOrders.length === 0) {
      setClusters([]);
      setUnclusteredOrders(allOrders);
      return;
    }

    let unassigned = [...validOrders];
    // Sort by coordinates to ensure grouping is deterministic
    unassigned.sort((a, b) => (a.coordinates!.lat - b.coordinates!.lat) || (a.coordinates!.lng - b.coordinates!.lng));

    const newClusters: Cluster[] = [];
    let clusterIdCounter = 1;

    while (unassigned.length > 0) {
      const seed = unassigned.shift()!;
      const clusterOrders = [seed];
      
      // Find neighbors within threshold, up to max 10 orders
      // For orders at the EXACT same location, they will always be neighbors (dist = 0)
      for (let i = 0; i < unassigned.length && clusterOrders.length < 10; i++) {
        const other = unassigned[i];
        const dist = calculateDistance(
          seed.coordinates!.lat,
          seed.coordinates!.lng,
          other.coordinates!.lat,
          other.coordinates!.lng
        );
        
        if (dist <= distanceThreshold) {
          clusterOrders.push(other);
          unassigned.splice(i, 1);
          i--;
        }
      }

      // Requirement: 2 to 10 orders per cluster
      if (clusterOrders.length >= 2) {
        const avgLat = clusterOrders.reduce((sum, o) => sum + o.coordinates!.lat, 0) / clusterOrders.length;
        const avgLng = clusterOrders.reduce((sum, o) => sum + o.coordinates!.lng, 0) / clusterOrders.length;
        
        newClusters.push({
          id: `draft-${clusterIdCounter++}`,
          orders: clusterOrders,
          center: { lat: avgLat, lng: avgLng },
          color: CLUSTER_COLORS[(newClusters.length) % CLUSTER_COLORS.length],
          isSaved: false,
        });
      }
    }

    setClusters(newClusters);
    
    const clusteredOrderIds = new Set(newClusters.flatMap(c => c.orders.map(o => o.id)));
    setUnclusteredOrders(allOrders.filter(o => !clusteredOrderIds.has(o.id)));
  }, [distanceThreshold]);

  const fetchData = async () => {
    setLoading(true);
    setGeocodingProgress(0);
    setUseFallback(false);
    try {
      const [ordersData, ridersData, savedClustersData] = await Promise.all([
        api.getOrders(),
        api.getRiders(),
        api.getClusters({ status: 'active' }),
      ]);
      
      const liveOrders = ordersData.filter(o => {
        const status = o.status?.toLowerCase();
        return status !== 'delivered' && status !== 'cancelled' && status !== 'returned' && status !== 'rto';
      });
      
      // Geocode missing addresses
      const processedOrders: Order[] = [];
      let failCount = 0;

      for (let i = 0; i < liveOrders.length; i++) {
        const order = liveOrders[i];
        setGeocodingProgress(Math.round(((i + 1) / liveOrders.length) * 100));
        
        if (order.coordinates) {
          processedOrders.push(order);
          continue;
        }

        const address = order.dropLocation || order.pickupLocation;
        if (!address) {
          processedOrders.push(order);
          continue;
        }

        let coords = await geocodeAddress(address);
        if (!coords) {
          coords = generateFallbackCoords(address);
          failCount++;
        }
        
        processedOrders.push({ ...order, coordinates: coords });
      }

      if (failCount > 0) {
        setUseFallback(true);
      }
      
      setOrders(processedOrders);
      setRiders(ridersData);

      // If we have saved clusters, use them first
      if (savedClustersData && savedClustersData.length > 0) {
        const mappedClusters: Cluster[] = savedClustersData.map((c: any) => ({
          id: c.clusterId,
          clusterId: c.clusterId,
          orders: c.orders,
          center: c.center,
          color: c.color,
          status: c.status,
          isSaved: true,
        }));
        
        setClusters(mappedClusters);
        
        const clusteredOrderIds = new Set(mappedClusters.flatMap(c => c.orders.map(o => o.id)));
        setUnclusteredOrders(processedOrders.filter(o => !clusteredOrderIds.has(o.id)));
      } else {
        performClustering(processedOrders);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const saveAllClusters = async () => {
    const unsavedClusters = clusters.filter(c => !c.isSaved);
    if (unsavedClusters.length === 0) {
      toast.info('No new clusters to save');
      return;
    }

    setSaving(true);
    try {
      await api.saveClusters(unsavedClusters);
      toast.success(`Successfully saved ${unsavedClusters.length} clusters to backend`);
      await fetchData(); // Reload to get IDs and synced state
    } catch (error) {
      console.error('Failed to save clusters:', error);
      toast.error('Failed to save clusters to backend');
    } finally {
      setSaving(false);
    }
  };

  const deleteCluster = async (cluster: Cluster) => {
    if (!cluster.isSaved || !cluster.clusterId) {
      // Just remove from local state if not saved
      setClusters(clusters.filter(c => c.id !== cluster.id));
      toast.success('Removed draft cluster');
      return;
    }

    try {
      await api.deleteCluster(cluster.clusterId);
      toast.success('Deleted cluster from backend');
      await fetchData();
    } catch (error) {
      console.error('Failed to delete cluster:', error);
      toast.error('Failed to delete cluster');
    }
  };

  const assignClusterToRider = async (cluster: Cluster, riderId: string) => {
    if (!cluster.isSaved || !cluster.clusterId) {
      toast.error('Please save the cluster before assigning');
      return;
    }

    setSaving(true);
    try {
      await api.assignCluster(cluster.clusterId, riderId);
      toast.success(`Assigned group to rider`);
      setShowRiderSelector(false);
      setSelectedCluster(null);
      await fetchData();
    } catch (error) {
      console.error('Failed to assign cluster:', error);
      toast.error('Failed to assign group');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (orders.length > 0 && clusters.length === 0) {
      performClustering(orders);
    }
  }, [distanceThreshold, performClustering]);

  if (!hasMapsKey) {
    // Don’t block the entire screen behind an infinite map loader spinner.
    // The list/cluster management features are still useful without a map.
    return (
      <div className="space-y-6 flex flex-col h-[calc(100vh-120px)]">
        <PageHeader
          title="Group Delivery"
          subtitle="Intelligent order clustering for efficient multi-delivery"
          actions={
            <div className="flex items-center gap-3">
              <button
                onClick={saveAllClusters}
                disabled={loading || saving || !clusters.some(c => !c.isSaved)}
                className="px-4 py-2 bg-[#F97316] text-white font-medium rounded-lg hover:bg-[#EA580C] disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={16} />
                Save All Groups
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          }
        />

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3 text-amber-800 text-sm">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <span>
            Google Maps is disabled because <span className="font-bold">`VITE_GOOGLE_MAPS_API_KEY`</span> is not set.
            You can still create/save/assign groups from the list.
          </span>
        </div>

        {/* Fallback: list-only mode */}
        <div className="flex-1 flex gap-6 overflow-hidden">
          <div className="w-1/3 flex flex-col gap-4 overflow-hidden">
            <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 shadow-sm flex flex-col overflow-hidden h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#212121] flex items-center gap-2">
                  <Layers size={18} className="text-[#F97316]" />
                  Groups ({clusters.length})
                </h3>
                <select
                  className="text-xs border border-[#E0E0E0] rounded p-1"
                  value={distanceThreshold}
                  onChange={(e) => setDistanceThreshold(Number(e.target.value))}
                >
                  <option value={0.1}>0.1 km</option>
                  <option value={0.5}>0.5 km</option>
                  <option value={1}>1 km</option>
                  <option value={2}>2 km</option>
                  <option value={5}>5 km</option>
                </select>
              </div>

              <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                {clusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    onClick={() => {
                      setSelectedCluster(cluster);
                      setSelectedOrder(null);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedCluster?.id === cluster.id
                        ? 'border-[#F97316] bg-[#FFF7ED]'
                        : 'border-[#E0E0E0] hover:border-[#F97316]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cluster.color }} />
                        <span className="font-bold text-sm">
                          Group {cluster.id.startsWith('draft') ? '(Draft)' : `#${cluster.id.slice(-4).toUpperCase()}`}
                        </span>
                        {cluster.isSaved && <CheckCircle2 size={14} className="text-green-500" />}
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                        {cluster.orders.length} orders
                      </span>
                    </div>
                    <div className="text-xs text-[#757575] space-y-1">
                      <div className="flex items-center gap-1">
                        <Package size={12} className="shrink-0" />
                        <span className="truncate">{cluster.orders.map(o => String(o.id).replace('ORD-', '')).join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate text-[10px]">
                          {typeof (cluster.orders[0] as any)?.dropLocation === 'string'
                            ? (cluster.orders[0] as any).dropLocation
                            : String((cluster.orders[0] as any)?.dropLocation?.address ?? '')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 bg-white border border-[#E0E0E0] rounded-xl p-6 shadow-sm overflow-auto">
            <div className="text-sm text-gray-600">
              Map view is unavailable without a Google Maps API key.
            </div>
            {selectedCluster && (
              <div className="mt-4">
                <div className="font-bold text-[#212121] mb-2">
                  Selected group: {selectedCluster.id.startsWith('draft') ? 'Draft' : `#${selectedCluster.id.slice(-4).toUpperCase()}`}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedCluster.orders.map((order) => (
                    <div key={order.id} className="p-3 border border-gray-100 rounded bg-gray-50">
                      <div className="font-bold text-xs">{order.id}</div>
                      <div className="text-[11px] text-gray-600 truncate">{order.customerName}</div>
                      <div className="text-[10px] text-gray-400 truncate">{order.dropLocation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <RefreshCw className="animate-spin text-[#F97316]" size={48} />
      </div>
    );
  }

  const mapCenter = selectedCluster?.center || (clusters.length > 0 ? clusters[0].center : defaultCenter);

  const getJitteredCoords = (lat: number, lng: number, index: number, total: number) => {
    if (total <= 1) return { lat, lng };
    const angle = (index / total) * 2 * Math.PI;
    const radius = 0.0001;
    return {
      lat: lat + radius * Math.cos(angle),
      lng: lng + radius * Math.sin(angle),
    };
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-120px)]">
      <PageHeader
        title="Group Delivery"
        subtitle="Intelligent order clustering for efficient multi-delivery"
        actions={
          <div className="flex items-center gap-3">
            {loading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                <RefreshCw size={12} className="animate-spin" />
                <span>Geocoding: {geocodingProgress}%</span>
              </div>
            )}
            <button
              onClick={saveAllClusters}
              disabled={loading || saving || !clusters.some(c => !c.isSaved)}
              className="px-4 py-2 bg-[#F97316] text-white font-medium rounded-lg hover:bg-[#EA580C] disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} />
              Save All Groups
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        }
      />

      {useFallback && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3 text-amber-800 text-sm">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <span>Notice: Some orders are shown with approximate locations because geocoding failed or rate limits were reached.</span>
        </div>
      )}

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left: Cluster List */}
        <div className="w-1/3 flex flex-col gap-4 overflow-hidden">
          <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 shadow-sm flex flex-col overflow-hidden h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#212121] flex items-center gap-2">
                <Layers size={18} className="text-[#F97316]" />
                Groups ({clusters.length})
              </h3>
              <div className="flex items-center gap-2">
                <select 
                  className="text-xs border border-[#E0E0E0] rounded p-1"
                  value={distanceThreshold}
                  onChange={(e) => setDistanceThreshold(Number(e.target.value))}
                >
                  <option value={0.1}>0.1 km</option>
                  <option value={0.5}>0.5 km</option>
                  <option value={1}>1 km</option>
                  <option value={2}>2 km</option>
                  <option value={5}>5 km</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 overflow-y-auto pr-2 flex-1">
              {clusters.map((cluster) => (
                <div
                  key={cluster.id}
                  onClick={() => {
                    setSelectedCluster(cluster);
                    setSelectedOrder(null);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedCluster?.id === cluster.id
                      ? 'border-[#F97316] bg-[#FFF7ED]'
                      : 'border-[#E0E0E0] hover:border-[#F97316]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: cluster.color }}
                      />
                      <span className="font-bold text-sm">
                        Group {cluster.id.startsWith('draft') ? '(Draft)' : `#${cluster.id.slice(-4).toUpperCase()}`}
                      </span>
                      {cluster.isSaved && (
                        <CheckCircle2 size={14} className="text-green-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                        {cluster.orders.length} orders
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCluster(cluster);
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-[#757575] space-y-1">
                    <div className="flex items-center gap-1">
                      <Package size={12} className="shrink-0" />
                      <span className="truncate">{cluster.orders.map(o => o.id.replace('ORD-', '')).join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate text-[10px]">{cluster.orders[0].dropLocation}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {unclusteredOrders.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Info size={12} />
                    Unclustered Orders ({unclusteredOrders.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {unclusteredOrders.slice(0, 20).map(order => (
                      <div key={order.id} className="p-2 border border-gray-50 rounded bg-gray-50 text-[10px] text-gray-500 truncate">
                        {order.id}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Map & Detail Overlay */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm relative">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={mapCenter}
              zoom={14}
              options={{
                disableDefaultUI: false,
                styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
              }}
            >
              {clusters.map((cluster) => (
                <React.Fragment key={cluster.id}>
                  {cluster.orders.filter(o => !!o.coordinates).map((order, idx, arr) => {
                    const jittered = getJitteredCoords(
                      order.coordinates!.lat,
                      order.coordinates!.lng,
                      idx,
                      arr.length
                    );
                    return (
                      <Marker
                        key={order.id}
                        position={jittered}
                        icon={
                          (globalThis as any)?.google?.maps?.SymbolPath?.CIRCLE
                            ? {
                                path: (globalThis as any).google.maps.SymbolPath.CIRCLE,
                                scale: selectedCluster?.id === cluster.id ? 9 : 6,
                                fillColor: cluster.color,
                                fillOpacity: 1,
                                strokeColor: '#FFFFFF',
                                strokeWeight: 2,
                              }
                            : undefined
                        }
                        onClick={() => {
                          setSelectedOrder(order);
                          setSelectedCluster(cluster);
                        }}
                      />
                    );
                  })}
                  {selectedCluster?.id === cluster.id && (
                    <Polyline
                      path={cluster.orders.filter(o => !!o.coordinates).map(o => ({ lat: o.coordinates!.lat, lng: o.coordinates!.lng }))}
                      options={{
                        strokeColor: cluster.color,
                        strokeOpacity: 0.5,
                        strokeWeight: 2,
                        geodesic: true,
                      }}
                    />
                  )}
                </React.Fragment>
              ))}

              {selectedOrder && (
                <InfoWindow
                  position={selectedOrder.coordinates!}
                  onCloseClick={() => setSelectedOrder(null)}
                >
                  <div className="p-2 min-w-[180px]">
                    <div className="font-bold text-sm mb-1">{selectedOrder.id}</div>
                    <div className="text-xs text-gray-600 mb-2">{selectedOrder.customerName}</div>
                    <div className="text-[10px] text-gray-500 mb-2 leading-tight">{selectedOrder.dropLocation}</div>
                    <div className="text-[10px] font-bold text-orange-600 uppercase">{selectedOrder.status}</div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </div>

          {selectedCluster && (
            <div className="h-1/2 bg-white border border-[#E0E0E0] rounded-xl p-4 shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedCluster.color }} />
                  Group Details - {selectedCluster.id.startsWith('draft') ? 'Draft' : `#${selectedCluster.id.slice(-4).toUpperCase()}`} ({selectedCluster.orders.length} Orders)
                </h4>
                <button onClick={() => { setSelectedCluster(null); setShowRiderSelector(false); }} className="text-gray-400 hover:text-gray-600">Close</button>
              </div>
              
              {!showRiderSelector ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto pr-2 pb-2 flex-1">
                    {selectedCluster.orders.map((order) => (
                      <div 
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`p-2.5 border rounded transition-all cursor-pointer ${
                          selectedOrder?.id === order.id ? 'border-[#F97316] bg-orange-50' : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-bold text-[11px] mb-1">{order.id}</div>
                        <div className="text-[10px] text-gray-600 font-medium truncate">{order.customerName}</div>
                        <div className="text-[9px] text-gray-400 truncate">{order.dropLocation}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-3">
                    {!selectedCluster.isSaved && (
                      <button 
                        onClick={() => saveAllClusters()}
                        className="px-4 py-2 border border-[#F97316] text-[#F97316] rounded-lg text-xs font-bold hover:bg-orange-50 flex items-center gap-2"
                      >
                        <Save size={14} />
                        Save Group
                      </button>
                    )}
                    <button 
                      onClick={() => setShowRiderSelector(true)}
                      className="px-6 py-2 bg-[#F97316] text-white rounded-lg font-bold text-xs hover:bg-[#EA580C] shadow-sm flex items-center gap-2"
                    >
                      <Users size={14} />
                      Assign Group to Rider
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">Select Available Rider</span>
                    <button onClick={() => setShowRiderSelector(false)} className="text-xs text-[#F97316] font-bold">Back to details</button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {riders.filter(r => r.status !== 'offline').map(rider => (
                      <div 
                        key={rider.id}
                        onClick={() => assignClusterToRider(selectedCluster, rider.id)}
                        className="p-3 border border-gray-100 rounded-lg hover:border-[#F97316] cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-100 text-[#F97316] flex items-center justify-center font-bold text-xs">
                            {rider.avatarInitials}
                          </div>
                          <div>
                            <div className="text-xs font-bold">{rider.name}</div>
                            <div className="text-[10px] text-gray-400">{rider.status} • {rider.capacity.currentLoad}/{rider.capacity.maxLoad} orders</div>
                          </div>
                        </div>
                        <button className="text-[10px] font-bold text-[#F97316]">Select</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
