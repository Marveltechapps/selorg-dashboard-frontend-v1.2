import React, { useState, useEffect } from 'react';
import { AdminModal } from './AdminModal';
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
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title={editItem ? 'Edit Vehicle Type' : 'Add Vehicle Type'}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="vehicle-type-form" disabled={submitting}>{submitting ? 'Saving...' : editItem ? 'Update' : 'Create'}</Button>
        </>
      }
    >
      <form id="vehicle-type-form" onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. bike" disabled={!!editItem} />
          </div>
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bike" />
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
        </div>
      </form>
    </AdminModal>
  );
}
