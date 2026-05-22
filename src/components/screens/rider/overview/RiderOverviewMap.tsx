import React, { useMemo } from 'react';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import type { Rider, Order } from './types';
import { GOOGLE_MAPS_LOADER_ID } from '../../../../utils/googleMapsLoader';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as
  | string
  | undefined;

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
};

function isValidCoord(lat?: number, lng?: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

interface RiderOverviewMapProps {
  riders: Rider[];
  orders: Order[];
}

export function RiderOverviewMap({ riders, orders }: RiderOverviewMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
  });

  const ridersWithLocation = riders.filter((r) =>
    isValidCoord(r.location?.lat, r.location?.lng)
  );

  const activeOrdersWithDrop = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status !== 'delivered' &&
          o.status !== 'cancelled' &&
          isValidCoord(o.coordinates?.lat, o.coordinates?.lng)
      ),
    [orders]
  );

  const defaultCenter = useMemo(() => {
    if (ridersWithLocation.length) {
      return {
        lat: ridersWithLocation[0].location!.lat,
        lng: ridersWithLocation[0].location!.lng,
      };
    }
    const firstDrop = activeOrdersWithDrop[0]?.coordinates;
    if (firstDrop && isValidCoord(firstDrop.lat, firstDrop.lng)) {
      return { lat: firstDrop.lat, lng: firstDrop.lng };
    }
    return { lat: 13.0827, lng: 80.2707 };
  }, [ridersWithLocation, activeOrdersWithDrop]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex items-center justify-center w-full h-full text-xs text-[#757575]">
        Google Maps API key missing
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center w-full h-full text-xs text-[#757575]">
        Loading live map…
      </div>
    );
  }

  const circleIcon = (fillColor: string) => {
    const g = (globalThis as typeof globalThis & { google?: typeof google }).google;
    if (!g?.maps?.SymbolPath) return undefined;
    return {
      path: g.maps.SymbolPath.CIRCLE,
      scale: 6,
      fillColor,
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
    } as google.maps.Symbol;
  };

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={13}
      options={{
        disableDefaultUI: true,
        clickableIcons: false,
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
      }}
    >
      {activeOrdersWithDrop.map((order) => {
        const rider = order.riderId
          ? ridersWithLocation.find((r) => r.id === order.riderId)
          : undefined;
        const drop = order.coordinates!;
        if (rider && isValidCoord(rider.location?.lat, rider.location?.lng)) {
          return (
            <Polyline
              key={`trail-${order.id}`}
              path={[
                { lat: rider.location!.lat, lng: rider.location!.lng },
                { lat: drop.lat, lng: drop.lng },
              ]}
              options={{
                strokeColor: '#F97316',
                strokeOpacity: 0.65,
                strokeWeight: 2,
                geodesic: true,
              }}
            />
          );
        }
        return null;
      })}

      {activeOrdersWithDrop.map((order) => (
        <Marker
          key={`drop-${order.id}`}
          position={{ lat: order.coordinates!.lat, lng: order.coordinates!.lng }}
          label={{ text: 'D', color: '#FFFFFF', fontSize: '9px', fontWeight: 'bold' }}
          icon={circleIcon('#F97316')}
        />
      ))}

      {ridersWithLocation.map((rider) => {
        const isBusy = rider.status === 'busy';
        const isIdle = rider.status === 'idle' || rider.status === 'online';

        return (
          <Marker
            key={rider.id}
            position={{
              lat: rider.location!.lat,
              lng: rider.location!.lng,
            }}
            icon={circleIcon(isBusy ? '#F97316' : isIdle ? '#22C55E' : '#9CA3AF')}
          />
        );
      })}
    </GoogleMap>
  );
}
