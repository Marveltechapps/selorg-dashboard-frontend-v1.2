import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Warehouse, createWarehouse, updateWarehouse, fetchManagers, fetchCities, fetchZones } from '../storeWarehouseApi';
import { toast } from 'sonner';

interface AddWarehouseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editWarehouse: Warehouse | null;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultHours = () =>
  DAYS.reduce(
    (acc, day) => ({
      ...acc,
      [day]: { open: day === 'Sunday' ? '07:00' : '06:00', close: day === 'Sunday' ? '22:00' : '23:00', isOpen: true },
    }),
    {} as Record<string, { open: string; close: string; isOpen: boolean }>
  );

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
  const [status, setStatus] = useState<'active' | 'inactive' | 'offline' | 'maintenance'>('active');
  const [managerId, setManagerId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [legacyX, setLegacyX] = useState('');
  const [legacyY, setLegacyY] = useState('');
  const [zonesCsv, setZonesCsv] = useState('');
  const [metadataJson, setMetadataJson] = useState('');
  const [operationalHours, setOperationalHours] = useState(defaultHours);
  const [submitting, setSubmitting] = useState(false);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);

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
    if (!open) return;
    if (editWarehouse) {
      setCode(editWarehouse.code);
      setName(editWarehouse.name);
      setAddress(editWarehouse.address);
      setStorageCapacity(editWarehouse.storageCapacity?.toString() ?? '1000');
      setCurrentLoad(String(editWarehouse.currentLoad ?? 0));
      setLatitude(editWarehouse.latitude != null ? String(editWarehouse.latitude) : '');
      setLongitude(editWarehouse.longitude != null ? String(editWarehouse.longitude) : '');
      setDeliveryRadius(String(editWarehouse.deliveryRadius ?? 5));
      setServiceStatus((editWarehouse.serviceStatus ?? 'Full') as 'Full' | 'Partial' | 'None');
      setStatus((editWarehouse.status as any) ?? 'active');
      setManagerId(editWarehouse.managerId ?? '');
      setCityId(editWarehouse.cityId ?? '');
      setZoneId(editWarehouse.zoneId ?? '');
      setPhone(editWarehouse.phone ?? '');
      setEmail(editWarehouse.email ?? '');
      setLegacyX(editWarehouse.x != null ? String(editWarehouse.x) : '');
      setLegacyY(editWarehouse.y != null ? String(editWarehouse.y) : '');
      setZonesCsv(Array.isArray(editWarehouse.zones) ? editWarehouse.zones.join(', ') : '');
      setMetadataJson(
        editWarehouse.metadata != null && Object.keys(editWarehouse.metadata as object).length
          ? JSON.stringify(editWarehouse.metadata, null, 2)
          : ''
      );
      const existingHours = editWarehouse.operationalHours ?? {};
      const normalized: Record<string, { open: string; close: string; isOpen: boolean }> = {};
      DAYS.forEach((day) => {
        const source = (existingHours as any)[day] ?? (existingHours as any)[day.toLowerCase()];
        normalized[day] = source ?? defaultHours()[day];
      });
      setOperationalHours(normalized);
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
      setStatus('active');
      setManagerId('');
      setCityId('');
      setZoneId('');
      setPhone('');
      setEmail('');
      setLegacyX('');
      setLegacyY('');
      setZonesCsv('');
      setMetadataJson('');
      setOperationalHours(defaultHours());
    }
  }, [open, editWarehouse]);

  const handleHourChange = (day: string, field: 'open' | 'close' | 'isOpen', value: any) => {
    setOperationalHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

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
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Please enter a valid email');
      return;
    }

    let metadata: Record<string, unknown> | null | undefined = undefined;
    if (metadataJson.trim()) {
      try {
        const parsed = JSON.parse(metadataJson);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          toast.error('Metadata must be a JSON object');
          return;
        }
        metadata = parsed;
      } catch {
        toast.error('Metadata must be valid JSON');
        return;
      }
    } else if (editWarehouse != null && editWarehouse.metadata != null) {
      metadata = null;
    }

    const zoneTags = zonesCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const lx = legacyX.trim() ? Number(legacyX) : undefined;
    const ly = legacyY.trim() ? Number(legacyY) : undefined;
    if (legacyX.trim() && !Number.isFinite(lx as number)) {
      toast.error('Legacy X must be a number');
      return;
    }
    if (legacyY.trim() && !Number.isFinite(ly as number)) {
      toast.error('Legacy Y must be a number');
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
        status,
        managerId: managerId || undefined,
        operationalHours,
        phone: phone.trim(),
        email: email.trim(),
        zones: zoneTags,
        ...(metadata !== undefined ? { metadata } : {}),
        ...(lx !== undefined ? { x: lx } : {}),
        ...(ly !== undefined ? { y: ly } : {}),
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
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{editWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <Tabs defaultValue="main" className="flex-1 flex flex-col min-h-0 px-6">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="main">Details</TabsTrigger>
              <TabsTrigger value="hours">Hours</TabsTrigger>
              <TabsTrigger value="extra">Advanced</TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-1 max-h-[52vh] pr-2 mt-3">
              <TabsContent value="main" className="space-y-3 mt-0 pb-4">
                <div className="space-y-2">
                  <Label>Code *</Label>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WH-BLR-001" disabled={!!editWarehouse} />
                </div>
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>City *</Label>
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
                  <Input type="number" value={storageCapacity} onChange={(e) => setStorageCapacity(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Current load</Label>
                    <Input type="number" value={currentLoad} onChange={(e) => setCurrentLoad(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery radius (km)</Label>
                    <Input type="number" value={deliveryRadius} onChange={(e) => setDeliveryRadius(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Latitude *</Label>
                    <Input type="number" step="0.0001" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude *</Label>
                    <Input type="number" step="0.0001" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                    <Label>Status</Label>
                    <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Manager</Label>
                  <Select value={managerId || '_none'} onValueChange={(v) => setManagerId(v === '_none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Manager" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {managers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="hours" className="space-y-2 mt-0 pb-4">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-2 p-2 bg-muted/40 rounded-md">
                    <Switch
                      checked={operationalHours[day].isOpen}
                      onCheckedChange={(c) => handleHourChange(day, 'isOpen', c)}
                    />
                    <span className="w-24 text-sm">{day}</span>
                    {operationalHours[day].isOpen ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input type="time" className="w-28" value={operationalHours[day].open} onChange={(e) => handleHourChange(day, 'open', e.target.value)} />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input type="time" className="w-28" value={operationalHours[day].close} onChange={(e) => handleHourChange(day, 'close', e.target.value)} />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Closed</span>
                    )}
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="extra" className="space-y-3 mt-0 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Legacy X</Label>
                    <Input type="number" step="any" value={legacyX} onChange={(e) => setLegacyX(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Legacy Y</Label>
                    <Input type="number" step="any" value={legacyY} onChange={(e) => setLegacyY(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Legacy zone tags (comma-separated)</Label>
                  <Input value={zonesCsv} onChange={(e) => setZonesCsv(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Metadata (JSON)</Label>
                  <Textarea className="font-mono text-xs" rows={5} value={metadataJson} onChange={(e) => setMetadataJson(e.target.value)} placeholder="{}" />
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
          <div className="flex justify-end gap-2 px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : editWarehouse ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
