import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { City, createCity, updateCity } from '../masterDataApi';
import { toast } from 'sonner';

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
      if (editCity) {
        await updateCity(editCity.id, {
          code: codeTrim,
          name: name.trim(),
          state: state.trim() || undefined,
          country: country.trim() || 'India',
          isActive,
          ...(metadata !== undefined ? { metadata } : {}),
        });
        toast.success('City updated');
      } else {
        await createCity({
          code: codeTrim,
          name: name.trim(),
          state: state.trim() || undefined,
          country: country.trim() || 'India',
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editCity ? 'Edit City' : 'Add City'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Code *</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. BLR"
              maxLength={3}
              disabled={!!editCity}
            />
            <p className="text-xs text-muted-foreground mt-1">Exactly 3 letters A–Z</p>
          </div>
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bangalore" />
          </div>
          <div>
            <Label>State</Label>
            <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Karnataka" />
          </div>
          <div>
            <Label>Country</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" />
          </div>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : editCity ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
