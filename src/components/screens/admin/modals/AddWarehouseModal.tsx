import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Warehouse, createWarehouse, updateWarehouse } from '../storeWarehouseApi';
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
  const [submitting, setSubmitting] = useState(false);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (open) {
      fetchCities().then((c) => setCities((c as any[]).map((x: any) => ({ id: x.id ?? x._id, name: x.name })))).catch(() => {});
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
        setCityId((editWarehouse as any).cityId ?? '');
        setZoneId((editWarehouse as any).zoneId ?? '');
      } else {
        setCode('');
        setName('');
        setAddress('');
        setStorageCapacity('1000');
        setCityId('');
        setZoneId('');
      }
    }
  }, [open, editWarehouse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !address.trim()) {
      toast.error('Code, name and address are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code: code.trim(),
        name: name.trim(),
        address: address.trim(),
        cityId: cityId || undefined,
        zoneId: zoneId || undefined,
        storageCapacity: Number(storageCapacity) || 1000,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. WH-BLR-001" disabled={!!editWarehouse} />
          </div>
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Warehouse name" />
          </div>
          <div>
            <Label>Address *</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
          </div>
          <div>
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
          <div>
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
          <div>
            <Label>Storage capacity</Label>
            <Input type="number" value={storageCapacity} onChange={(e) => setStorageCapacity(e.target.value)} placeholder="1000" />
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
