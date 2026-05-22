import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { FleetLiveMap } from './FleetLiveMap';
import {
  buildFleetOrdersFromOverview,
  fetchFleetMapData,
  mergeFleetOrders,
  mergeFleetRiders,
  type FleetMapOrder,
  type FleetMapRider,
} from './fleetMapApi';
import type { Order, Rider } from './types';
import { toast } from 'sonner';

interface RiderMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  riders: Rider[];
  orders: Order[];
}

const POLL_MS = 20_000;

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
};

const panelStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  maxWidth: '56rem',
  height: 'min(85vh, 720px)',
  maxHeight: 'calc(100vh - 2rem)',
  overflow: 'hidden',
};

const mapBodyStyle: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  minHeight: 0,
};

const mapFillStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
};

export function RiderMapModal({ isOpen, onClose, riders, orders }: RiderMapModalProps) {
  const [mapRiders, setMapRiders] = useState<FleetMapRider[]>([]);
  const [mapOrders, setMapOrders] = useState<FleetMapOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMapData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchFleetMapData();
      setMapRiders(mergeFleetRiders(data.riders, riders));
      setMapOrders(mergeFleetOrders(data.orders, orders));
    } catch (err) {
      console.error('[RiderMapModal] load failed', err);
      toast.error('Failed to load live map data', {
        description: err instanceof Error ? err.message : 'Check backend connection',
      });
      setMapRiders(mergeFleetRiders([], riders));
      setMapOrders(buildFleetOrdersFromOverview(orders));
    } finally {
      setLoading(false);
    }
  }, [riders, orders]);

  useEffect(() => {
    if (!isOpen) return;
    loadMapData();
    const interval = setInterval(loadMapData, POLL_MS);
    return () => clearInterval(interval);
  }, [isOpen, loadMapData]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-fleet-map-title"
      onClick={onClose}
    >
      <div
        className="rounded-xl border border-[#E0E0E0] bg-white shadow-2xl"
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-[#E0E0E0] bg-white px-6 py-4 pr-14">
          <h2 id="live-fleet-map-title" className="text-lg font-semibold text-[#212121]">
            Live Fleet Map
          </h2>
          <p className="mt-1 text-sm text-[#757575]">
            Real-time rider positions and active order pickup → drop routes from the database.
          </p>
        </header>

        <div style={mapBodyStyle}>
          <div style={mapFillStyle}>
            <FleetLiveMap riders={mapRiders} orders={mapOrders} loading={loading} className="h-full" />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-md p-1.5 text-[#757575] hover:bg-[#F5F5F5] hover:text-[#212121]"
          style={{ zIndex: 10 }}
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
    </div>,
    document.body
  );
}
