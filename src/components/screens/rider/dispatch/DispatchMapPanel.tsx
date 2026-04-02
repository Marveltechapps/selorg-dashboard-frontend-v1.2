import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { GoogleMap, Marker, Polyline, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { DispatchOrder, DispatchRider } from "./types";
import { Map, User, Package, Minus, Plus } from "lucide-react";
import { GOOGLE_MAPS_LOADER_ID } from "../../../../utils/googleMapsLoader";

const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

/** Chennai — matches other rider dashboard maps when there are no coordinates */
const DEFAULT_CENTER = { lat: 13.0827, lng: 80.2707 };

const mapContainerStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
};

interface DispatchMapPanelProps {
  orders: DispatchOrder[];
  riders: DispatchRider[];
  loading: boolean;
}

function isValidCoord(lat: number | undefined, lng: number | undefined): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

export function DispatchMapPanel({ orders, riders, loading }: DispatchMapPanelProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const [showRiders, setShowRiders] = useState(true);
  const [showOrders, setShowOrders] = useState(true);

  const hasMapsKey = Boolean(GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.trim().length > 0);

  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || "",
  });

  const initialCenter = useMemo(() => {
    const firstRider = riders.find((r) => isValidCoord(r.currentLocation?.lat, r.currentLocation?.lng));
    if (firstRider) {
      return { lat: firstRider.currentLocation.lat, lng: firstRider.currentLocation.lng };
    }
    const firstOrder = orders.find(
      (o) =>
        isValidCoord(o.pickupLocation?.lat, o.pickupLocation?.lng) ||
        isValidCoord(o.dropLocation?.lat, o.dropLocation?.lng)
    );
    if (firstOrder) {
      if (isValidCoord(firstOrder.pickupLocation.lat, firstOrder.pickupLocation.lng)) {
        return { lat: firstOrder.pickupLocation.lat, lng: firstOrder.pickupLocation.lng };
      }
      return { lat: firstOrder.dropLocation.lat, lng: firstOrder.dropLocation.lng };
    }
    return DEFAULT_CENTER;
  }, [riders, orders]);

  const fitMapToData = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    const bounds = new google.maps.LatLngBounds();
    let hasPoint = false;

    const extendIfVisible = (lat: number, lng: number, layer: "rider" | "order") => {
      if (layer === "rider" && !showRiders) return;
      if (layer === "order" && !showOrders) return;
      bounds.extend({ lat, lng });
      hasPoint = true;
    };

    riders.forEach((r) => {
      if (isValidCoord(r.currentLocation.lat, r.currentLocation.lng)) {
        extendIfVisible(r.currentLocation.lat, r.currentLocation.lng, "rider");
      }
    });

    orders.forEach((o) => {
      if (o.status === "delivered") return;
      if (isValidCoord(o.pickupLocation.lat, o.pickupLocation.lng)) {
        extendIfVisible(o.pickupLocation.lat, o.pickupLocation.lng, "order");
      }
      if (isValidCoord(o.dropLocation.lat, o.dropLocation.lng)) {
        extendIfVisible(o.dropLocation.lat, o.dropLocation.lng, "order");
      }
    });

    if (hasPoint) {
      map.fitBounds(bounds, 56);
    } else {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(11);
    }
  }, [riders, orders, showRiders, showOrders]);

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

  const handleZoomIn = () => {
    const map = mapRef.current;
    if (!map) return;
    const z = map.getZoom() ?? 12;
    map.setZoom(Math.min(z + 1, 20));
  };

  const handleZoomOut = () => {
    const map = mapRef.current;
    if (!map) return;
    const z = map.getZoom() ?? 12;
    map.setZoom(Math.max(z - 1, 4));
  };

  const circleIcon = (fillColor: string, strokeColor: string, scale = 7) => {
    const g = (globalThis as typeof globalThis & { google?: typeof google }).google;
    if (!g?.maps?.SymbolPath) return undefined;
    return {
      path: g.maps.SymbolPath.CIRCLE,
      scale,
      fillColor,
      fillOpacity: 1,
      strokeColor,
      strokeWeight: 2,
    } as google.maps.Symbol;
  };

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm relative h-[600px] flex flex-col">
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <div className="bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-[#E0E0E0] shadow-sm flex flex-col gap-1">
          <button
            type="button"
            className={`p-2 rounded hover:bg-gray-100 ${showRiders ? "text-blue-600 bg-blue-50" : "text-gray-500"}`}
            onClick={() => setShowRiders(!showRiders)}
            title="Toggle Riders"
          >
            <User size={18} />
          </button>
          <button
            type="button"
            className={`p-2 rounded hover:bg-gray-100 ${showOrders ? "text-orange-600 bg-orange-50" : "text-gray-500"}`}
            onClick={() => setShowOrders(!showOrders)}
            title="Toggle Orders"
          >
            <Package size={18} />
          </button>
          <div className="h-px bg-gray-200 my-1" />
          <button type="button" className="p-2 hover:bg-gray-100 rounded text-gray-600" onClick={handleZoomIn} title="Zoom in">
            <Plus size={18} />
          </button>
          <button type="button" className="p-2 hover:bg-gray-100 rounded text-gray-600" onClick={handleZoomOut} title="Zoom out">
            <Minus size={18} />
          </button>
        </div>
      </div>

      <div className="absolute top-4 left-4 z-10 w-[min(100%,280px)]">
        <div className="bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-[#E0E0E0] shadow-sm">
          <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Live Status</div>
          <div className="flex justify-between items-center gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-1 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span className="font-semibold tabular-nums text-gray-800">{riders.filter((r) => r.status === "online").length}</span>
              <span className="truncate">Online</span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span className="font-semibold tabular-nums text-gray-800">{riders.filter((r) => r.status === "busy").length}</span>
              <span className="truncate">Busy</span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
              <span className="font-semibold tabular-nums text-gray-800">{orders.filter((o) => o.status === "in_transit").length}</span>
              <span className="truncate">In-Transit</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-[#F3F4F6] overflow-hidden relative min-h-0">
        {!hasMapsKey && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-gray-600 z-20 bg-[#F3F4F6]">
            <Map size={40} className="text-gray-400" />
            <p>
              Set <span className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</span> in your env to load the live map.
            </p>
            <a
              href="https://console.cloud.google.com/google/maps-apis"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2563EB] hover:underline text-xs"
            >
              Google Cloud — Maps Platform
            </a>
          </div>
        )}

        {hasMapsKey && !isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#F3F4F6]">
            <span className="text-gray-500 text-sm">Loading map…</span>
          </div>
        )}

        {hasMapsKey && isLoaded && (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={initialCenter}
            zoom={12}
            onLoad={onMapLoad}
            options={{
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: true,
              styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
            }}
          >
            {showOrders &&
              orders
                .filter((o) => o.status === "assigned" || o.status === "in_transit")
                .map((order) => {
                  if (
                    !isValidCoord(order.pickupLocation.lat, order.pickupLocation.lng) ||
                    !isValidCoord(order.dropLocation.lat, order.dropLocation.lng)
                  ) {
                    return null;
                  }
                  const isSelected = selectedOrder === order.id;
                  return (
                    <Polyline
                      key={`line-${order.id}`}
                      path={[
                        { lat: order.pickupLocation.lat, lng: order.pickupLocation.lng },
                        { lat: order.dropLocation.lat, lng: order.dropLocation.lng },
                      ]}
                      options={{
                        strokeColor: isSelected ? "#EA580C" : "#94A3B8",
                        strokeOpacity: isSelected ? 0.95 : 0.75,
                        strokeWeight: isSelected ? 4 : 2,
                        geodesic: true,
                      }}
                    />
                  );
                })}

            {showRiders &&
              riders.map((rider) => {
                if (!isValidCoord(rider.currentLocation.lat, rider.currentLocation.lng)) return null;
                const isSelected = selectedRider === rider.id;
                const fill =
                  rider.status === "online"
                    ? "#22C55E"
                    : rider.status === "busy"
                      ? "#3B82F6"
                      : rider.status === "idle"
                        ? "#A855F7"
                        : "#9CA3AF";
                return (
                  <Marker
                    key={rider.id}
                    position={{ lat: rider.currentLocation.lat, lng: rider.currentLocation.lng }}
                    icon={circleIcon(fill, "#FFFFFF", isSelected ? 9 : 7)}
                    onClick={() => {
                      setSelectedRider(rider.id === selectedRider ? null : rider.id);
                      setSelectedOrder(null);
                    }}
                  >
                    {selectedRider === rider.id && (
                      <InfoWindow onCloseClick={() => setSelectedRider(null)}>
                        <div className="text-xs max-w-[200px]">
                          <p className="font-bold">{rider.name}</p>
                          <p className="text-gray-600">
                            {rider.status} · {rider.activeOrdersCount} active
                          </p>
                        </div>
                      </InfoWindow>
                    )}
                  </Marker>
                );
              })}

            {showOrders &&
              orders.map((order) => {
                if (order.status === "delivered") return null;
                const pOk = isValidCoord(order.pickupLocation.lat, order.pickupLocation.lng);
                const dOk = isValidCoord(order.dropLocation.lat, order.dropLocation.lng);
                if (!pOk && !dOk) return null;
                const isSelected = selectedOrder === order.id;

                return (
                  <React.Fragment key={order.id}>
                    {pOk && (
                      <Marker
                        position={{ lat: order.pickupLocation.lat, lng: order.pickupLocation.lng }}
                        label={{ text: "P", color: "#111827", fontSize: "10px", fontWeight: "bold" }}
                        icon={circleIcon("#FFFFFF", isSelected ? "#EA580C" : "#6B7280", 6)}
                        onClick={() => {
                          setSelectedOrder(order.id === selectedOrder ? null : order.id);
                          setSelectedRider(null);
                        }}
                      />
                    )}
                    {dOk && (
                      <Marker
                        position={{ lat: order.dropLocation.lat, lng: order.dropLocation.lng }}
                        label={{ text: "D", color: "#FFFFFF", fontSize: "10px", fontWeight: "bold" }}
                        icon={circleIcon("#F97316", "#FFFFFF", 7)}
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
                const order = orders.find((o) => o.id === selectedOrder);
                if (!order || order.status === "delivered") return null;
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
                      <p className="mt-1 text-gray-600">
                        <span className="font-semibold">Pickup:</span> {order.pickupLocation.address || "—"}
                      </p>
                      <p className="mt-1 text-gray-600">
                        <span className="font-semibold">Drop:</span> {order.dropLocation.address || "—"}
                      </p>
                    </div>
                  </InfoWindow>
                );
              })()}
          </GoogleMap>
        )}

        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-50 pointer-events-none">
            <div className="animate-pulse flex flex-col items-center">
              <Map size={48} className="text-gray-300 mb-2" />
              <span className="text-gray-500 font-medium">Loading map data…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
