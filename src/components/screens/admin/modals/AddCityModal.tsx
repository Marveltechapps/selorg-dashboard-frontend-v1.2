import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { City, createCity, updateCity } from '../masterDataApi';
import { toast } from 'sonner';

interface AddCityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editCity: City | null;
}

export function AddCityModal({ open, onOpenChange, onSuccess, editCity }: AddCityModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editCity) {
        setCode(editCity.code);
        setName(editCity.name);
        setState(editCity.state ?? '');
        setCountry(editCity.country ?? 'India');
      } else {
        setCode('');
        setName('');
        setState('');
        setCountry('India');
      }
    }
  }, [open, editCity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    setSubmitting(true);
    try {
      if (editCity) {
        await updateCity(editCity.id, { code: code.trim(), name: name.trim(), state: state.trim() || undefined, country: country.trim() || 'India' });
        toast.success('City updated');
      } else {
        await createCity({ code: code.trim(), name: name.trim(), state: state.trim() || undefined, country: country.trim() || 'India' });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editCity ? 'Edit City' : 'Add City'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. BLR" disabled={!!editCity} />
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
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : editCity ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
