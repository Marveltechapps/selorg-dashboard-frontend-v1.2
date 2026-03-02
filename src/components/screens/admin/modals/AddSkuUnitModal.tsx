import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SkuUnit, createSkuUnit, updateSkuUnit } from '../masterDataApi';
import { toast } from 'sonner';

interface AddSkuUnitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editItem: SkuUnit | null;
}

export function AddSkuUnitModal({ open, onOpenChange, onSuccess, editItem }: AddSkuUnitModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [baseUnit, setBaseUnit] = useState('');
  const [conversionFactor, setConversionFactor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editItem) {
        setCode(editItem.code);
        setName(editItem.name);
        setBaseUnit(editItem.baseUnit ?? '');
        setConversionFactor(editItem.conversionFactor?.toString() ?? '');
      } else {
        setCode('');
        setName('');
        setBaseUnit('');
        setConversionFactor('');
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
      const payload = {
        code: code.trim(),
        name: name.trim(),
        baseUnit: baseUnit.trim() || undefined,
        conversionFactor: conversionFactor ? Number(conversionFactor) : undefined,
      };
      if (editItem) {
        await updateSkuUnit(editItem.id, payload);
        toast.success('SKU unit updated');
      } else {
        await createSkuUnit(payload);
        toast.success('SKU unit created');
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
          <DialogTitle>{editItem ? 'Edit SKU Unit' : 'Add SKU Unit'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. kg" disabled={!!editItem} />
          </div>
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kilogram" />
          </div>
          <div>
            <Label>Base Unit</Label>
            <Input value={baseUnit} onChange={(e) => setBaseUnit(e.target.value)} placeholder="e.g. kg" />
          </div>
          <div>
            <Label>Conversion Factor</Label>
            <Input type="number" step="any" value={conversionFactor} onChange={(e) => setConversionFactor(e.target.value)} placeholder="e.g. 0.001 for g->kg" />
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
