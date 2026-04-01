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
import { Zone, createZone, updateZone } from '../masterDataApi';
import { toast } from 'sonner';

interface AddZoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editZone: Zone | null;
  cities: { id: string; name: string }[];
}

const ZONE_TYPES = ['Serviceable', 'Exclusion', 'Priority', 'Promo-Only'];
const ZONE_STATUS = ['Active', 'Inactive', 'Pending'];

function statusForSelect(raw?: string) {
  const s = String(raw ?? 'Active').toLowerCase();
  if (s === 'active') return 'Active';
  if (s === 'inactive') return 'Inactive';
  if (s === 'pending' || s === 'testing') return 'Pending';
  return ZONE_STATUS.includes(String(raw)) ? String(raw) : 'Active';
}

function statusForApi(sel: string) {
  if (sel === 'Active') return 'Active';
  if (sel === 'Inactive') return 'Inactive';
  return 'Pending';
}

export function AddZoneModal({ open, onOpenChange, onSuccess, editZone, cities }: AddZoneModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [cityId, setCityId] = useState('');
  const [type, setType] = useState('Serviceable');
  const [status, setStatus] = useState('Active');
  const [color, setColor] = useState('#3b82f6');
  const [areaSqKm, setAreaSqKm] = useState('');
  const [defaultCapacity, setDefaultCapacity] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [promoCount, setPromoCount] = useState('');
  const [cityLabel, setCityLabel] = useState('');
  const [region, setRegion] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [pointsJson, setPointsJson] = useState('[]');
  const [polygonJson, setPolygonJson] = useState('[]');
  const [centerLat, setCenterLat] = useState('');
  const [centerLng, setCenterLng] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('39');
  const [minOrderValue, setMinOrderValue] = useState('149');
  const [maxDeliveryRadius, setMaxDeliveryRadius] = useState('5');
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('30');
  const [surgeMultiplier, setSurgeMultiplier] = useState('1');
  const [settingsMaxCapacity, setSettingsMaxCapacity] = useState('100');
  const [priority, setPriority] = useState('5');
  const [availableSlotsCsv, setAvailableSlotsCsv] = useState('');
  const [areaSize, setAreaSize] = useState('0');
  const [population, setPopulation] = useState('0');
  const [activeOrders, setActiveOrders] = useState('0');
  const [totalOrders, setTotalOrders] = useState('0');
  const [dailyOrders, setDailyOrders] = useState('0');
  const [revenue, setRevenue] = useState('0');
  const [avgDeliveryTime, setAvgDeliveryTime] = useState('0');
  const [riderCount, setRiderCount] = useState('0');
  const [capacityUsage, setCapacityUsage] = useState('0');
  const [customerSatisfaction, setCustomerSatisfaction] = useState('0');
  const [metadataJson, setMetadataJson] = useState('');
  const [confirmCityChange, setConfirmCityChange] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editZone) {
      setName(editZone.name);
      setCode(editZone.code ?? '');
      setCityId(editZone.cityId ?? '');
      setType(editZone.type ?? 'Serviceable');
      setStatus(statusForSelect(editZone.status));
      setColor(editZone.color ?? '#3b82f6');
      setAreaSqKm(editZone.areaSqKm?.toString() ?? '');
      setDefaultCapacity(editZone.defaultCapacity != null ? String(editZone.defaultCapacity) : '');
      setIsVisible(editZone.isVisible !== false);
      setPromoCount(editZone.promoCount != null ? String(editZone.promoCount) : '0');
      setCityLabel(editZone.city ?? '');
      setRegion(editZone.region ?? '');
      setCreatedBy(editZone.createdBy ?? '');
      setPointsJson(JSON.stringify(editZone.points ?? [], null, 2));
      setPolygonJson(JSON.stringify(editZone.polygon ?? [], null, 2));
      setCenterLat(editZone.center?.lat != null ? String(editZone.center.lat) : '');
      setCenterLng(editZone.center?.lng != null ? String(editZone.center.lng) : '');
      const st = editZone.settings ?? {};
      setDeliveryFee(String(st.deliveryFee ?? 39));
      setMinOrderValue(String(st.minOrderValue ?? 149));
      setMaxDeliveryRadius(String(st.maxDeliveryRadius ?? 5));
      setEstimatedDeliveryTime(String(st.estimatedDeliveryTime ?? 30));
      setSurgeMultiplier(String(st.surgeMultiplier ?? 1));
      setSettingsMaxCapacity(String(st.maxCapacity ?? 100));
      setPriority(String(st.priority ?? 5));
      setAvailableSlotsCsv((st.availableSlots ?? []).join(', '));
      const an = editZone.analytics ?? {};
      setAreaSize(String(an.areaSize ?? 0));
      setPopulation(String(an.population ?? 0));
      setActiveOrders(String(an.activeOrders ?? 0));
      setTotalOrders(String(an.totalOrders ?? 0));
      setDailyOrders(String(an.dailyOrders ?? 0));
      setRevenue(String(an.revenue ?? 0));
      setAvgDeliveryTime(String(an.avgDeliveryTime ?? 0));
      setRiderCount(String(an.riderCount ?? 0));
      setCapacityUsage(String(an.capacityUsage ?? 0));
      setCustomerSatisfaction(String(an.customerSatisfaction ?? 0));
      setMetadataJson(
        editZone.metadata != null && Object.keys(editZone.metadata).length
          ? JSON.stringify(editZone.metadata, null, 2)
          : ''
      );
      setConfirmCityChange(false);
    } else {
      setName('');
      setCode('');
      setCityId('');
      setType('Serviceable');
      setStatus('Active');
      setColor('#3b82f6');
      setAreaSqKm('');
      setDefaultCapacity('');
      setIsVisible(true);
      setPromoCount('0');
      setCityLabel('');
      setRegion('');
      setCreatedBy('');
      setPointsJson('[]');
      setPolygonJson('[]');
      setCenterLat('');
      setCenterLng('');
      setDeliveryFee('39');
      setMinOrderValue('149');
      setMaxDeliveryRadius('5');
      setEstimatedDeliveryTime('30');
      setSurgeMultiplier('1');
      setSettingsMaxCapacity('100');
      setPriority('5');
      setAvailableSlotsCsv('');
      setAreaSize('0');
      setPopulation('0');
      setActiveOrders('0');
      setTotalOrders('0');
      setDailyOrders('0');
      setRevenue('0');
      setAvgDeliveryTime('0');
      setRiderCount('0');
      setCapacityUsage('0');
      setCustomerSatisfaction('0');
      setMetadataJson('');
      setConfirmCityChange(false);
    }
  }, [open, editZone]);

  const tryParseJson = (raw: string, label: string): unknown | null | undefined => {
    const t = raw.trim();
    if (!t) return undefined;
    try {
      return JSON.parse(t);
    } catch {
      toast.error(`${label} must be valid JSON`);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!cityId) {
      toast.error('City is required');
      return;
    }
    if (editZone && editZone.cityId && cityId !== editZone.cityId && !confirmCityChange) {
      toast.error('Confirm city change below, or revert city selection');
      return;
    }

    let points: unknown;
    let polygon: unknown;
    let metadata: unknown;
    const pj = tryParseJson(pointsJson, 'Points JSON');
    if (pj === null) return;
    if (pj !== undefined) {
      if (!Array.isArray(pj)) {
        toast.error('Points must be a JSON array');
        return;
      }
      points = pj;
    }
    const polyj = tryParseJson(polygonJson, 'Polygon JSON');
    if (polyj === null) return;
    if (polyj !== undefined) {
      if (!Array.isArray(polyj)) {
        toast.error('Polygon must be a JSON array');
        return;
      }
      polygon = polyj;
    }
    if (metadataJson.trim()) {
      const mj = tryParseJson(metadataJson, 'Metadata JSON');
      if (mj === null) return;
      if (mj !== undefined && (typeof mj !== 'object' || Array.isArray(mj))) {
        toast.error('Metadata must be a JSON object');
        return;
      }
      metadata = mj;
    }

    const settings = {
      deliveryFee: Number(deliveryFee) || 0,
      minOrderValue: Number(minOrderValue) || 0,
      maxDeliveryRadius: Number(maxDeliveryRadius) || 0,
      estimatedDeliveryTime: Number(estimatedDeliveryTime) || 0,
      surgeMultiplier: Number(surgeMultiplier) || 1,
      maxCapacity: Number(settingsMaxCapacity) || 0,
      priority: Number(priority) || 0,
      availableSlots: availableSlotsCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const analytics = {
      areaSize: Number(areaSize) || 0,
      population: Number(population) || 0,
      activeOrders: Number(activeOrders) || 0,
      totalOrders: Number(totalOrders) || 0,
      dailyOrders: Number(dailyOrders) || 0,
      revenue: Number(revenue) || 0,
      avgDeliveryTime: Number(avgDeliveryTime) || 0,
      riderCount: Number(riderCount) || 0,
      capacityUsage: Number(capacityUsage) || 0,
      customerSatisfaction: Number(customerSatisfaction) || 0,
    };

    const center: { lat?: number; lng?: number } = {};
    if (centerLat.trim()) center.lat = Number(centerLat);
    if (centerLng.trim()) center.lng = Number(centerLng);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      code: code.trim() || undefined,
      cityId,
      type,
      status: statusForApi(status),
      color,
      areaSqKm: areaSqKm ? Number(areaSqKm) : 0,
      defaultCapacity: defaultCapacity.trim() ? Number(defaultCapacity) : undefined,
      isVisible,
      promoCount: promoCount.trim() ? Number(promoCount) : 0,
      city: cityLabel.trim() || undefined,
      region: region.trim() || undefined,
      createdBy: createdBy.trim() || undefined,
      settings,
      analytics,
    };
    if (points !== undefined) payload.points = points;
    if (polygon !== undefined) payload.polygon = polygon;
    if (Object.keys(center).length) payload.center = center;
    if (metadata !== undefined) payload.metadata = metadata;
    if (editZone && editZone.cityId && cityId !== editZone.cityId && confirmCityChange) {
      payload.confirmCityChange = true;
    }

    setSubmitting(true);
    try {
      if (editZone) {
        await updateZone(editZone.id, payload);
        toast.success('Zone updated');
      } else {
        await createZone(payload as Partial<Zone>);
        toast.success('Zone created');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const cityChanged = !!(editZone?.cityId && cityId && editZone.cityId !== cityId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{editZone ? 'Edit Zone' : 'Add Zone'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <Tabs defaultValue="basic" className="flex-1 flex flex-col min-h-0 px-6">
            <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="geo">Geometry</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="extra">Analytics / Meta</TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-1 max-h-[58vh] pr-3 mt-3">
              <TabsContent value="basic" className="space-y-3 mt-0 pb-4">
                <div className="space-y-2">
                  <Label>Zone Name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Indiranagar" />
                </div>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. BLR-IND" />
                </div>
                <div className="space-y-2">
                  <Label>City *</Label>
                  <Select value={cityId} onValueChange={(v) => { setCityId(v); setConfirmCityChange(false); }}>
                    <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {cityChanged && (
                  <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                    <Switch checked={confirmCityChange} onCheckedChange={setConfirmCityChange} id="confirm-city" />
                    <Label htmlFor="confirm-city" className="text-sm cursor-pointer">
                      Confirm changing this zone to a different city (destructive)
                    </Label>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ZONE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ZONE_STATUS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-full p-1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Area (sq km)</Label>
                    <Input type="number" step="0.01" value={areaSqKm} onChange={(e) => setAreaSqKm(e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Default capacity</Label>
                    <Input type="number" value={defaultCapacity} onChange={(e) => setDefaultCapacity(e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Promo count</Label>
                    <Input type="number" value={promoCount} onChange={(e) => setPromoCount(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isVisible} onCheckedChange={setIsVisible} id="vis" />
                  <Label htmlFor="vis">Visible on map / listings</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>City label (denormalized)</Label>
                    <Input value={cityLabel} onChange={(e) => setCityLabel(e.target.value)} placeholder="Optional display name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Region</Label>
                    <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Created by</Label>
                  <Input value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} placeholder="User id or name" />
                </div>
              </TabsContent>

              <TabsContent value="geo" className="space-y-3 mt-0 pb-4">
                <p className="text-xs text-muted-foreground">Use JSON arrays. Points: [{`{ "x": 0, "y": 0 }`}]. Polygon: [{`{ "lat": 12.97, "lng": 77.59 }`}].</p>
                <div className="space-y-2">
                  <Label>Points (x,y) JSON</Label>
                  <Textarea value={pointsJson} onChange={(e) => setPointsJson(e.target.value)} rows={4} className="font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label>Polygon (lat,lng) JSON</Label>
                  <Textarea value={polygonJson} onChange={(e) => setPolygonJson(e.target.value)} rows={6} className="font-mono text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Center latitude</Label>
                    <Input type="number" step="any" value={centerLat} onChange={(e) => setCenterLat(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Center longitude</Label>
                    <Input type="number" step="any" value={centerLng} onChange={(e) => setCenterLng(e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-3 mt-0 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Delivery fee</Label><Input type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Min order value</Label><Input type="number" value={minOrderValue} onChange={(e) => setMinOrderValue(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Max delivery radius (km)</Label><Input type="number" value={maxDeliveryRadius} onChange={(e) => setMaxDeliveryRadius(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Est. delivery time (min)</Label><Input type="number" value={estimatedDeliveryTime} onChange={(e) => setEstimatedDeliveryTime(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Surge multiplier</Label><Input type="number" step="0.1" value={surgeMultiplier} onChange={(e) => setSurgeMultiplier(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Settings max capacity</Label><Input type="number" value={settingsMaxCapacity} onChange={(e) => setSettingsMaxCapacity(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Priority</Label><Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Available slots (comma-separated)</Label>
                  <Input value={availableSlotsCsv} onChange={(e) => setAvailableSlotsCsv(e.target.value)} placeholder="slot1, slot2" />
                </div>
              </TabsContent>

              <TabsContent value="extra" className="space-y-3 mt-0 pb-4">
                <p className="text-xs font-medium text-muted-foreground">Analytics</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Area size</Label><Input type="number" value={areaSize} onChange={(e) => setAreaSize(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Population</Label><Input type="number" value={population} onChange={(e) => setPopulation(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Active orders</Label><Input type="number" value={activeOrders} onChange={(e) => setActiveOrders(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Total orders</Label><Input type="number" value={totalOrders} onChange={(e) => setTotalOrders(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Daily orders</Label><Input type="number" value={dailyOrders} onChange={(e) => setDailyOrders(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Revenue</Label><Input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Avg delivery time</Label><Input type="number" value={avgDeliveryTime} onChange={(e) => setAvgDeliveryTime(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Rider count</Label><Input type="number" value={riderCount} onChange={(e) => setRiderCount(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Capacity usage</Label><Input type="number" value={capacityUsage} onChange={(e) => setCapacityUsage(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Customer satisfaction</Label><Input type="number" value={customerSatisfaction} onChange={(e) => setCustomerSatisfaction(e.target.value)} /></div>
                </div>
                <div className="space-y-2 pt-2">
                  <Label>Metadata (JSON object)</Label>
                  <Textarea value={metadataJson} onChange={(e) => setMetadataJson(e.target.value)} rows={5} className="font-mono text-xs" placeholder="{}" />
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : editZone ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
