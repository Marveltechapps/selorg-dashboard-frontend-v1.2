import React from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import type { Rider, Order } from './types';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env
  ?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
};

interface RiderOverviewMapProps {
  riders: Rider[];
  orders: Order[];
}

export function RiderOverviewMap({ riders, orders }: RiderOverviewMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'rider-overview-map',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
  });

  // Prefer riders with valid coordinates (coming from the mobile app backend)
  const ridersWithLocation = riders.filter(
    (r) =>
      r.location &&
      typeof r.location.lat === 'number' &&
      typeof r.location.lng === 'number'
  );

  // Fallback center if no live coordinates available (Chennai region)
  const defaultCenter = ridersWithLocation.length
    ? {
        lat: ridersWithLocation[0].location!.lat,
        lng: ridersWithLocation[0].location!.lng,
      }
    : { lat: 13.0827, lng: 80.2707 };

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

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={13}
      options={{
        disableDefaultUI: true,
        clickableIcons: false,
        styles: [
          {
            featureType: 'poi',
            stylers: [{ visibility: 'off' }],
          },
        ],
      }}
    >
      {ridersWithLocation.map((rider) => {
        const isBusy = rider.status === 'busy';
        const isIdle = rider.status === 'idle' || rider.status === 'online';

        const label =
          (orders.find((o) => o.riderId === rider.id)?.id as string | undefined) ||
          rider.name ||
          rider.id;

        return (
          <Marker
            key={rider.id}
            position={{
              lat: rider.location!.lat,
              lng: rider.location!.lng,
            }}
            label={{
              text: label,
              fontSize: '10px',
              className: 'font-bold',
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: isBusy ? '#F97316' : isIdle ? '#22C55E' : '#9CA3AF',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            }}
          />
        );
      })}
    </GoogleMap>
  );
}

