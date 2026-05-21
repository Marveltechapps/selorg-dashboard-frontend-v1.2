import React, { useState, useEffect } from 'react';
import { AdminModal } from './AdminModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zone, createZone, updateZone } from '../masterDataApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LocationMapPicker } from './LocationMapPicker';

interface AddZoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editZone: Zone | null;
  cities: { id: string; name: string }[];
}

const ZONE_TYPES = ['Serviceable', 'Exclusion', 'Priority', 'Promo-Only'];
const ZONE_STATUS = ['Active', 'Inactive', 'Pending'];
const CODE_REGEX = /^[A-Z0-9-_]{1,30}$/i;
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

type FieldErrors = Partial<Record<string, string>>;

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

function FieldHint({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-rose-600 mt-1">{error}</p>;
}

function parseJsonField(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, value: undefined };
  try {
    return { ok: true, value: JSON.parse(t) };
  } catch {
    return { ok: false, error: 'Must be valid JSON' };
  }
}

function validatePointsArray(data: unknown): string | null {
  if (!Array.isArray(data)) return 'Points must be a JSON array';
  for (let i = 0; i < data.length; i++) {
    const p = data[i];
    if (!p || typeof p !== 'object') return `Point ${i + 1} must be an object`;
    const x = Number((p as { x?: unknown }).x);
    const y = Number((p as { y?: unknown }).y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return `Point ${i + 1} must have numeric x and y`;
    }
  }
  return null;
}

function validatePolygonArray(data: unknown): string | null {
  if (!Array.isArray(data)) return 'Polygon must be a JSON array';
  if (data.length > 0 && data.length < 3) return 'Polygon needs at least 3 coordinates';
  for (let i = 0; i < data.length; i++) {
    const p = data[i];
    if (!p || typeof p !== 'object') return `Vertex ${i + 1} must be an object`;
    const lat = Number((p as { lat?: unknown }).lat);
    const lng = Number((p as { lng?: unknown }).lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return `Vertex ${i + 1} latitude must be between -90 and 90`;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return `Vertex ${i + 1} longitude must be between -180 and 180`;
    }
  }
  return null;
}

function nonNegativeInt(value: string, label: string, opts?: { min?: number; max?: number; required?: boolean }) {
  const t = value.trim();
  if (!t) {
    if (opts?.required) return `${label} is required`;
    return null;
  }
  const n = Number(t);
  if (!Number.isFinite(n)) return `${label} must be a number`;
  if (!Number.isInteger(n)) return `${label} must be a whole number`;
  if (n < (opts?.min ?? 0)) return `${label} must be at least ${opts?.min ?? 0}`;
  if (opts?.max != null && n > opts.max) return `${label} must be at most ${opts.max}`;
  return null;
}

function nonNegativeNumber(value: string, label: string, opts?: { min?: number; max?: number; required?: boolean }) {
  const t = value.trim();
  if (!t) {
    if (opts?.required) return `${label} is required`;
    return null;
  }
  const n = Number(t);
  if (!Number.isFinite(n)) return `${label} must be a number`;
  if (n < (opts?.min ?? 0)) return `${label} must be at least ${opts?.min ?? 0}`;
  if (opts?.max != null && n > opts.max) return `${label} must be at most ${opts.max}`;
  return null;
}

export function AddZoneModal({ open, onOpenChange, onSuccess, editZone, cities }: AddZoneModalProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [errors, setErrors] = useState<FieldErrors>({});
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

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setActiveTab('basic');
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

  const cityChanged = !!(editZone?.cityId && cityId && editZone.cityId !== cityId);

  const tabForField = (field: string): string => {
    if (['pointsJson', 'polygonJson', 'centerLat', 'centerLng'].includes(field)) return 'geo';
    if (
      [
        'deliveryFee',
        'minOrderValue',
        'maxDeliveryRadius',
        'estimatedDeliveryTime',
        'surgeMultiplier',
        'settingsMaxCapacity',
        'priority',
        'availableSlotsCsv',
      ].includes(field)
    ) {
      return 'settings';
    }
    if (
      [
        'areaSize',
        'population',
        'activeOrders',
        'totalOrders',
        'dailyOrders',
        'revenue',
        'avgDeliveryTime',
        'riderCount',
        'capacityUsage',
        'customerSatisfaction',
        'metadataJson',
      ].includes(field)
    ) {
      return 'extra';
    }
    return 'basic';
  };

  const validateForm = (): FieldErrors => {
    const next: FieldErrors = {};
    const trimmedName = name.trim();

    if (!trimmedName) {
      next.name = 'Zone name is required';
    } else if (trimmedName.length < 2) {
      next.name = 'Name must be at least 2 characters';
    } else if (trimmedName.length > 100) {
      next.name = 'Name must be 100 characters or less';
    }

    const trimmedCode = code.trim();
    if (trimmedCode && !CODE_REGEX.test(trimmedCode)) {
      next.code = 'Code may use letters, numbers, hyphens, and underscores (max 30 characters)';
    }

    if (!cityId) {
      next.cityId = 'Please select a city';
    } else if (!cities.some((c) => c.id === cityId)) {
      next.cityId = 'Selected city is invalid';
    }

    if (cityChanged && !confirmCityChange) {
      next.confirmCityChange = 'Confirm the city change before saving';
    }

    if (!ZONE_TYPES.includes(type)) {
      next.type = 'Select a valid zone type';
    }
    if (!ZONE_STATUS.includes(status)) {
      next.status = 'Select a valid status';
    }

    if (!HEX_COLOR_REGEX.test(color)) {
      next.color = 'Pick a valid hex color';
    }

    const areaErr = nonNegativeNumber(areaSqKm, 'Area (sq km)', { max: 1_000_000 });
    if (areaErr) next.areaSqKm = areaErr;

    const capErr = nonNegativeInt(defaultCapacity, 'Default capacity', { max: 1_000_000 });
    if (capErr) next.defaultCapacity = capErr;

    const promoErr = nonNegativeInt(promoCount, 'Promo count', { required: true, max: 100_000 });
    if (promoErr) next.promoCount = promoErr;

    if (cityLabel.trim().length > 100) next.cityLabel = 'City label must be 100 characters or less';
    if (region.trim().length > 100) next.region = 'Region must be 100 characters or less';
    if (createdBy.trim().length > 120) next.createdBy = 'Created by must be 120 characters or less';

    const hasLat = centerLat.trim() !== '';
    const hasLng = centerLng.trim() !== '';
    if (hasLat !== hasLng) {
      next.centerLat = 'Provide both center latitude and longitude, or leave both empty';
      next.centerLng = 'Provide both center latitude and longitude, or leave both empty';
    } else if (hasLat) {
      const lat = Number(centerLat);
      const lng = Number(centerLng);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) next.centerLat = 'Latitude must be between -90 and 90';
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) next.centerLng = 'Longitude must be between -180 and 180';
    }

    const pointsParsed = parseJsonField(pointsJson);
    if (!pointsParsed.ok) {
      next.pointsJson = `Points JSON: ${pointsParsed.error}`;
    } else if (pointsParsed.value !== undefined) {
      const pe = validatePointsArray(pointsParsed.value);
      if (pe) next.pointsJson = pe;
    }

    const polygonParsed = parseJsonField(polygonJson);
    if (!polygonParsed.ok) {
      next.polygonJson = `Polygon JSON: ${polygonParsed.error}`;
    } else if (polygonParsed.value !== undefined) {
      const pge = validatePolygonArray(polygonParsed.value);
      if (pge) next.polygonJson = pge;
    }

    const feeErr = nonNegativeNumber(deliveryFee, 'Delivery fee', { required: true, max: 100_000 });
    if (feeErr) next.deliveryFee = feeErr;
    const movErr = nonNegativeNumber(minOrderValue, 'Min order value', { required: true, max: 100_000 });
    if (movErr) next.minOrderValue = movErr;
    const radiusErr = nonNegativeInt(maxDeliveryRadius, 'Max delivery radius (km)', { required: true, min: 1, max: 100 });
    if (radiusErr) next.maxDeliveryRadius = radiusErr;
    const etaErr = nonNegativeInt(estimatedDeliveryTime, 'Estimated delivery time', { required: true, min: 1, max: 240 });
    if (etaErr) next.estimatedDeliveryTime = etaErr;
    const surgeErr = nonNegativeNumber(surgeMultiplier, 'Surge multiplier', { required: true, min: 0.1, max: 10 });
    if (surgeErr) next.surgeMultiplier = surgeErr;
    const smcErr = nonNegativeInt(settingsMaxCapacity, 'Settings max capacity', { required: true, min: 1, max: 1_000_000 });
    if (smcErr) next.settingsMaxCapacity = smcErr;
    const priErr = nonNegativeInt(priority, 'Priority', { required: true, min: 0, max: 100 });
    if (priErr) next.priority = priErr;

    const analyticsFields: { key: string; value: string; label: string; max?: number }[] = [
      { key: 'areaSize', value: areaSize, label: 'Area size' },
      { key: 'population', value: population, label: 'Population' },
      { key: 'activeOrders', value: activeOrders, label: 'Active orders' },
      { key: 'totalOrders', value: totalOrders, label: 'Total orders' },
      { key: 'dailyOrders', value: dailyOrders, label: 'Daily orders' },
      { key: 'revenue', value: revenue, label: 'Revenue' },
      { key: 'avgDeliveryTime', value: avgDeliveryTime, label: 'Avg delivery time' },
      { key: 'riderCount', value: riderCount, label: 'Rider count' },
    ];
    analyticsFields.forEach(({ key, value, label }) => {
      const err = nonNegativeNumber(value, label, { required: true, max: 1_000_000_000 });
      if (err) next[key] = err;
    });
    const usageErr = nonNegativeNumber(capacityUsage, 'Capacity usage', { required: true, max: 100 });
    if (usageErr) next.capacityUsage = usageErr;
    const satErr = nonNegativeNumber(customerSatisfaction, 'Customer satisfaction', { required: true, max: 5 });
    if (satErr) next.customerSatisfaction = satErr;

    if (metadataJson.trim()) {
      const mj = parseJsonField(metadataJson);
      if (!mj.ok) {
        next.metadataJson = mj.error;
      } else if (mj.value !== undefined && (typeof mj.value !== 'object' || mj.value === null || Array.isArray(mj.value))) {
        next.metadataJson = 'Metadata must be a JSON object';
      }
    }

    return next;
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

    const pointsParsed = parseJsonField(pointsJson);
    const polygonParsed = parseJsonField(polygonJson);
    let metadata: unknown;
    if (metadataJson.trim()) {
      const mj = parseJsonField(metadataJson);
      metadata = mj.ok ? mj.value : undefined;
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
    if (centerLat.trim()) {
      center.lat = Number(centerLat);
      center.lng = Number(centerLng);
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      code: code.trim() || undefined,
      cityId,
      type,
      status: statusForApi(status),
      color,
      areaSqKm: areaSqKm.trim() ? Number(areaSqKm) : 0,
      defaultCapacity: defaultCapacity.trim() ? Number(defaultCapacity) : undefined,
      isVisible,
      promoCount: Number(promoCount) || 0,
      city: cityLabel.trim() || undefined,
      region: region.trim() || undefined,
      createdBy: createdBy.trim() || undefined,
      settings,
      analytics,
    };

    if (pointsParsed.ok && pointsParsed.value !== undefined) payload.points = pointsParsed.value;
    if (polygonParsed.ok && polygonParsed.value !== undefined) payload.polygon = polygonParsed.value;
    if (Object.keys(center).length) payload.center = center;
    if (metadata !== undefined) payload.metadata = metadata;
    if (cityChanged && confirmCityChange) payload.confirmCityChange = true;

    setSubmitting(true);
    try {
      if (editZone) {
        await updateZone(editZone.id, payload);
        toast.success('Zone updated');
      } else {
        await createZone(payload as Partial<Zone>);
        toast.success('Zone created');
      }
      onOpenChange(false);
      onSuccess();
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
      title={editZone ? 'Edit Zone' : 'Add Zone'}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="zone-form" disabled={submitting}>
            {submitting ? 'Saving...' : editZone ? 'Update' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="zone-form" onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col min-h-0 flex-1">
          <div className="shrink-0 px-6 pt-3">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="geo">Geometry</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="extra">Analytics / Meta</TabsTrigger>
            </TabsList>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
            <TabsContent value="basic" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="zone-name">Zone Name *</Label>
                <Input
                  id="zone-name"
                  value={name}
                  onChange={(e) => {
                    clearError('name');
                    setName(e.target.value);
                  }}
                  placeholder="e.g. Indiranagar"
                  className={inputClass('name')}
                  aria-invalid={!!errors.name}
                  maxLength={100}
                />
                <FieldHint error={errors.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone-code">Code</Label>
                <Input
                  id="zone-code"
                  value={code}
                  onChange={(e) => {
                    clearError('code');
                    setCode(e.target.value.toUpperCase());
                  }}
                  placeholder="e.g. BLR-IND"
                  className={cn('font-mono', inputClass('code'))}
                  aria-invalid={!!errors.code}
                  maxLength={30}
                />
                <FieldHint error={errors.code} />
              </div>
              <div className="space-y-2">
                <Label>City *</Label>
                <Select
                  value={cityId}
                  onValueChange={(v) => {
                    clearError('cityId');
                    clearError('confirmCityChange');
                    setCityId(v);
                    setConfirmCityChange(false);
                  }}
                >
                  <SelectTrigger className={inputClass('cityId')} aria-invalid={!!errors.cityId}>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldHint error={errors.cityId} />
              </div>
              {cityChanged && (
                <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={confirmCityChange}
                      onCheckedChange={(v) => {
                        clearError('confirmCityChange');
                        setConfirmCityChange(v);
                      }}
                      id="confirm-city"
                    />
                    <Label htmlFor="confirm-city" className="cursor-pointer text-sm">
                      Confirm changing this zone to a different city (destructive)
                    </Label>
                  </div>
                  <FieldHint error={errors.confirmCityChange} />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONE_STATUS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="zone-color">Color</Label>
                  <Input
                    id="zone-color"
                    type="color"
                    value={color}
                    onChange={(e) => {
                      clearError('color');
                      setColor(e.target.value);
                    }}
                    className={cn('h-9 w-full p-1', inputClass('color'))}
                  />
                  <FieldHint error={errors.color} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zone-area">Area (sq km)</Label>
                  <Input
                    id="zone-area"
                    type="number"
                    min={0}
                    step="0.01"
                    value={areaSqKm}
                    onChange={(e) => {
                      clearError('areaSqKm');
                      setAreaSqKm(e.target.value);
                    }}
                    placeholder="0"
                    className={inputClass('areaSqKm')}
                  />
                  <FieldHint error={errors.areaSqKm} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="zone-capacity">Default capacity</Label>
                  <Input
                    id="zone-capacity"
                    type="number"
                    min={0}
                    step={1}
                    value={defaultCapacity}
                    onChange={(e) => {
                      clearError('defaultCapacity');
                      setDefaultCapacity(e.target.value);
                    }}
                    placeholder="Optional"
                    className={inputClass('defaultCapacity')}
                  />
                  <FieldHint error={errors.defaultCapacity} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zone-promo">Promo count</Label>
                  <Input
                    id="zone-promo"
                    type="number"
                    min={0}
                    step={1}
                    value={promoCount}
                    onChange={(e) => {
                      clearError('promoCount');
                      setPromoCount(e.target.value);
                    }}
                    className={inputClass('promoCount')}
                  />
                  <FieldHint error={errors.promoCount} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isVisible} onCheckedChange={setIsVisible} id="vis" />
                <Label htmlFor="vis">Visible on map / listings</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="zone-city-label">City label (denormalized)</Label>
                  <Input
                    id="zone-city-label"
                    value={cityLabel}
                    onChange={(e) => {
                      clearError('cityLabel');
                      setCityLabel(e.target.value);
                    }}
                    placeholder="Optional display name"
                    className={inputClass('cityLabel')}
                    maxLength={100}
                  />
                  <FieldHint error={errors.cityLabel} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zone-region">Region</Label>
                  <Input
                    id="zone-region"
                    value={region}
                    onChange={(e) => {
                      clearError('region');
                      setRegion(e.target.value);
                    }}
                    placeholder="Optional"
                    className={inputClass('region')}
                    maxLength={100}
                  />
                  <FieldHint error={errors.region} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone-created-by">Created by</Label>
                <Input
                  id="zone-created-by"
                  value={createdBy}
                  onChange={(e) => {
                    clearError('createdBy');
                    setCreatedBy(e.target.value);
                  }}
                  placeholder="User id or name"
                  className={inputClass('createdBy')}
                  maxLength={120}
                />
                <FieldHint error={errors.createdBy} />
              </div>
            </TabsContent>

            <TabsContent value="geo" className="space-y-4 py-4">
              <p className="text-xs text-gray-500">
                Use JSON arrays. Points: [{'{ "x": 0, "y": 0 }'}]. Polygon: [{'{ "lat": 12.97, "lng": 77.59 }'}] (min 3
                vertices).
              </p>
              <div className="space-y-2">
                <Label htmlFor="zone-points">Points (x,y) JSON</Label>
                <Textarea
                  id="zone-points"
                  value={pointsJson}
                  onChange={(e) => {
                    clearError('pointsJson');
                    setPointsJson(e.target.value);
                  }}
                  rows={4}
                  className={cn('font-mono text-xs', inputClass('pointsJson'))}
                  aria-invalid={!!errors.pointsJson}
                />
                <FieldHint error={errors.pointsJson} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone-polygon">Polygon (lat,lng) JSON</Label>
                <Textarea
                  id="zone-polygon"
                  value={polygonJson}
                  onChange={(e) => {
                    clearError('polygonJson');
                    setPolygonJson(e.target.value);
                  }}
                  rows={6}
                  className={cn('font-mono text-xs', inputClass('polygonJson'))}
                  aria-invalid={!!errors.polygonJson}
                />
                <FieldHint error={errors.polygonJson} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="zone-center-lat">Center latitude</Label>
                  <Input
                    id="zone-center-lat"
                    type="number"
                    step="0.0001"
                    value={centerLat}
                    onChange={(e) => {
                      clearError('centerLat');
                      clearError('centerLng');
                      setCenterLat(e.target.value);
                    }}
                    placeholder="12.9716"
                    className={inputClass('centerLat')}
                  />
                  <FieldHint error={errors.centerLat} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zone-center-lng">Center longitude</Label>
                  <Input
                    id="zone-center-lng"
                    type="number"
                    step="0.0001"
                    value={centerLng}
                    onChange={(e) => {
                      clearError('centerLat');
                      clearError('centerLng');
                      setCenterLng(e.target.value);
                    }}
                    placeholder="77.5946"
                    className={inputClass('centerLng')}
                  />
                  <FieldHint error={errors.centerLng} />
                </div>
              </div>
              <LocationMapPicker
                latitude={centerLat}
                longitude={centerLng}
                onPositionChange={(lat, lng) => {
                  clearError('centerLat');
                  clearError('centerLng');
                  setCenterLat(lat);
                  setCenterLng(lng);
                }}
                height="240px"
              />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(
                  [
                    ['deliveryFee', 'Delivery fee (₹)', deliveryFee, setDeliveryFee, { min: 0 }],
                    ['minOrderValue', 'Min order value (₹)', minOrderValue, setMinOrderValue, { min: 0 }],
                    ['maxDeliveryRadius', 'Max delivery radius (km)', maxDeliveryRadius, setMaxDeliveryRadius, { min: 1, max: 100 }],
                    ['estimatedDeliveryTime', 'Est. delivery time (min)', estimatedDeliveryTime, setEstimatedDeliveryTime, { min: 1, max: 240 }],
                    ['surgeMultiplier', 'Surge multiplier', surgeMultiplier, setSurgeMultiplier, { min: 0.1, max: 10, step: 0.1 }],
                    ['settingsMaxCapacity', 'Settings max capacity', settingsMaxCapacity, setSettingsMaxCapacity, { min: 1 }],
                    ['priority', 'Priority (0–100)', priority, setPriority, { min: 0, max: 100 }],
                  ] as const
                ).map(([field, label, val, setter, attrs]) => (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={`zone-${field}`}>{label}</Label>
                    <Input
                      id={`zone-${field}`}
                      type="number"
                      value={val}
                      min={attrs.min}
                      max={'max' in attrs ? attrs.max : undefined}
                      step={'step' in attrs ? attrs.step : 1}
                      onChange={(e) => {
                        clearError(field);
                        setter(e.target.value);
                      }}
                      className={inputClass(field)}
                      aria-invalid={!!errors[field]}
                    />
                    <FieldHint error={errors[field]} />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone-slots">Available slots (comma-separated)</Label>
                <Input
                  id="zone-slots"
                  value={availableSlotsCsv}
                  onChange={(e) => setAvailableSlotsCsv(e.target.value)}
                  placeholder="slot1, slot2"
                />
              </div>
            </TabsContent>

            <TabsContent value="extra" className="space-y-4 py-4">
              <p className="text-xs font-medium text-gray-500">Analytics</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(
                  [
                    ['areaSize', 'Area size', areaSize, setAreaSize],
                    ['population', 'Population', population, setPopulation],
                    ['activeOrders', 'Active orders', activeOrders, setActiveOrders],
                    ['totalOrders', 'Total orders', totalOrders, setTotalOrders],
                    ['dailyOrders', 'Daily orders', dailyOrders, setDailyOrders],
                    ['revenue', 'Revenue', revenue, setRevenue],
                    ['avgDeliveryTime', 'Avg delivery time', avgDeliveryTime, setAvgDeliveryTime],
                    ['riderCount', 'Rider count', riderCount, setRiderCount],
                    ['capacityUsage', 'Capacity usage (%)', capacityUsage, setCapacityUsage, { max: 100 }],
                    ['customerSatisfaction', 'Customer satisfaction (0–5)', customerSatisfaction, setCustomerSatisfaction, { max: 5, step: 0.1 }],
                  ] as const
                ).map((row) => {
                  const field = row[0];
                  const label = row[1];
                  const val = row[2];
                  const setter = row[3];
                  const attrs = row[4] ?? {};
                  return (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={`zone-an-${field}`}>{label}</Label>
                      <Input
                        id={`zone-an-${field}`}
                        type="number"
                        min={0}
                        max={'max' in attrs ? attrs.max : undefined}
                        step={'step' in attrs ? attrs.step : 1}
                        value={val}
                        onChange={(e) => {
                          clearError(field);
                          setter(e.target.value);
                        }}
                        className={inputClass(field)}
                        aria-invalid={!!errors[field]}
                      />
                      <FieldHint error={errors[field]} />
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2 pt-2">
                <Label htmlFor="zone-metadata">Metadata (JSON object)</Label>
                <Textarea
                  id="zone-metadata"
                  value={metadataJson}
                  onChange={(e) => {
                    clearError('metadataJson');
                    setMetadataJson(e.target.value);
                  }}
                  rows={5}
                  className={cn('font-mono text-xs', inputClass('metadataJson'))}
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
