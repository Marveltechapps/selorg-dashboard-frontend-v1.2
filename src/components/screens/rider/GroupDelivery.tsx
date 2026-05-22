import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GoogleMap, Marker, useJsApiLoader, InfoWindow, Polyline } from '@react-google-maps/api';
import { PageHeader } from '../../ui/page-header';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  AlertCircle,
  Users,
  Save,
  Map as MapIcon,
  Plus,
  Minus,
} from 'lucide-react';
import { api } from './overview/riderApi';
import { Rider } from './overview/types';
import { toast } from 'sonner';
import { GOOGLE_MAPS_LOADER_ID } from '../../../utils/googleMapsLoader';
import { AssignGroupRiderModal } from './AssignGroupRiderModal';
import {
  saveClustersToBackend,
  assignClusterToRider,
  listClustersFromBackend,
  fetchGroupedOrders,
  fetchGroupDeliveryFilterOptions,
  updateClusterOrdersOnBackend,
} from './groupDeliveryApi';
import type { Cluster, GroupDeliveryFilterOptions, GroupDeliveryOrder } from './groupDeliveryTypes';
import { GROUP_CLUSTER_COLORS } from './groupDeliveryTypes';
import { defaultMapCenter, moveOrdersToCluster } from './groupDeliveryUtils';
import { GroupDeliveryClusterColumn } from './GroupDeliveryClusterColumn';
import { GroupDeliveryOrdersColumn } from './GroupDeliveryOrdersColumn';
import { GroupDeliveryMetricsPanel } from './GroupDeliveryMetricsPanel';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
};

const defaultCenter = defaultMapCenter;

// Fallback coordinate generation based on address hash (consistent but unique per address)
const generateFallbackCoords = (address: string) => {
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // Using Chennai as base for fallback
  const lat = 13.0827 + ((hash % 100) - 50) / 1000;
  const lng = 80.2707 + ((hash % 200) - 100) / 1000;
  return { lat, lng };
};

function coordsFromRawOrder(raw: any): { lat: number; lng: number } | undefined {
  const nested = raw?.delivery?.address?.coordinates;
  const c = raw?.coordinates ?? nested;
  if (
    c &&
    typeof c.lat === 'number' &&
    typeof c.lng === 'number' &&
    !Number.isNaN(c.lat) &&
    !Number.isNaN(c.lng)
  ) {
    return { lat: c.lat, lng: c.lng };
  }
  if (c != null && c.lat != null && c.lng != null) {
    const lat = Number(c.lat);
    const lng = Number(c.lng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng };
    }
  }
  return undefined;
}

function dropAddressString(order: any): string {
  const d = order?.dropLocation;
  if (typeof d === 'string') return d;
  if (d && typeof d.address === 'string') return d.address;
  return order?.delivery_address || '';
}

/** Merge saved-cluster order payloads with geocoded list orders so map markers always get coordinates when possible. */
function enrichOrderForMap(raw: any, processedById: Map<string, GroupDeliveryOrder>): GroupDeliveryOrder {
  const merged = raw?.id ? processedById.get(raw.id) : undefined;
  const drop =
    dropAddressString(raw) ||
    (merged ? (typeof merged.dropLocation === 'string' ? merged.dropLocation : '') : '');
  const pickup =
    typeof raw?.pickupLocation === 'string'
      ? raw.pickupLocation
      : merged?.pickupLocation || '';

  let coordinates = merged?.coordinates ?? coordsFromRawOrder(raw);
  if (!coordinates && drop) {
    coordinates = generateFallbackCoords(drop);
  }

  return {
    id: raw.id || merged?.id || '',
    status: (raw.status || merged?.status || 'pending') as GroupDeliveryOrder['status'],
    zone: raw.zone ?? merged?.zone,
    distanceKm: raw.distanceKm ?? merged?.distanceKm,
    riderEarning: raw.riderEarning ?? merged?.riderEarning,
    priority: raw.priority ?? merged?.priority,
    slaDeadline:
      typeof merged?.slaDeadline === 'string'
        ? merged.slaDeadline
        : raw.slaDeadline
          ? new Date(raw.slaDeadline).toISOString()
          : new Date().toISOString(),
    pickupLocation: pickup,
    dropLocation: drop || merged?.dropLocation || pickup,
    customerName: raw.customerName || merged?.customerName || '',
    items: Array.isArray(merged?.items) ? merged.items : Array.isArray(raw.items) ? raw.items : [],
    timeline: Array.isArray(merged?.timeline) ? merged.timeline : Array.isArray(raw.timeline) ? raw.timeline : [],
    riderId: raw.riderId ?? merged?.riderId,
    etaMinutes: raw.etaMinutes ?? merged?.etaMinutes,
    coordinates,
  };
}

function normalizeSavedClusterApi(c: any, processedById: Map<string, GroupDeliveryOrder>): Cluster {
  const orders = (c.orders || []).map((raw: any) => enrichOrderForMap(raw, processedById));
  let center = c.center as { lat: number; lng: number } | undefined;
  const withCoords = orders.filter((o) => o.coordinates);
  const invalidCenter =
    !center ||
    typeof center.lat !== 'number' ||
    typeof center.lng !== 'number' ||
    Number.isNaN(center.lat) ||
    Number.isNaN(center.lng) ||
    (center.lat === 0 && center.lng === 0);
  if (withCoords.length > 0 && invalidCenter) {
    center = {
      lat: withCoords.reduce((s, o) => s + o.coordinates!.lat, 0) / withCoords.length,
      lng: withCoords.reduce((s, o) => s + o.coordinates!.lng, 0) / withCoords.length,
    };
  }
  return {
    id: c.clusterId,
    clusterId: c.clusterId,
    orders,
    center: center || defaultCenter,
    color: c.color,
    status: c.status,
    isSaved: true,
  };
}

function unwrapClustersResponse(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const payload = data as { data?: unknown };
    if (Array.isArray(payload.data)) return payload.data;
  }
  return [];
}

function mapApiOrderToOrder(raw: any): GroupDeliveryOrder {
  const drop =
    typeof raw?.dropLocation === 'string'
      ? raw.dropLocation
      : raw?.dropLocation?.address ||
        raw?.delivery_address ||
        (typeof raw?.delivery?.address === 'string' ? raw.delivery.address : '');
  let coordinates = raw?.coordinates ?? coordsFromRawOrder(raw);
  if (!coordinates && drop) {
    coordinates = generateFallbackCoords(drop);
  }
  return {
    id: raw.id || '',
    status: (raw.status || 'pending') as GroupDeliveryOrder['status'],
    slaDeadline: raw.slaDeadline
      ? new Date(raw.slaDeadline).toISOString()
      : new Date().toISOString(),
    pickupLocation: raw.pickupLocation || '',
    dropLocation: drop,
    customerName: raw.customerName || 'Customer',
    items: Array.isArray(raw.items) ? raw.items : [],
    timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
    riderId: raw.riderId,
    etaMinutes: raw.etaMinutes,
    coordinates,
    zone: raw.zone ?? null,
    distanceKm: raw.distanceKm,
    riderEarning: raw.riderEarning,
    priority: raw.priority,
  };
}

export function GroupDelivery({ searchQuery = '' }: { searchQuery?: string }) {
  const [orders, setOrders] = useState<GroupDeliveryOrder[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [unclusteredOrders, setUnclusteredOrders] = useState<GroupDeliveryOrder[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<GroupDeliveryOrder | null>(null);
  const [distanceThreshold, setDistanceThreshold] = useState(2);
  const [orderSearch, setOrderSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOptions, setFilterOptions] = useState<GroupDeliveryFilterOptions>({
    zones: [],
    statuses: [],
  });
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [geocodingProgress, setGeocodingProgress] = useState(0);
  const [useFallback, setUseFallback] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clustering, setClustering] = useState(false);

  const geocodeCache = useRef<Record<string, { lat: number; lng: number }>>({});
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const pageReadyRef = useRef(false);

  const hasMapsKey = Boolean(GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.trim().length > 0);
  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
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

  const ordersById = useMemo(() => {
    const map = new Map<string, GroupDeliveryOrder>();
    for (const o of orders) map.set(o.id, o);
    for (const o of unclusteredOrders) map.set(o.id, o);
    for (const c of clusters) {
      for (const o of c.orders) map.set(o.id, o);
    }
    return map;
  }, [orders, unclusteredOrders, clusters]);

  const displayPoolOrders = useMemo(() => {
    let list = unclusteredOrders;
    const q = (orderSearch || searchQuery).trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          String(o.dropLocation).toLowerCase().includes(q)
      );
    }
    if (zoneFilter !== 'all') {
      list = list.filter((o) => o.zone === zoneFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter((o) => String(o.status).toLowerCase() === statusFilter.toLowerCase());
    }
    return list;
  }, [unclusteredOrders, orderSearch, searchQuery, zoneFilter, statusFilter]);

  const enrichOrdersForMap = useCallback(
    async (rawOrders: GroupDeliveryOrder[]): Promise<GroupDeliveryOrder[]> => {
      const enriched: GroupDeliveryOrder[] = [];
      let failCount = 0;
      for (let i = 0; i < rawOrders.length; i++) {
        const order = rawOrders[i];
        setGeocodingProgress(
          rawOrders.length > 0 ? Math.round(((i + 1) / rawOrders.length) * 100) : 0
        );
        if (order.coordinates) {
          enriched.push(order);
          continue;
        }
        const address =
          typeof order.dropLocation === 'string'
            ? order.dropLocation
            : order.pickupLocation;
        if (!address) {
          enriched.push(order);
          continue;
        }
        let coords = await geocodeAddress(address);
        if (!coords) {
          coords = generateFallbackCoords(address);
          failCount++;
        }
        enriched.push({ ...order, coordinates: coords });
      }
      if (failCount > 0) setUseFallback(true);
      return enriched;
    },
    []
  );

  const regenerateDraftGroups = useCallback(
    async (options?: { silent?: boolean }) => {
      setClustering(true);
      setUseFallback(false);
      try {
        const [grouped, savedClustersData] = await Promise.all([
          fetchGroupedOrders(distanceThreshold, {
            zone: zoneFilter,
            status: statusFilter,
            search: orderSearch,
          }),
          listClustersFromBackend({ status: 'active' }),
        ]);

        const savedList = unwrapClustersResponse(savedClustersData);
        const ordersToEnrich = [
          ...grouped.clusters.flatMap((c) => c.orders),
          ...grouped.unclustered,
          ...savedList.flatMap((c: any) => c.orders || []),
        ].map(mapApiOrderToOrder);
        const uniqueToEnrich = Array.from(
          new Map(ordersToEnrich.filter((o) => o.id).map((o) => [o.id, o])).values()
        );

        const enrichedDraft = await enrichOrdersForMap(uniqueToEnrich);
        const enrichedById = new Map(enrichedDraft.map((o) => [o.id, o]));

        const savedClusters: Cluster[] = savedList.map((c: any) =>
          normalizeSavedClusterApi(c, enrichedById)
        );

        const draftClusters: Cluster[] = grouped.clusters.map((c, idx) => {
          const orders = c.orders
            .map((o) => enrichedById.get(mapApiOrderToOrder(o).id) || mapApiOrderToOrder(o))
            .filter((o) => o.id);
          const withCoords = orders.filter((o) => o.coordinates);
          const center =
            c.center && withCoords.length === 0
              ? c.center
              : withCoords.length > 0
                ? {
                    lat: withCoords.reduce((s, o) => s + o.coordinates!.lat, 0) / withCoords.length,
                    lng: withCoords.reduce((s, o) => s + o.coordinates!.lng, 0) / withCoords.length,
                  }
                : c.center || defaultCenter;
          return {
            id: c.id || `draft-${idx + 1}`,
            orders,
            center,
            color: c.color || GROUP_CLUSTER_COLORS[idx % GROUP_CLUSTER_COLORS.length],
            isSaved: false,
          };
        });

        const unclustered = grouped.unclustered
          .map((o) => enrichedById.get(mapApiOrderToOrder(o).id) || mapApiOrderToOrder(o))
          .filter((o) => o.id);

        setClusters([...savedClusters, ...draftClusters]);
        setUnclusteredOrders(unclustered);

        const allOrders = [
          ...savedClusters.flatMap((c) => c.orders),
          ...draftClusters.flatMap((c) => c.orders),
          ...unclustered,
        ];
        const uniqueOrders = Array.from(
          new Map(allOrders.filter((o) => o.id).map((o) => [o.id, o])).values()
        );
        setOrders(uniqueOrders);

        if (!options?.silent) {
          toast.success(
            `Formed ${draftClusters.length} draft group(s) within ${grouped.radiusKm} km` +
              (savedClusters.length > 0 ? ` · ${savedClusters.length} saved` : '')
          );
        }
      } catch (error) {
        console.error('Failed to form groups:', error);
        toast.error(
          error instanceof Error ? error.message : 'Failed to form groups from orders'
        );
      } finally {
        setClustering(false);
        setGeocodingProgress(0);
      }
    },
    [distanceThreshold, enrichOrdersForMap, zoneFilter, statusFilter, orderSearch]
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ridersData, opts] = await Promise.all([
        api.getRiders(),
        fetchGroupDeliveryFilterOptions(),
      ]);
      setRiders(ridersData);
      setFilterOptions(opts);
      await regenerateDraftGroups({ silent: true });
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
      pageReadyRef.current = true;
    }
  };

  const handleDropOrders = async (orderIds: string[], targetClusterId: string | 'new') => {
    const { clusters: nextClusters, unclustered: nextUnclustered, createdClusterId } =
      moveOrdersToCluster(clusters, unclusteredOrders, orderIds, targetClusterId, ordersById);

    setClusters(nextClusters);
    setUnclusteredOrders(nextUnclustered);
    setSelectedOrderIds(new Set());

    const target =
      nextClusters.find((c) => c.id === (createdClusterId || targetClusterId)) || null;
    if (target) setSelectedCluster(target);

    const savedTarget = nextClusters.find(
      (c) =>
        (c.id === targetClusterId || c.id === createdClusterId) && c.isSaved && c.clusterId
    );
    if (savedTarget?.clusterId) {
      try {
        await updateClusterOrdersOnBackend(
          savedTarget.clusterId,
          savedTarget.orders.map((o) => o.id)
        );
        toast.success('Group updated on server');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to sync group');
        await fetchData();
      }
    } else {
      toast.success(`Added ${orderIds.length} order(s) to group`);
    }
  };

  const handleToggleSelectOrder = (orderId: string, multi?: boolean) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (multi) {
        if (next.has(orderId)) next.delete(orderId);
        else next.add(orderId);
      } else {
        if (next.size === 1 && next.has(orderId)) {
          next.clear();
        } else {
          next.clear();
          next.add(orderId);
        }
      }
      return next;
    });
  };

  const saveAllClusters = async () => {
    const unsavedClusters = clusters.filter(c => !c.isSaved);
    if (unsavedClusters.length === 0) {
      toast.info('No new clusters to save');
      return;
    }

    setSaving(true);
    try {
      await saveClustersToBackend(
        unsavedClusters.map((c) => ({
          id: c.id,
          clusterId: c.clusterId,
          orders: c.orders,
          center: c.center,
          color: c.color,
          radiusKm: distanceThreshold,
        }))
      );
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

  const saveSingleCluster = async (cluster: Cluster) => {
    if (cluster.isSaved) {
      toast.info('Group is already saved');
      return;
    }
    setSaving(true);
    try {
      await saveClustersToBackend([
        {
          id: cluster.id,
          clusterId: cluster.clusterId,
          orders: cluster.orders,
          center: cluster.center,
          color: cluster.color,
          radiusKm: distanceThreshold,
        },
      ]);
      toast.success('Group saved');
      await fetchData();
      setSelectedCluster(null);
    } catch (error) {
      console.error('Failed to save cluster:', error);
      toast.error('Failed to save group');
    } finally {
      setSaving(false);
    }
  };

  const ensureClusterSaved = async (cluster: Cluster): Promise<string> => {
    if (cluster.isSaved && cluster.clusterId) return cluster.clusterId;
    const saved = await saveClustersToBackend([
      {
        id: cluster.id,
        clusterId: cluster.clusterId,
        orders: cluster.orders,
        center: cluster.center,
        color: cluster.color,
        radiusKm: distanceThreshold,
      },
    ]);
    const clusterId = saved[0]?.clusterId;
    if (!clusterId) throw new Error('Could not save group before assignment');
    return clusterId;
  };

  const handleAssignGroupConfirm = async (riderId: string, overrideSla: boolean) => {
    if (!selectedCluster) return;
    setSaving(true);
    try {
      const clusterId = await ensureClusterSaved(selectedCluster);
      const result = await assignClusterToRider(clusterId, riderId, overrideSla);
      if (result.failedCount > 0) {
        toast.warning(
          `Assigned ${result.assignedCount} of ${result.totalOrders} orders to ${result.riderName || riderId}`,
          { description: result.failed?.[0]?.message }
        );
      } else {
        toast.success(
          `Assigned ${result.assignedCount} orders to ${result.riderName || riderId}`
        );
      }
      setAssignModalOpen(false);
      setSelectedCluster(null);
      await fetchData();
    } catch (error) {
      console.error('Failed to assign cluster:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assign group');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!pageReadyRef.current || loading) return;
    void regenerateDraftGroups();
  }, [distanceThreshold]);

  useEffect(() => {
    if (!pageReadyRef.current) return;
    const t = window.setTimeout(() => {
      void regenerateDraftGroups({ silent: true });
    }, 400);
    return () => window.clearTimeout(t);
  }, [zoneFilter, statusFilter, orderSearch]);

  const filteredClusters = useMemo(() => {
    if (!searchQuery.trim()) return clusters;
    const q = searchQuery.trim().toLowerCase();
    return clusters.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        (c.clusterId && c.clusterId.toLowerCase().includes(q)) ||
        c.orders.some(
          (o) =>
            o.id.toLowerCase().includes(q) ||
            (o.customerName && o.customerName.toLowerCase().includes(q)) ||
            String(o.dropLocation).toLowerCase().includes(q)
        )
    );
  }, [clusters, searchQuery]);

  const fitMapToData = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    const bounds = new google.maps.LatLngBounds();
    let hasPoint = false;

    const extendOrder = (o: GroupDeliveryOrder) => {
      if (!o.coordinates) return;
      bounds.extend(o.coordinates);
      hasPoint = true;
    };

    if (selectedCluster) {
      selectedCluster.orders.forEach(extendOrder);
    } else {
      filteredClusters.forEach((c) => c.orders.forEach(extendOrder));
      unclusteredOrders.forEach(extendOrder);
    }

    if (hasPoint) {
      map.fitBounds(bounds, 56);
      const listener = google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        const z = map.getZoom();
        if (z != null && z > 16) map.setZoom(16);
        google.maps.event.removeListener(listener);
      });
    } else {
      map.setCenter(defaultCenter);
      map.setZoom(12);
    }
  }, [filteredClusters, unclusteredOrders, selectedCluster]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      requestAnimationFrame(() => {
        google.maps.event.trigger(map, 'resize');
        fitMapToData();
      });
    },
    [fitMapToData]
  );

  useEffect(() => {
    if (!hasMapsKey || !isLoaded) return;
    fitMapToData();
  }, [hasMapsKey, isLoaded, fitMapToData]);

  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el || !isLoaded) return;
    const ro = new ResizeObserver(() => {
      if (mapRef.current) {
        google.maps.event.trigger(mapRef.current, 'resize');
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLoaded, selectedCluster]);

  const handleZoomIn = () => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(Math.min((map.getZoom() ?? 12) + 1, 20));
  };

  const handleZoomOut = () => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(Math.max((map.getZoom() ?? 12) - 1, 4));
  };

  const circleIcon = useCallback(
    (fillColor: string, scale = 7): google.maps.Symbol | undefined => {
      if (!isLoaded || !window.google?.maps?.SymbolPath) return undefined;
      return {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale,
        fillColor,
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      };
    },
    [isLoaded]
  );

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
                disabled={loading || saving || clustering || !clusters.some((c) => !c.isSaved)}
                className="px-4 py-2 bg-[#F97316] text-white font-medium rounded-lg hover:bg-[#EA580C] disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={16} />
                Save All Groups
              </button>
              <button
                onClick={fetchData}
                disabled={loading || clustering}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
              >
                <RefreshCw size={16} className={loading || clustering ? 'animate-spin' : ''} />
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

        <DndProvider backend={HTML5Backend}>
          <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
            <div className="w-[26%] min-w-[220px] flex flex-col min-h-0">
              <GroupDeliveryClusterColumn
                clusters={filteredClusters}
                selectedClusterId={selectedCluster?.id ?? null}
                distanceThreshold={distanceThreshold}
                clustering={clustering}
                loading={loading}
                onSelectCluster={(c) => {
                  setSelectedCluster(c);
                  setSelectedOrder(null);
                }}
                onDeleteCluster={deleteCluster}
                onDistanceChange={setDistanceThreshold}
                onDropOrders={(ids, target) => void handleDropOrders(ids, target)}
              />
            </div>
            <div className="w-[26%] min-w-[220px] flex flex-col min-h-0">
              <GroupDeliveryOrdersColumn
                orders={displayPoolOrders}
                filterOptions={filterOptions}
                search={orderSearch}
                zoneFilter={zoneFilter}
                statusFilter={statusFilter}
                selectedOrderIds={selectedOrderIds}
                loading={loading || clustering}
                onSearchChange={setOrderSearch}
                onZoneChange={setZoneFilter}
                onStatusChange={setStatusFilter}
                onToggleSelect={handleToggleSelectOrder}
                onSelectAll={() => setSelectedOrderIds(new Set(displayPoolOrders.map((o) => o.id)))}
                onClearSelection={() => setSelectedOrderIds(new Set())}
              />
            </div>
            <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0 overflow-hidden">
              <GroupDeliveryMetricsPanel cluster={selectedCluster} />
              <div className="flex-1 bg-white border border-[#E0E0E0] rounded-xl p-6 shadow-sm overflow-auto text-sm text-gray-600">
                Map view requires Google Maps API key.
                {selectedCluster && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {selectedCluster.orders.map((order) => (
                      <div key={order.id} className="p-2 border rounded bg-gray-50 text-xs">
                        <div className="font-bold">{order.id}</div>
                        <div className="text-gray-500 truncate">{order.customerName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DndProvider>
      </div>
    );
  }

  const mapCenter =
    selectedCluster?.center ||
    (filteredClusters.length > 0 ? filteredClusters[0].center : defaultCenter);

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
              disabled={loading || saving || clustering || !clusters.some((c) => !c.isSaved)}
              className="px-4 py-2 bg-[#F97316] text-white font-medium rounded-lg hover:bg-[#EA580C] disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} />
              Save All Groups
            </button>
            <button
              onClick={fetchData}
              disabled={loading || clustering}
              className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
            >
              <RefreshCw size={16} className={loading || clustering ? 'animate-spin' : ''} />
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

      <DndProvider backend={HTML5Backend}>
        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
          <div className="w-[24%] min-w-[200px] flex flex-col min-h-0">
            <GroupDeliveryClusterColumn
              clusters={filteredClusters}
              selectedClusterId={selectedCluster?.id ?? null}
              distanceThreshold={distanceThreshold}
              clustering={clustering}
              loading={loading}
              onSelectCluster={(c) => {
                setSelectedCluster(c);
                setSelectedOrder(null);
              }}
              onDeleteCluster={deleteCluster}
              onDistanceChange={setDistanceThreshold}
              onDropOrders={(ids, target) => void handleDropOrders(ids, target)}
            />
          </div>
          <div className="w-[24%] min-w-[200px] flex flex-col min-h-0">
            <GroupDeliveryOrdersColumn
              orders={displayPoolOrders}
              filterOptions={filterOptions}
              search={orderSearch}
              zoneFilter={zoneFilter}
              statusFilter={statusFilter}
              selectedOrderIds={selectedOrderIds}
              loading={loading || clustering}
              onSearchChange={setOrderSearch}
              onZoneChange={setZoneFilter}
              onStatusChange={setStatusFilter}
              onToggleSelect={handleToggleSelectOrder}
              onSelectAll={() => setSelectedOrderIds(new Set(displayPoolOrders.map((o) => o.id)))}
              onClearSelection={() => setSelectedOrderIds(new Set())}
            />
          </div>

        <div className="flex-1 flex flex-col gap-3 overflow-hidden min-h-0 min-w-0">
          <GroupDeliveryMetricsPanel cluster={selectedCluster} />
          <div
            ref={mapWrapRef}
            className={`flex-1 min-h-[420px] bg-[#F3F4F6] border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm relative ${
              selectedCluster ? 'max-h-[55%]' : ''
            }`}
          >
            {!hasMapsKey && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-[#616161] bg-[#F3F4F6]">
                <MapIcon size={40} className="text-gray-400" />
                <p>
                  Set <span className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</span> to load the delivery map.
                </p>
              </div>
            )}

            {hasMapsKey && !isLoaded && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#F3F4F6]">
                <RefreshCw className="animate-spin text-[#F97316]" size={32} />
              </div>
            )}

            {loading && hasMapsKey && isLoaded && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 pointer-events-none">
                <span className="text-sm text-gray-600 font-medium">Updating map…</span>
              </div>
            )}

            {hasMapsKey && isLoaded && (
              <div className="absolute inset-0">
                <GoogleMap
                  mapContainerStyle={containerStyle}
                  center={mapCenter}
                  zoom={12}
                  onLoad={onMapLoad}
                  onUnmount={() => {
                    mapRef.current = null;
                  }}
                  options={{
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                    styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
                  }}
                >
                  {filteredClusters.map((cluster) => (
                    <React.Fragment key={cluster.id}>
                      {cluster.orders
                        .filter((o) => !!o.coordinates)
                        .map((order, idx, arr) => {
                          const jittered = getJitteredCoords(
                            order.coordinates!.lat,
                            order.coordinates!.lng,
                            idx,
                            arr.length
                          );
                          return (
                            <Marker
                              key={`${cluster.id}-${order.id}`}
                              position={jittered}
                              icon={circleIcon(
                                cluster.color,
                                selectedCluster?.id === cluster.id ? 9 : 6
                              )}
                              onClick={() => {
                                setSelectedOrder(order);
                                setSelectedCluster(cluster);
                              }}
                            />
                          );
                        })}
                      {selectedCluster?.id === cluster.id && (
                        <Polyline
                          path={cluster.orders
                            .filter((o) => !!o.coordinates)
                            .map((o) => ({
                              lat: o.coordinates!.lat,
                              lng: o.coordinates!.lng,
                            }))}
                          options={{
                            strokeColor: cluster.color,
                            strokeOpacity: 0.6,
                            strokeWeight: 3,
                            geodesic: true,
                          }}
                        />
                      )}
                    </React.Fragment>
                  ))}

                  {!selectedCluster &&
                    unclusteredOrders
                      .filter((o) => o.coordinates)
                      .map((order) => (
                        <Marker
                          key={`unclustered-${order.id}`}
                          position={order.coordinates!}
                          icon={circleIcon('#9CA3AF', 5)}
                          onClick={() => setSelectedOrder(order)}
                        />
                      ))}

                  {selectedOrder?.coordinates && (
                    <InfoWindow
                      position={selectedOrder.coordinates}
                      onCloseClick={() => setSelectedOrder(null)}
                    >
                      <div className="p-2 min-w-[180px]">
                        <div className="font-bold text-sm mb-1">{selectedOrder.id}</div>
                        <div className="text-xs text-gray-600 mb-2">{selectedOrder.customerName}</div>
                        <div className="text-[10px] text-gray-500 mb-2 leading-tight">
                          {selectedOrder.dropLocation}
                        </div>
                        <div className="text-[10px] font-bold text-orange-600 uppercase">
                          {selectedOrder.status}
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              </div>
            )}

            <div className="absolute top-3 left-3 z-10 pointer-events-none">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-[#E0E0E0] shadow-sm px-3 py-2 text-xs text-[#616161]">
                <div className="font-semibold text-[#212121] mb-1">Map legend</div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
                  Grouped drops
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9CA3AF]" />
                  Unclustered
                </div>
                <div className="mt-1 text-[10px] text-[#757575]">
                  {filteredClusters.length} groups · {unclusteredOrders.length} unclustered
                </div>
              </div>
            </div>

            {hasMapsKey && isLoaded && (
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
                <div className="bg-white/95 backdrop-blur-sm p-1 rounded-lg border border-[#E0E0E0] shadow-sm flex flex-col">
                  <button
                    type="button"
                    className="p-2 hover:bg-gray-100 rounded text-gray-600"
                    onClick={handleZoomIn}
                    title="Zoom in"
                  >
                    <Plus size={18} />
                  </button>
                  <button
                    type="button"
                    className="p-2 hover:bg-gray-100 rounded text-gray-600"
                    onClick={handleZoomOut}
                    title="Zoom out"
                  >
                    <Minus size={18} />
                  </button>
                  <button
                    type="button"
                    className="p-2 hover:bg-gray-100 rounded text-gray-600 text-[10px] font-bold"
                    onClick={fitMapToData}
                    title="Fit all markers"
                  >
                    FIT
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedCluster && (
            <div className="shrink-0 min-h-[220px] max-h-[min(42vh,380px)] bg-white border border-[#E0E0E0] rounded-xl p-4 shadow-sm flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-3 shrink-0">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedCluster.color }} />
                  Group Details —{' '}
                  {selectedCluster.id.startsWith('draft')
                    ? 'Draft'
                    : `#${(selectedCluster.clusterId || selectedCluster.id).slice(-4).toUpperCase()}`}{' '}
                  ({selectedCluster.orders.length} orders)
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCluster(null);
                    setAssignModalOpen(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto pr-2 pb-2 flex-1 min-h-0">
                {selectedCluster.orders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-2.5 border rounded transition-all cursor-pointer ${
                      selectedOrder?.id === order.id
                        ? 'border-[#F97316] bg-orange-50'
                        : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold text-[11px] mb-1">{order.id}</div>
                    <div className="text-[10px] text-gray-600 font-medium truncate">
                      {order.customerName}
                    </div>
                    <div className="text-[9px] text-gray-400 truncate">{order.dropLocation}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                {!selectedCluster.isSaved && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void saveSingleCluster(selectedCluster)}
                    disabled={saving || clustering}
                    className="border-[#F97316] text-[#F97316] hover:bg-orange-50"
                  >
                    <Save size={14} className="mr-1" />
                    Save group
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-[#F97316] hover:bg-[#EA580C] text-white"
                  disabled={saving || selectedCluster.orders.length === 0}
                  onClick={() => setAssignModalOpen(true)}
                >
                  <Users size={14} className="mr-1" />
                  Assign to rider
                </Button>
              </div>
            </div>
          )}

          <AssignGroupRiderModal
            open={assignModalOpen && !!selectedCluster}
            onClose={() => setAssignModalOpen(false)}
            orderIds={selectedCluster?.orders.map((o) => o.id) ?? []}
            groupLabel={
              selectedCluster
                ? selectedCluster.id.startsWith('draft')
                  ? 'draft group'
                  : `group ${selectedCluster.clusterId || selectedCluster.id}`
                : 'group'
            }
            onConfirm={handleAssignGroupConfirm}
            saving={saving}
          />
        </div>
        </div>
      </DndProvider>
    </div>
  );
}
