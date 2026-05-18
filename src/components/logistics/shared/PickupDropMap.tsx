import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { LogisticsLocation } from '@/types/logistics';
import 'leaflet/dist/leaflet.css';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export function PickupDropMap({ pickup, drop }: { pickup: LogisticsLocation; drop: LogisticsLocation }) {
  const center = useMemo<[number, number]>(
    () => [(pickup.lat + drop.lat) / 2, (pickup.lng + drop.lng) / 2],
    [pickup.lat, pickup.lng, drop.lat, drop.lng]
  );
  return (
    <div className="h-72 w-full overflow-hidden rounded-xl border border-slate-200">
      <MapContainer center={center} zoom={11} scrollWheelZoom className="h-full w-full z-0">
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[pickup.lat, pickup.lng]}>
          <Popup>Pickup — {pickup.name}</Popup>
        </Marker>
        <Marker position={[drop.lat, drop.lng]}>
          <Popup>Drop — {drop.name}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
