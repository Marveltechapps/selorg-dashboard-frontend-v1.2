import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Warehouse, createWarehouse, updateWarehouse, fetchManagers, fetchCities, fetchZones } from '../storeWarehouseApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AdminModal } from './AdminModal';

interface AddWarehouseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editWarehouse: Warehouse | null;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CODE_REGEX = /^[A-Z0-9-]{1,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{10,18}$/;

type FieldErrors = Partial<Record<string, string>>;

const defaultHours = () =>
  DAYS.reduce(
    (acc, day) => ({
      ...acc,
      [day]: { open: day === 'Sunday' ? '07:00' : '06:00', close: day === 'Sunday' ? '22:00' : '23:00', isOpen: true },
    }),
    {} as Record<string, { open: string; close: string; isOpen: boolean }>
  );

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

function FieldHint({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-rose-600 mt-1">{error}</p>;
}

export function AddWarehouseModal({ open, onOpenChange, onSuccess, editWarehouse }: AddWarehouseModalProps) {
  const [activeTab, setActiveTab] = useState('main');
  const [errors, setErrors] = useState<FieldErrors>({});
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

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
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
    if (!open) return;
    setErrors({});
    setActiveTab('main');
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

  const handleHourChange = (day: string, field: 'open' | 'close' | 'isOpen', value: string | boolean) => {
    clearError(`hours.${day}`);
    setOperationalHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const validateForm = (): FieldErrors => {
    const next: FieldErrors = {};
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();

    if (!trimmedCode) {
      next.code = 'Warehouse code is required';
    } else if (!CODE_REGEX.test(trimmedCode)) {
      next.code = 'Use uppercase letters, numbers, and hyphens only (max 20 characters)';
    }

    if (!trimmedName) {
      next.name = 'Name is required';
    } else if (trimmedName.length < 2) {
      next.name = 'Name must be at least 2 characters';
    } else if (trimmedName.length > 100) {
      next.name = 'Name must be 100 characters or less';
    }

    if (!trimmedAddress) {
      next.address = 'Address is required';
    } else if (trimmedAddress.length < 5) {
      next.address = 'Address must be at least 5 characters';
    } else if (trimmedAddress.length > 500) {
      next.address = 'Address must be 500 characters or less';
    }

    if (!cityId) {
      next.cityId = 'Please select a city';
    }

    if (zoneId && cityId && !zones.some((z) => z.id === zoneId)) {
      next.zoneId = 'Selected zone is not valid for this city';
    }

    const capacity = Number(storageCapacity);
    if (storageCapacity.trim() === '' || !Number.isFinite(capacity)) {
      next.storageCapacity = 'Storage capacity must be a number';
    } else if (!Number.isInteger(capacity) || capacity < 1) {
      next.storageCapacity = 'Storage capacity must be a whole number of at least 1';
    } else if (capacity > 1_000_000) {
      next.storageCapacity = 'Storage capacity cannot exceed 1,000,000';
    }

    const load = Number(currentLoad);
    if (currentLoad.trim() === '' || !Number.isFinite(load)) {
      next.currentLoad = 'Current load must be a number';
    } else if (!Number.isInteger(load) || load < 0) {
      next.currentLoad = 'Current load must be a whole number of 0 or more';
    } else if (Number.isFinite(capacity) && load > capacity) {
      next.currentLoad = 'Current load cannot exceed storage capacity';
    }

    const radius = Number(deliveryRadius);
    if (deliveryRadius.trim() === '' || !Number.isFinite(radius)) {
      next.deliveryRadius = 'Delivery radius is required';
    } else if (!Number.isInteger(radius) || radius < 1 || radius > 100) {
      next.deliveryRadius = 'Delivery radius must be a whole number between 1 and 100 km';
    }

    if (!latitude.trim()) {
      next.latitude = 'Latitude is required';
    } else {
      const lat = parseFloat(latitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        next.latitude = 'Latitude must be between -90 and 90';
      }
    }

    if (!longitude.trim()) {
      next.longitude = 'Longitude is required';
    } else {
      const lng = parseFloat(longitude);
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        next.longitude = 'Longitude must be between -180 and 180';
      }
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
      next.phone = 'Enter a valid phone number (10–18 digits, may include +, spaces, or dashes)';
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      next.email = 'Enter a valid email address';
    }

    DAYS.forEach((day) => {
      const slot = operationalHours[day];
      if (!slot) {
        next[`hours.${day}`] = 'Hours configuration is missing';
        return;
      }
      if (slot.isOpen) {
        const openMin = timeToMinutes(slot.open);
        const closeMin = timeToMinutes(slot.close);
        if (!Number.isFinite(openMin) || !Number.isFinite(closeMin)) {
          next[`hours.${day}`] = 'Enter valid open and close times';
        } else if (closeMin <= openMin) {
          next[`hours.${day}`] = 'Close time must be after open time';
        }
      }
    });

    if (metadataJson.trim()) {
      try {
        const parsed = JSON.parse(metadataJson);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          next.metadataJson = 'Metadata must be a JSON object';
        }
      } catch {
        next.metadataJson = 'Metadata must be valid JSON';
      }
    }

    if (legacyX.trim()) {
      const lx = Number(legacyX);
      if (!Number.isFinite(lx)) next.legacyX = 'Legacy X must be a number';
    }
    if (legacyY.trim()) {
      const ly = Number(legacyY);
      if (!Number.isFinite(ly)) next.legacyY = 'Legacy Y must be a number';
    }

    return next;
  };

  const tabForField = (field: string): string => {
    if (field.startsWith('hours.')) return 'hours';
    if (['legacyX', 'legacyY', 'zonesCsv', 'metadataJson'].includes(field)) return 'extra';
    return 'main';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstField = Object.keys(validationErrors)[0];
      setActiveTab(tabForField(firstField));
      toast.error(validationErrors[firstField] ?? 'Please fix the highlighted fields');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const capacity = Number(storageCapacity);
    const load = Number(currentLoad);
    const radius = Number(deliveryRadius);

    let metadata: Record<string, unknown> | null | undefined = undefined;
    if (metadataJson.trim()) {
      metadata = JSON.parse(metadataJson) as Record<string, unknown>;
    } else if (editWarehouse != null && editWarehouse.metadata != null) {
      metadata = null;
    }

    const zoneTags = zonesCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const lx = legacyX.trim() ? Number(legacyX) : undefined;
    const ly = legacyY.trim() ? Number(legacyY) : undefined;

    setSubmitting(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        address: address.trim(),
        cityId,
        zoneId: zoneId || undefined,
        storageCapacity: capacity,
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
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    cn(errors[field] && 'border-rose-500 focus-visible:ring-rose-500/30');

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      scrollBody={false}
      title={editWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button type="submit" form="warehouse-form" disabled={submitting}>
            {submitting ? 'Saving...' : editWarehouse ? 'Update' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="warehouse-form" onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                    <div className="shrink-0 px-6 pt-3">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="main">Details</TabsTrigger>
                        <TabsTrigger value="hours">Hours</TabsTrigger>
                        <TabsTrigger value="extra">Advanced</TabsTrigger>
                      </TabsList>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
                      <TabsContent value="main" className="mt-0 block w-full space-y-3 pb-6 pt-1 outline-none data-[state=inactive]:hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="wh-code">Code *</Label>
                            <Input
                              id="wh-code"
                              value={code}
                              onChange={(e) => { clearError('code'); setCode(e.target.value.toUpperCase()); }}
                              placeholder="WH-BLR-001"
                              disabled={!!editWarehouse}
                              className={cn('font-mono', inputClass('code'))}
                              aria-invalid={!!errors.code}
                              maxLength={20}
                            />
                            <FieldHint error={errors.code} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wh-name">Name *</Label>
                            <Input
                              id="wh-name"
                              value={name}
                              onChange={(e) => { clearError('name'); setName(e.target.value); }}
                              placeholder="Central fulfillment hub"
                              className={inputClass('name')}
                              aria-invalid={!!errors.name}
                              maxLength={100}
                            />
                            <FieldHint error={errors.name} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="wh-address">Address *</Label>
                          <Textarea
                            id="wh-address"
                            value={address}
                            onChange={(e) => { clearError('address'); setAddress(e.target.value); }}
                            placeholder="Street, area, landmark"
                            rows={2}
                            className={inputClass('address')}
                            aria-invalid={!!errors.address}
                            maxLength={500}
                          />
                          <FieldHint error={errors.address} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>City *</Label>
                            <Select value={cityId} onValueChange={(v) => { clearError('cityId'); setCityId(v); setZoneId(''); clearError('zoneId'); }}>
                              <SelectTrigger className={inputClass('cityId')} aria-invalid={!!errors.cityId}>
                                <SelectValue placeholder="Select city" />
                              </SelectTrigger>
                              <SelectContent>
                                {cities.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                              </SelectContent>
                            </Select>
                            <FieldHint error={errors.cityId} />
                          </div>
                          <div className="space-y-2">
                            <Label>Zone</Label>
                            <Select value={zoneId} onValueChange={(v) => { clearError('zoneId'); setZoneId(v); }} disabled={!cityId}>
                              <SelectTrigger className={inputClass('zoneId')} aria-invalid={!!errors.zoneId}>
                                <SelectValue placeholder={cityId ? 'Select zone' : 'Select city first'} />
                              </SelectTrigger>
                              <SelectContent>
                                {zones.map((z) => (<SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>))}
                              </SelectContent>
                            </Select>
                            <FieldHint error={errors.zoneId} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="wh-capacity">Storage capacity *</Label>
                            <Input
                              id="wh-capacity"
                              type="number"
                              min={1}
                              step={1}
                              value={storageCapacity}
                              onChange={(e) => { clearError('storageCapacity'); setStorageCapacity(e.target.value); }}
                              className={inputClass('storageCapacity')}
                              aria-invalid={!!errors.storageCapacity}
                            />
                            <FieldHint error={errors.storageCapacity} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wh-load">Current load *</Label>
                            <Input
                              id="wh-load"
                              type="number"
                              min={0}
                              step={1}
                              value={currentLoad}
                              onChange={(e) => { clearError('currentLoad'); setCurrentLoad(e.target.value); }}
                              className={inputClass('currentLoad')}
                              aria-invalid={!!errors.currentLoad}
                            />
                            <FieldHint error={errors.currentLoad} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wh-radius">Delivery radius (km) *</Label>
                            <Input
                              id="wh-radius"
                              type="number"
                              min={1}
                              max={100}
                              step={1}
                              value={deliveryRadius}
                              onChange={(e) => { clearError('deliveryRadius'); setDeliveryRadius(e.target.value); }}
                              className={inputClass('deliveryRadius')}
                              aria-invalid={!!errors.deliveryRadius}
                            />
                            <FieldHint error={errors.deliveryRadius} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="wh-lat">Latitude *</Label>
                            <Input
                              id="wh-lat"
                              type="number"
                              step="0.0001"
                              value={latitude}
                              onChange={(e) => { clearError('latitude'); setLatitude(e.target.value); }}
                              placeholder="12.9716"
                              className={inputClass('latitude')}
                              aria-invalid={!!errors.latitude}
                            />
                            <FieldHint error={errors.latitude} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wh-lng">Longitude *</Label>
                            <Input
                              id="wh-lng"
                              type="number"
                              step="0.0001"
                              value={longitude}
                              onChange={(e) => { clearError('longitude'); setLongitude(e.target.value); }}
                              placeholder="77.5946"
                              className={inputClass('longitude')}
                              aria-invalid={!!errors.longitude}
                            />
                            <FieldHint error={errors.longitude} />
                          </div>
                        </div>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                          Tip: Use Google Maps → right-click a location → coordinates for accurate lat/long.
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                            <Select value={status} onValueChange={(v: typeof status) => setStatus(v)}>
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
                              {managers.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="wh-phone">Phone</Label>
                            <Input
                              id="wh-phone"
                              value={phone}
                              onChange={(e) => { clearError('phone'); setPhone(e.target.value); }}
                              placeholder="+91 98765 43210"
                              className={inputClass('phone')}
                              aria-invalid={!!errors.phone}
                            />
                            <FieldHint error={errors.phone} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wh-email">Email</Label>
                            <Input
                              id="wh-email"
                              type="email"
                              value={email}
                              onChange={(e) => { clearError('email'); setEmail(e.target.value); }}
                              placeholder="warehouse@example.com"
                              className={inputClass('email')}
                              aria-invalid={!!errors.email}
                            />
                            <FieldHint error={errors.email} />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="hours" className="mt-0 block w-full space-y-2 pb-6 pt-1 outline-none data-[state=inactive]:hidden">
                        {DAYS.map((day) => (
                          <div key={day} className="space-y-1">
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                              <Switch
                                checked={operationalHours[day].isOpen}
                                onCheckedChange={(c) => handleHourChange(day, 'isOpen', c)}
                              />
                              <span className="w-24 text-sm">{day}</span>
                              {operationalHours[day].isOpen ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <Input
                                    type="time"
                                    className={cn('w-28', errors[`hours.${day}`] && 'border-rose-500')}
                                    value={operationalHours[day].open}
                                    onChange={(e) => handleHourChange(day, 'open', e.target.value)}
                                  />
                                  <span className="text-xs text-gray-500">to</span>
                                  <Input
                                    type="time"
                                    className={cn('w-28', errors[`hours.${day}`] && 'border-rose-500')}
                                    value={operationalHours[day].close}
                                    onChange={(e) => handleHourChange(day, 'close', e.target.value)}
                                  />
                                </div>
                              ) : (
                                <span className="text-xs text-gray-500">Closed</span>
                              )}
                            </div>
                            <FieldHint error={errors[`hours.${day}`]} />
                          </div>
                        ))}
                      </TabsContent>

                      <TabsContent value="extra" className="mt-0 block w-full space-y-3 pb-6 pt-1 outline-none data-[state=inactive]:hidden">
                        <p className="text-xs text-gray-500">
                          Optional legacy map coordinates, zone tags, and JSON metadata stored on the warehouse.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="wh-legacy-x">Legacy X</Label>
                            <Input
                              id="wh-legacy-x"
                              type="number"
                              step="any"
                              value={legacyX}
                              onChange={(e) => { clearError('legacyX'); setLegacyX(e.target.value); }}
                              className={inputClass('legacyX')}
                            />
                            <FieldHint error={errors.legacyX} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wh-legacy-y">Legacy Y</Label>
                            <Input
                              id="wh-legacy-y"
                              type="number"
                              step="any"
                              value={legacyY}
                              onChange={(e) => { clearError('legacyY'); setLegacyY(e.target.value); }}
                              className={inputClass('legacyY')}
                            />
                            <FieldHint error={errors.legacyY} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="wh-zones-csv">Legacy zone tags (comma-separated)</Label>
                          <Input id="wh-zones-csv" value={zonesCsv} onChange={(e) => setZonesCsv(e.target.value)} placeholder="tag1, tag2" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="wh-metadata">Metadata (JSON object)</Label>
                          <Textarea
                            id="wh-metadata"
                            className={cn('font-mono text-xs', inputClass('metadataJson'))}
                            rows={5}
                            value={metadataJson}
                            onChange={(e) => { clearError('metadataJson'); setMetadataJson(e.target.value); }}
                            placeholder="{}"
                            aria-invalid={!!errors.metadataJson}
                          />
                          <FieldHint error={errors.metadataJson} />
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>

                </form>
    </AdminModal>
  );
}
