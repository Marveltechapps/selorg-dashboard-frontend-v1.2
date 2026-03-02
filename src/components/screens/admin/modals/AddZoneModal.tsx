import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export function AddZoneModal({ open, onOpenChange, onSuccess, editZone, cities }: AddZoneModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [cityId, setCityId] = useState('');
  const [type, setType] = useState('Serviceable');
  const [status, setStatus] = useState('Active');
  const [color, setColor] = useState('#3b82f6');
  const [areaSqKm, setAreaSqKm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editZone) {
        setName(editZone.name);
        setCode(editZone.code ?? '');
        setCityId(editZone.cityId ?? '');
        setType(editZone.type ?? 'Serviceable');
        setStatus(editZone.status ?? 'Active');
        setColor(editZone.color ?? '#3b82f6');
        setAreaSqKm(editZone.areaSqKm?.toString() ?? '');
      } else {
        setName('');
        setCode('');
        setCityId('');
        setType('Serviceable');
        setStatus('Active');
        setColor('#3b82f6');
        setAreaSqKm('');
      }
    }
  }, [open, editZone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!editZone && !cityId) {
      toast.error('City is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { name: name.trim(), code: code.trim() || undefined, cityId: cityId || editZone?.cityId, type, status, color, areaSqKm: areaSqKm ? Number(areaSqKm) : undefined };
      if (editZone) {
        await updateZone(editZone.id, payload);
        toast.success('Zone updated');
      } else {
        await createZone(payload);
        toast.success('Zone created');
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
          <DialogTitle>{editZone ? 'Edit Zone' : 'Add Zone'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Indiranagar" />
          </div>
          <div>
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. BLR-IND" />
          </div>
          <div>
            <Label>City *</Label>
            <Select value={cityId} onValueChange={setCityId} disabled={!!editZone}>
              <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
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
            <div>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Color</Label>
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-full p-1" />
            </div>
            <div>
              <Label>Area (sq km)</Label>
              <Input type="number" step="0.01" value={areaSqKm} onChange={(e) => setAreaSqKm(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : editZone ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
