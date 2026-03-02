import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Store, getStore } from '../storeWarehouseApi';
import { Store as StoreIcon, MapPin, Clock, Phone, Mail, Edit } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

interface StoreDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string | null;
  storePreview?: Store | null;
  onEdit?: (store: Store) => void;
}

export function StoreDetailsModal({
  open,
  onOpenChange,
  storeId,
  storePreview,
  onEdit,
}: StoreDetailsModalProps) {
  const [store, setStore] = useState<Store | null>(storePreview ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && storeId) {
      if (storePreview?.id === storeId) {
        setStore(storePreview);
        return;
      }
      setLoading(true);
      getStore(storeId)
        .then(setStore)
        .catch((err) => {
          toast.error(err?.message ?? 'Failed to load store details');
          onOpenChange(false);
        })
        .finally(() => setLoading(false));
    } else if (!open) {
      setStore(null);
    }
  }, [open, storeId, storePreview?.id]);

  const handleEdit = () => {
    if (store && onEdit) {
      onOpenChange(false);
      onEdit(store);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <StoreIcon className="text-blue-600" size={20} />
              </div>
              <div>
                <DialogTitle>
                  {loading ? 'Loading...' : store?.name ?? 'Store Details'}
                </DialogTitle>
                <DialogDescription>
                  {store ? `${store.code} • ${store.type}` : 'View store information'}
                </DialogDescription>
              </div>
            </div>
            {store && onEdit && (
              <Button variant="outline" size="sm" onClick={handleEdit} className="gap-2">
                <Edit size={14} /> Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : store ? (
          <div className="space-y-6 pt-2">
            {/* Status & Type */}
            <div className="flex gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${
                  store.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : store.status === 'offline'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                }`}
              >
                {store.status}
              </span>
              <span className="inline-flex px-2.5 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {store.type}
              </span>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium text-[#18181b]">
                <MapPin size={14} className="text-[#71717a]" /> Address
              </div>
              <p className="text-sm text-[#52525b] pl-6">
                {store.address}
                <br />
                {store.city}
                {store.zone && ` • ${store.zone}`}
                {store.state && `, ${store.state}`}
                {store.pincode && ` ${store.pincode}`}
              </p>
              {(store.latitude || store.longitude) && (
                <p className="text-xs text-[#71717a] pl-6">
                  Coordinates: {store.latitude?.toFixed(4)}, {store.longitude?.toFixed(4)}
                </p>
              )}
            </div>

            {/* Contact */}
            {(store.phone || store.email || store.manager) && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-[#18181b]">Contact</div>
                <div className="space-y-1.5 text-sm text-[#52525b]">
                  {store.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-[#71717a]" />
                      {store.phone}
                    </div>
                  )}
                  {store.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-[#71717a]" />
                      {store.email}
                    </div>
                  )}
                  {store.manager && (
                    <div className="flex items-center gap-2">
                      <span className="text-[#71717a]">Manager:</span>
                      {store.manager}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Operations */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#71717a]">Delivery radius</span>
                <p className="font-medium">{store.deliveryRadius} km</p>
              </div>
              <div>
                <span className="text-[#71717a]">Max capacity</span>
                <p className="font-medium">{store.maxCapacity} orders/hr</p>
              </div>
            </div>

            {/* Operational Hours */}
            {store.operationalHours && Object.keys(store.operationalHours).length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-[#18181b]">
                  <Clock size={14} className="text-[#71717a]" /> Operational Hours
                </div>
                <div className="grid gap-1.5 text-sm">
                  {DAYS.map((day) => {
                    const h = store.operationalHours[day];
                    if (!h) return null;
                    const label = day.charAt(0).toUpperCase() + day.slice(1);
                    const text = h.isOpen
                      ? `${h.open} – ${h.close}`
                      : 'Closed';
                    return (
                      <div key={day} className="flex justify-between pl-6">
                        <span className="text-[#71717a]">{label}</span>
                        <span className="text-[#52525b]">{text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
