import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { GoogleMap, Marker, Polygon, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER_ID } from '@/utils/googleMapsLoader';
import { MUMBAI_MAP_CENTER } from './geofenceUtils';
import type { Store, Zone } from './types';
import type { HeatmapMetric, PromoHeatmapRow } from './geofenceApi';
import { cn } from '@/lib/utils';

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const GOOGLE_MAPS_API_KEY = (import.meta as { env?: { VITE_GOOGLE_MAPS_API_KEY?: string } }).env?.VITE_GOOGLE_MAPS_API_KEY;

export interface GeofenceMapProps {
  zones: Zone[];
  stores: Store[];
  onZoneClick: (zone: Zone) => void;
  onStoreClick: (store: Store) => void;
  isDrawing?: boolean;
  drawingPolygon?: { lat: number; lng: number }[];
  onMapClick?: (lat: number, lng: number) => void;
  showHeatmap?: boolean;
  heatmapRows?: PromoHeatmapRow[];
  heatmapMetric?: HeatmapMetric;
  focusedZoneId?: string | null;
  className?: string;
}

function zonePolygon(zone: Zone): { lat: number; lng: number }[] {
  return (zone as Zone & { polygon?: { lat: number; lng: number }[] }).polygon ?? [];
}

function heatmapValue(row: PromoHeatmapRow, metric: HeatmapMetric): number {
  if (metric === 'revenue') return row.revenue;
  if (metric === 'redemptions') return row.redemptions;
  return row.orders;
}

function heatmapOpacityForRow(row: PromoHeatmapRow | undefined, metric: HeatmapMetric, max: number): number {
  if (!row || max <= 0) return 0.25;
  const v = heatmapValue(row, metric);
  if (v <= 0) return 0.2;
  return Math.min(0.75, 0.2 + (v / max) * 0.55);
}

export function GeofenceMap({
  zones,
  stores,
  onZoneClick,
  onStoreClick,
  isDrawing = false,
  drawingPolygon = [],
  onMapClick,
  showHeatmap = false,
  heatmapRows = [],
  heatmapMetric = 'revenue',
  focusedZoneId = null,
  className,
}: GeofenceMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const hasKey = Boolean(GOOGLE_MAPS_API_KEY?.trim());

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
  });

  const zonesOnMap = useMemo(() => {
    const visible = zones.filter((z) => z.isVisible && zonePolygon(z).length >= 3);
    if (!focusedZoneId) return visible;
    const focused = zones.find((z) => z.id === focusedZoneId);
    if (!focused || zonePolygon(focused).length < 3) return visible;
    if (visible.some((z) => z.id === focusedZoneId)) return visible;
    return [...visible, focused];
  }, [zones, focusedZoneId]);

  const heatmapByZoneId = useMemo(
    () => Object.fromEntries(heatmapRows.map((r) => [r.zoneId, r])),
    [heatmapRows],
  );

  const heatmapMax = useMemo(() => {
    const values = heatmapRows.map((r) => heatmapValue(r, heatmapMetric));
    return Math.max(...values, 1);
  }, [heatmapRows, heatmapMetric]);

  const fitBounds = useCallback(() => {
    if (!mapRef.current || typeof google === 'undefined') return;
    const bounds = new google.maps.LatLngBounds();
    let hasPoint = false;
    zonesOnMap.forEach((z) => {
      zonePolygon(z).forEach((p) => {
        bounds.extend(p);
        hasPoint = true;
      });
    });
    stores.forEach((s) => {
      const lat = (s as Store & { latitude?: number }).latitude;
      const lng = (s as Store & { longitude?: number }).longitude;
      if (lat != null && lng != null) {
        bounds.extend({ lat, lng });
        hasPoint = true;
      }
    });
    if (hasPoint) mapRef.current.fitBounds(bounds, 48);
  }, [zonesOnMap, stores]);

  const panToZone = useCallback((zoneId: string) => {
    if (!mapRef.current || typeof google === 'undefined') return;
    const zone = zones.find((z) => z.id === zoneId);
    const poly = zone ? zonePolygon(zone) : [];
    if (poly.length < 3) return;
    const bounds = new google.maps.LatLngBounds();
    poly.forEach((p) => bounds.extend(p));
    mapRef.current.fitBounds(bounds, 72);
  }, [zones]);

  useEffect(() => {
    if (!focusedZoneId || !isLoaded) return;
    panToZone(focusedZoneId);
  }, [focusedZoneId, isLoaded, panToZone]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setTimeout(fitBounds, 100);
  }, [fitBounds]);

  if (!hasKey) {
    return (
      <div className={cn('flex h-full items-center justify-center bg-gray-100 p-6 text-center', className)}>
        <p className="text-sm text-gray-600">
          Set <span className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</span> in your environment to load the live map.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={cn('flex h-full items-center justify-center bg-red-50 p-6 text-center text-sm text-red-700', className)}>
        Failed to load Google Maps. Check your API key and billing.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={cn('flex h-full items-center justify-center bg-gray-100', className)}>
        <p className="text-sm text-gray-500">Loading map…</p>
      </div>
    );
  }

  return (
    <div className={cn('relative h-full w-full', className, isDrawing && 'cursor-crosshair')}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={MUMBAI_MAP_CENTER}
        zoom={11}
        onLoad={onLoad}
        onClick={(e) => {
          if (!isDrawing || !onMapClick || !e.latLng) return;
          onMapClick(e.latLng.lat(), e.latLng.lng());
        }}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {zonesOnMap.map((zone) => {
          const poly = zonePolygon(zone);
          if (poly.length < 3) return null;
          const isFocused = zone.id === focusedZoneId;
          const heatRow = heatmapByZoneId[zone.id];
          const fillOpacity = showHeatmap
            ? heatmapOpacityForRow(heatRow, heatmapMetric, heatmapMax)
            : isFocused
              ? 0.35
              : 0.2;
          const intensity = heatRow ? heatmapValue(heatRow, heatmapMetric) / heatmapMax : 0;
          const fillColor = showHeatmap && intensity > 0.65
            ? '#ef4444'
            : zone.color;
          return (
            <Polygon
              key={zone.id}
              paths={poly}
              options={{
                fillColor,
                fillOpacity,
                strokeColor: isFocused ? '#212121' : zone.color,
                strokeWeight: isFocused ? 4 : 2,
                strokeOpacity: isFocused ? 1 : 0.9,
                clickable: true,
                zIndex: isFocused ? 2 : 1,
              }}
              onClick={() => onZoneClick(zone)}
            />
          );
        })}

        {isDrawing && drawingPolygon.length >= 2 && (
          <Polygon
            paths={drawingPolygon}
            options={{
              fillColor: '#212121',
              fillOpacity: 0.15,
              strokeColor: '#212121',
              strokeWeight: 2,
            }}
          />
        )}

        {isDrawing && drawingPolygon.map((p, i) => (
          <Marker
            key={`draw-${i}`}
            position={p}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 5,
              fillColor: '#212121',
              fillOpacity: 1,
              strokeWeight: 1,
              strokeColor: '#fff',
            }}
          />
        ))}

        {stores.map((store) => {
          const lat = (store as Store & { latitude?: number }).latitude;
          const lng = (store as Store & { longitude?: number }).longitude;
          if (lat == null || lng == null) return null;
          return (
            <Marker
              key={store.id}
              position={{ lat, lng }}
              title={store.name}
              onClick={() => onStoreClick(store)}
            />
          );
        })}
      </GoogleMap>
    </div>
  );
}
