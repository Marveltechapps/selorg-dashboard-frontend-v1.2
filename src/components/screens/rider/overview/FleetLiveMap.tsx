import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, InfoWindow, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { Map, Minus, Package, Plus, User } from 'lucide-react';
import { GOOGLE_MAPS_LOADER_ID } from '../../../../utils/googleMapsLoader';
import { isActiveFleetOrderStatus, type FleetMapOrder, type FleetMapRider } from './fleetMapApi';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const DEFAULT_CENTER = { lat: 13.0827, lng: 80.2707 };

const mapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
};

function isValidCoord(lat: number | undefined, lng: number | undefined): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

interface FleetLiveMapProps {
  riders: FleetMapRider[];
  orders: FleetMapOrder[];
  loading?: boolean;
  className?: string;
}

export function FleetLiveMap({ riders, orders, loading, className }: FleetLiveMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [showRiders, setShowRiders] = useState(true);
  const [showOrders, setShowOrders] = useState(true);

  const hasMapsKey = Boolean(GOOGLE_MAPS_API_KEY?.trim());

  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
  });

  const trackableOrders = useMemo(
    () => orders.filter((o) => isActiveFleetOrderStatus(o.status)),
    [orders]
  );

  const ridersOnMap = useMemo(
    () => riders.filter((r) => isValidCoord(r.location.lat, r.location.lng)),
    [riders]
  );

  const initialCenter = useMemo(() => {
    const r = ridersOnMap[0];
    if (r) return { lat: r.location.lat, lng: r.location.lng };
    const o = trackableOrders.find(
      (x) =>
        isValidCoord(x.pickupLocation.lat, x.pickupLocation.lng) ||
        isValidCoord(x.dropLocation.lat, x.dropLocation.lng)
    );
    if (o) {
      if (isValidCoord(o.dropLocation.lat, o.dropLocation.lng)) {
        return { lat: o.dropLocation.lat, lng: o.dropLocation.lng };
      }
      return { lat: o.pickupLocation.lat, lng: o.pickupLocation.lng };
    }
    return DEFAULT_CENTER;
  }, [ridersOnMap, trackableOrders]);

  const fitMapToData = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    const bounds = new google.maps.LatLngBounds();
    let hasPoint = false;

    const extend = (lat: number, lng: number) => {
      bounds.extend({ lat, lng });
      hasPoint = true;
    };

    if (showRiders) {
      ridersOnMap.forEach((r) => {
        extend(r.location.lat, r.location.lng);
      });
    }

    if (showOrders) {
      trackableOrders.forEach((o) => {
        if (isValidCoord(o.pickupLocation.lat, o.pickupLocation.lng)) {
          extend(o.pickupLocation.lat, o.pickupLocation.lng);
        }
        if (isValidCoord(o.dropLocation.lat, o.dropLocation.lng)) {
          extend(o.dropLocation.lat, o.dropLocation.lng);
        }
      });
    }

    if (hasPoint) {
      map.fitBounds(bounds, 48);
    } else {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(11);
    }
  }, [ridersOnMap, trackableOrders, showRiders, showOrders]);

  useEffect(() => {
    if (!isLoaded) return;
    fitMapToData();
  }, [isLoaded, fitMapToData]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      fitMapToData();
    },
    [fitMapToData]
  );

  const circleIcon = useCallback((fillColor: string, strokeColor: string, scale = 7): google.maps.Symbol | undefined => {
    if (!isLoaded || !window.google?.maps?.SymbolPath) return undefined;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale,
      fillColor,
      fillOpacity: 1,
      strokeColor,
      strokeWeight: 2,
    };
  }, [isLoaded]);

  const riderColor = (status: string) => {
    if (status === 'busy' || status === 'in_transit') return '#F97316';
    if (status === 'idle' || status === 'online') return '#22C55E';
    return '#9CA3AF';
  };

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

  return (
    <div
      className={`relative flex h-full w-full flex-col overflow-hidden bg-[#F3F4F6] ${className ?? ''}`}
      style={{ minHeight: 280 }}
    >
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <div className="bg-white/95 backdrop-blur-sm p-1 rounded-lg border border-[#E0E0E0] shadow-sm flex flex-col gap-1">
          <button
            type="button"
            className={`p-2 rounded hover:bg-gray-100 ${showRiders ? 'text-green-600 bg-green-50' : 'text-gray-500'}`}
            onClick={() => setShowRiders((v) => !v)}
            title="Toggle riders"
          >
            <User size={18} />
          </button>
          <button
            type="button"
            className={`p-2 rounded hover:bg-gray-100 ${showOrders ? 'text-orange-600 bg-orange-50' : 'text-gray-500'}`}
            onClick={() => setShowOrders((v) => !v)}
            title="Toggle orders"
          >
            <Package size={18} />
          </button>
          <div className="h-px bg-gray-200 my-0.5" />
          <button type="button" className="p-2 hover:bg-gray-100 rounded text-gray-600" onClick={handleZoomIn}>
            <Plus size={18} />
          </button>
          <button type="button" className="p-2 hover:bg-gray-100 rounded text-gray-600" onClick={handleZoomOut}>
            <Minus size={18} />
          </button>
        </div>
      </div>

      <div className="absolute top-3 left-3 z-10">
        <div className="bg-white/95 backdrop-blur-sm p-2.5 rounded-lg border border-[#E0E0E0] shadow-sm text-xs">
          <div className="font-bold mb-1.5 text-[#212121]">Status key</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
            Idle / Online
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
            Busy
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400 shrink-0" />
            Offline
          </div>
          <div className="border-t border-gray-100 pt-2 space-y-1 text-[#757575]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[10px] w-4 text-center">P</span> Pickup
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[10px] w-4 text-center text-orange-600">D</span> Drop
            </div>
          </div>
        </div>
      </div>

      {!hasMapsKey && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-gray-600 z-20">
          <Map size={40} className="text-gray-400" />
          <p>
            Set <span className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</span> to enable the live map.
          </p>
        </div>
      )}

      {hasMapsKey && !isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="text-gray-500 text-sm">Loading map…</span>
        </div>
      )}

      {hasMapsKey && isLoaded && (
        <div className="absolute inset-0">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={initialCenter}
          zoom={12}
          onLoad={onMapLoad}
          options={{
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
          }}
        >
          {showOrders &&
            trackableOrders.map((order) => {
              const pOk = isValidCoord(order.pickupLocation.lat, order.pickupLocation.lng);
              const dOk = isValidCoord(order.dropLocation.lat, order.dropLocation.lng);
              if (!pOk || !dOk) return null;
              const isSelected = selectedOrder === order.id;
              return (
                <Polyline
                  key={`route-${order.id}`}
                  path={[
                    { lat: order.pickupLocation.lat, lng: order.pickupLocation.lng },
                    { lat: order.dropLocation.lat, lng: order.dropLocation.lng },
                  ]}
                  options={{
                    strokeColor: isSelected ? '#EA580C' : '#94A3B8',
                    strokeOpacity: isSelected ? 0.95 : 0.7,
                    strokeWeight: isSelected ? 4 : 2,
                    geodesic: true,
                  }}
                />
              );
            })}

          {showRiders &&
            ridersOnMap.map((rider) => (
              <Marker
                key={rider.id}
                position={{ lat: rider.location.lat, lng: rider.location.lng }}
                icon={circleIcon(riderColor(rider.status), '#FFFFFF', selectedRider === rider.id ? 9 : 7)}
                onClick={() => {
                  setSelectedRider(rider.id === selectedRider ? null : rider.id);
                  setSelectedOrder(null);
                }}
              >
                {selectedRider === rider.id && (
                  <InfoWindow onCloseClick={() => setSelectedRider(null)}>
                    <div className="text-xs max-w-[200px]">
                      <p className="font-bold">{rider.name}</p>
                      <p className="text-gray-600 capitalize">{rider.status}</p>
                      {rider.currentOrderId && (
                        <p className="text-blue-600 mt-1">Order {rider.currentOrderId}</p>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            ))}

          {showOrders &&
            trackableOrders.map((order) => {
              const pOk = isValidCoord(order.pickupLocation.lat, order.pickupLocation.lng);
              const dOk = isValidCoord(order.dropLocation.lat, order.dropLocation.lng);
              const isSelected = selectedOrder === order.id;
              return (
                <React.Fragment key={order.id}>
                  {pOk && (
                    <Marker
                      position={{ lat: order.pickupLocation.lat, lng: order.pickupLocation.lng }}
                      label={{ text: 'P', color: '#111827', fontSize: '10px', fontWeight: 'bold' }}
                      icon={circleIcon('#FFFFFF', isSelected ? '#EA580C' : '#6B7280', 6)}
                      onClick={() => {
                        setSelectedOrder(order.id === selectedOrder ? null : order.id);
                        setSelectedRider(null);
                      }}
                    />
                  )}
                  {dOk && (
                    <Marker
                      position={{ lat: order.dropLocation.lat, lng: order.dropLocation.lng }}
                      label={{ text: 'D', color: '#FFFFFF', fontSize: '10px', fontWeight: 'bold' }}
                      icon={circleIcon('#F97316', '#FFFFFF', 7)}
                      onClick={() => {
                        setSelectedOrder(order.id === selectedOrder ? null : order.id);
                        setSelectedRider(null);
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}

          {showOrders &&
            selectedOrder &&
            (() => {
              const order = trackableOrders.find((o) => o.id === selectedOrder);
              if (!order) return null;
              const pos = isValidCoord(order.dropLocation.lat, order.dropLocation.lng)
                ? { lat: order.dropLocation.lat, lng: order.dropLocation.lng }
                : isValidCoord(order.pickupLocation.lat, order.pickupLocation.lng)
                  ? { lat: order.pickupLocation.lat, lng: order.pickupLocation.lng }
                  : null;
              if (!pos) return null;
              return (
                <InfoWindow position={pos} onCloseClick={() => setSelectedOrder(null)}>
                  <div className="text-xs max-w-[240px]">
                    <p className="font-bold">{order.id}</p>
                    {order.customerName && (
                      <p className="text-gray-600 mt-0.5">{order.customerName}</p>
                    )}
                    <p className="mt-1 text-gray-600 capitalize">Status: {order.status.replace(/_/g, ' ')}</p>
                    {order.riderId && (
                      <p className="mt-1 text-blue-600">Rider: {order.riderId}</p>
                    )}
                    <p className="mt-1 text-gray-500">
                      <span className="font-semibold">Drop:</span> {order.dropLocation.address || '—'}
                    </p>
                  </div>
                </InfoWindow>
              );
            })()}
        </GoogleMap>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 bg-white/40 flex items-center justify-center z-30 pointer-events-none">
          <span className="text-sm text-gray-600 font-medium">Refreshing positions…</span>
        </div>
      )}

      {!loading && ridersOnMap.length === 0 && trackableOrders.length === 0 && (
        <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-[#E0E0E0] bg-white/95 px-4 py-2 text-center text-xs text-[#757575] shadow-sm">
          No riders with GPS or active orders to plot. Orders need pickup/drop addresses; riders need live location from the app.
        </div>
      )}
    </div>
  );
}
