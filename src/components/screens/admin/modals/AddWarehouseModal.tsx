import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Warehouse, createWarehouse, updateWarehouse, fetchManagers } from '../storeWarehouseApi';
import { fetchCities } from '../storeWarehouseApi';
import { fetchZones } from '../storeWarehouseApi';
import { toast } from 'sonner';

interface AddWarehouseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editWarehouse: Warehouse | null;
}

export function AddWarehouseModal({ open, onOpenChange, onSuccess, editWarehouse }: AddWarehouseModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [cityId, setCityId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [storageCapacity, setStorageCapacity] = useState('1000');
  const [currentLoad, setCurrentLoad] = useState('0');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState('5');
  const [serviceStatus, setServiceStatus] = useState<'Full' | 'Partial' | 'None'>('Full');
  const [managerId, setManagerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  const DEFAULT_HOURS = {
    Monday: { open: '06:00', close: '23:00', isOpen: true },
    Tuesday: { open: '06:00', close: '23:00', isOpen: true },
    Wednesday: { open: '06:00', close: '23:00', isOpen: true },
    Thursday: { open: '06:00', close: '23:00', isOpen: true },
    Friday: { open: '06:00', close: '23:00', isOpen: true },
    Saturday: { open: '06:00', close: '23:00', isOpen: true },
    Sunday: { open: '07:00', close: '22:00', isOpen: true },
  };

  useEffect(() => {
    if (open) {
      fetchCities().then((c) => setCities((c as any[]).map((x: any) => ({ id: x.id ?? x._id, name: x.name })))).catch(() => {});
      fetchManagers().then((m) => setManagers((m as any[]).map((x: any) => ({ id: x.id, name: x.name })))).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (cityId) {
      fetchZones(cityId).then((z) => setZones((z as any[]).map((x: any) => ({ id: x.id ?? x._id, name: x.name })))).catch(() => setZones([]));
    } else setZones([]);
  }, [cityId]);

  useEffect(() => {
    if (open) {
      if (editWarehouse) {
        setCode(editWarehouse.code);
        setName(editWarehouse.name);
        setAddress(editWarehouse.address);
        setStorageCapacity(editWarehouse.storageCapacity?.toString() ?? '1000');
        setCurrentLoad(String((editWarehouse as any).currentLoad ?? 0));
        setLatitude(String((editWarehouse as any).latitude ?? ''));
        setLongitude(String((editWarehouse as any).longitude ?? ''));
        setDeliveryRadius(String((editWarehouse as any).deliveryRadius ?? 5));
        setServiceStatus(((editWarehouse as any).serviceStatus ?? 'Full') as 'Full' | 'Partial' | 'None');
        setManagerId((editWarehouse as any).managerId ?? '');
        setCityId((editWarehouse as any).cityId ?? '');
        setZoneId((editWarehouse as any).zoneId ?? '');
      } else {
        setCode('');
        setName('');
        setAddress('');
        setStorageCapacity('1000');
        setCurrentLoad('0');
        setLatitude('');
        setLongitude('');
        setDeliveryRadius('5');
        setServiceStatus('Full');
        setManagerId('');
        setCityId('');
        setZoneId('');
      }
    }
  }, [open, editWarehouse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !address.trim() || !cityId) {
      toast.error('Code, name, address and city are required');
      return;
    }
    if (!/^[A-Z0-9-]{1,20}$/.test(code.trim().toUpperCase())) {
      toast.error('Code must be uppercase alphanumeric with hyphens only (max 20 chars)');
      return;
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const capacity = Number(storageCapacity) || 0;
    const load = Number(currentLoad) || 0;
    const radius = Number(deliveryRadius) || 0;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      toast.error('Latitude must be between -90 and 90');
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      toast.error('Longitude must be between -180 and 180');
      return;
    }
    if (load < 0 || load > capacity) {
      toast.error('Current load must be between 0 and storage capacity');
      return;
    }
    if (radius < 1 || radius > 100) {
      toast.error('Delivery radius must be between 1 and 100');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        address: address.trim(),
        cityId,
        zoneId: zoneId || undefined,
        storageCapacity: capacity || 1000,
        currentLoad: load,
        latitude: lat,
        longitude: lng,
        deliveryRadius: radius,
        serviceStatus,
        managerId: managerId || undefined,
        operationalHours: DEFAULT_HOURS,
      };
      if (editWarehouse) {
        await updateWarehouse(editWarehouse.id, payload);
        toast.success('Warehouse updated');
      } else {
        await createWarehouse(payload);
        toast.success('Warehouse created');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{editWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label>Code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. WH-BLR-001" disabled={!!editWarehouse} />
          </div>
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Warehouse name" />
          </div>
          <div className="space-y-2">
            <Label>Address *</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Select value={cityId} onValueChange={(v) => { setCityId(v); setZoneId(''); }}>
              <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Zone</Label>
            <Select value={zoneId} onValueChange={setZoneId} disabled={!cityId}>
              <SelectTrigger><SelectValue placeholder={cityId ? 'Select zone' : 'Select city first'} /></SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Storage capacity</Label>
            <Input type="number" value={storageCapacity} onChange={(e) => setStorageCapacity(e.target.value)} placeholder="1000" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current load</Label>
              <Input type="number" value={currentLoad} onChange={(e) => setCurrentLoad(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Delivery radius (km)</Label>
              <Input type="number" value={deliveryRadius} onChange={(e) => setDeliveryRadius(e.target.value)} placeholder="5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Latitude *</Label>
              <Input type="number" step="0.0001" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="12.9716" />
            </div>
            <div className="space-y-2">
              <Label>Longitude *</Label>
              <Input type="number" step="0.0001" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="77.5946" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Service status</Label>
              <Select value={serviceStatus} onValueChange={(v: 'Full' | 'Partial' | 'None') => setServiceStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full">Full</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="None">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Manager</Label>
              <Select value={managerId || '_none'} onValueChange={(v) => setManagerId(v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : editWarehouse ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
