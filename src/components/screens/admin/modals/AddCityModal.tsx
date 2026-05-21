import React, { useState, useEffect } from 'react';
import { AdminModal } from './AdminModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { City, createCity, updateCity } from '../masterDataApi';
import { toast } from 'sonner';
import { LocationMapPicker } from './LocationMapPicker';

interface AddCityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editCity: City | null;
}

const CITY_CODE = /^[A-Z]{3}$/;

export function AddCityModal({ open, onOpenChange, onSuccess, editCity }: AddCityModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [isActive, setIsActive] = useState(true);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [metadataJson, setMetadataJson] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editCity) {
        setCode(editCity.code);
        setName(editCity.name);
        setState(editCity.state ?? '');
        setCountry(editCity.country ?? 'India');
        setIsActive(editCity.isActive !== false);
        setLatitude(editCity.latitude != null ? String(editCity.latitude) : '');
        setLongitude(editCity.longitude != null ? String(editCity.longitude) : '');
        setMetadataJson(
          editCity.metadata != null && Object.keys(editCity.metadata as object).length
            ? JSON.stringify(editCity.metadata, null, 2)
            : ''
        );
      } else {
        setCode('');
        setName('');
        setState('');
        setCountry('India');
        setIsActive(true);
        setLatitude('');
        setLongitude('');
        setMetadataJson('');
      }
    }
  }, [open, editCity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeTrim = code.trim().toUpperCase();
    if (!codeTrim || !name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    if (!CITY_CODE.test(codeTrim)) {
      toast.error('City code must be exactly 3 uppercase letters (e.g. BLR)');
      return;
    }
    const latTrim = latitude.trim();
    const lngTrim = longitude.trim();
    if ((latTrim === '') !== (lngTrim === '')) {
      toast.error('Enter both latitude and longitude, or leave both empty');
      return;
    }
    if (latTrim && lngTrim) {
      const la = parseFloat(latTrim);
      const lo = parseFloat(lngTrim);
      if (!Number.isFinite(la) || la < -90 || la > 90) {
        toast.error('Latitude must be between -90 and 90');
        return;
      }
      if (!Number.isFinite(lo) || lo < -180 || lo > 180) {
        toast.error('Longitude must be between -180 and 180');
        return;
      }
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
    } else if (editCity != null && editCity.metadata != null) {
      metadata = null;
    }

    setSubmitting(true);
    try {
      const coordPayload =
        latTrim && lngTrim
          ? { latitude: parseFloat(latTrim), longitude: parseFloat(lngTrim) }
          : editCity
            ? { latitude: '', longitude: '' }
            : {};

      if (editCity) {
        await updateCity(editCity.id, {
          code: codeTrim,
          name: name.trim(),
          state: state.trim() || undefined,
          country: country.trim() || 'India',
          isActive,
          ...coordPayload,
          ...(metadata !== undefined ? { metadata } : {}),
        });
        toast.success('City updated');
      } else {
        await createCity({
          code: codeTrim,
          name: name.trim(),
          state: state.trim() || undefined,
          country: country.trim() || 'India',
          ...coordPayload,
          ...(metadata ? { metadata } : {}),
        });
        toast.success('City created');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title={editCity ? 'Edit City' : 'Add City'}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="city-form" disabled={submitting}>{submitting ? 'Saving...' : editCity ? 'Update' : 'Create'}</Button>
        </>
      }
    >
      <form id="city-form" onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Code *</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. BLR"
              maxLength={3}
              disabled={!!editCity}
            />
            <p className="text-xs text-gray-500 mt-1">Exactly 3 letters A-Z</p>
          </div>
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bangalore" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>State</Label>
            <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Karnataka" />
          </div>
          <div>
            <Label>Country</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="city-lat">Latitude (optional)</Label>
            <Input
              id="city-lat"
              type="number"
              step="0.0001"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="12.9716"
            />
          </div>
          <div>
            <Label htmlFor="city-lng">Longitude (optional)</Label>
            <Input
              id="city-lng"
              type="number"
              step="0.0001"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="77.5946"
            />
          </div>
        </div>
        <LocationMapPicker
          latitude={latitude}
          longitude={longitude}
          onPositionChange={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
          height="200px"
        />
        {editCity && (
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="city-active" />
            <Label htmlFor="city-active">Active</Label>
          </div>
        )}
        <div>
          <Label>Metadata (JSON object, optional)</Label>
          <Textarea
            value={metadataJson}
            onChange={(e) => setMetadataJson(e.target.value)}
            rows={4}
            className="font-mono text-xs"
            placeholder="{}"
          />
        </div>
      </form>
    </AdminModal>
  );
}
