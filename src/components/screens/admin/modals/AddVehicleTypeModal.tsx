import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VehicleType, createVehicleType, updateVehicleType } from '../masterDataApi';
import { toast } from 'sonner';

interface AddVehicleTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editItem: VehicleType | null;
}

export function AddVehicleTypeModal({ open, onOpenChange, onSuccess, editItem }: AddVehicleTypeModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editItem) {
        setCode(editItem.code);
        setName(editItem.name);
        setDescription(editItem.description ?? '');
      } else {
        setCode('');
        setName('');
        setDescription('');
      }
    }
  }, [open, editItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    setSubmitting(true);
    try {
      if (editItem) {
        await updateVehicleType(editItem.id, { code: code.trim(), name: name.trim(), description: description.trim() || undefined });
        toast.success('Vehicle type updated');
      } else {
        await createVehicleType({ code: code.trim(), name: name.trim(), description: description.trim() || undefined });
        toast.success('Vehicle type created');
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
          <DialogTitle>{editItem ? 'Edit Vehicle Type' : 'Add Vehicle Type'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. bike" disabled={!!editItem} />
          </div>
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bike" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : editItem ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
