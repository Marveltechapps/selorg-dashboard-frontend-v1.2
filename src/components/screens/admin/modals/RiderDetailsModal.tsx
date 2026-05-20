import React, { useState } from 'react';
import { AdminModal } from './AdminModal';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Rider, updateRiderStatus } from '../masterDataApi';
import { toast } from 'sonner';

interface RiderDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rider: Rider | null;
  onStatusUpdate: () => void;
}

export function RiderDetailsModal({ open, onOpenChange, rider, onStatusUpdate }: RiderDetailsModalProps) {
  const [status, setStatus] = useState(rider?.status ?? '');
  const [availability, setAvailability] = useState(rider?.availability ?? '');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (rider) {
      setStatus(rider.status);
      setAvailability(rider.availability);
    }
  }, [rider]);

  const handleSave = async () => {
    if (!rider) return;
    setSubmitting(true);
    try {
      await updateRiderStatus(rider.id, { status: status || undefined, availability: availability || undefined });
      toast.success('Rider updated');
      onStatusUpdate();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  if (!rider) return null;

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title="Rider Details"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleSave} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button>
        </>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Rider ID</span>
              <p className="font-mono font-medium">{rider.riderId}</p>
            </div>
            <div>
              <span className="text-gray-500">Name</span>
              <p className="font-medium">{rider.name}</p>
            </div>
            <div>
              <span className="text-gray-500">Phone</span>
              <p>{rider.phone}</p>
            </div>
            <div>
              <span className="text-gray-500">Email</span>
              <p>{rider.email ?? '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Vehicle</span>
              <p className="capitalize">{rider.vehicleType}</p>
            </div>
            <div>
              <span className="text-gray-500">City</span>
              <p>{rider.cityName ?? '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Deliveries</span>
              <p>{rider.stats?.totalDeliveries ?? 0}</p>
            </div>
            <div>
              <span className="text-gray-500">Rating</span>
              <p>{rider.stats?.averageRating ?? 0}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-500">Availability</label>
              <Select value={availability} onValueChange={setAvailability}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
      </div>
    </AdminModal>
  );
}
