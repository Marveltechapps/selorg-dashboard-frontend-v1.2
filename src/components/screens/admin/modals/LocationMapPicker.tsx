import React, { useCallback, useEffect, useRef } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER_ID } from '@/utils/googleMapsLoader';
import { cn } from '@/lib/utils';

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

function parsePosition(latStr: string, lngStr: string): google.maps.LatLngLiteral | null {
  const lat = parseFloat(String(latStr).trim());
  const lng = parseFloat(String(lngStr).trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export interface LocationMapPickerProps {
  latitude: string;
  longitude: string;
  onPositionChange: (lat: string, lng: string) => void;
  className?: string;
  /** CSS height e.g. "220px" */
  height?: string;
}

/**
 * Click map or drag marker to set coordinates; updating lat/lng in the form moves the marker in real time.
 * Requires VITE_GOOGLE_MAPS_API_KEY. Map interactions only mutate local form state until the parent saves.
 */
export function LocationMapPicker({
  latitude,
  longitude,
  onPositionChange,
  className,
  height = '220px',
}: LocationMapPickerProps) {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: apiKey || ' ',
  });

  const position = parsePosition(latitude, longitude);
  const center = position ?? DEFAULT_CENTER;

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;
    map.panTo(position);
  }, [position?.lat, position?.lng]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    onPositionChange(String(e.latLng.lat()), String(e.latLng.lng()));
  };

  const handleDragEnd = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    onPositionChange(String(e.latLng.lat()), String(e.latLng.lng()));
  };

  if (!apiKey) {
    return (
      <div
        className={cn(
          'rounded-lg border border-[#e4e4e7] bg-[#fafafa] flex items-center justify-center text-center text-xs text-[#71717a] px-3',
          className,
        )}
        style={{ height }}
      >
        Set <span className="mx-1 font-mono text-[11px]">VITE_GOOGLE_MAPS_API_KEY</span> to load the live map.
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className={cn('rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs p-3', className)}
        style={{ height }}
      >
        Could not load Google Maps. Check the API key and allowed referrers.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={cn('rounded-lg border border-[#e4e4e7] bg-white flex items-center justify-center text-sm text-[#71717a]', className)}
        style={{ height }}
      >
        Loading map…
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg overflow-hidden border border-[#e4e4e7]', className)}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height }}
        center={center}
        zoom={position ? 16 : 11}
        onLoad={onMapLoad}
        onClick={handleMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
        }}
      >
        {position ? (
          <Marker position={position} draggable onDragEnd={handleDragEnd} />
        ) : null}
      </GoogleMap>
      <p className="text-[11px] text-[#71717a] px-2 py-1.5 bg-[#fafafa] border-t border-[#e4e4e7]">
        Click the map to drop a pin, or drag the pin. Coordinates update the fields above automatically.
      </p>
    </div>
  );
}
