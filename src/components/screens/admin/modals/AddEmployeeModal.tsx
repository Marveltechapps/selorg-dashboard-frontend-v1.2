import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Staff, createStaff, updateStaff } from '../storeWarehouseApi';
import { toast } from 'sonner';

interface AddEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editEmployee: Staff | null;
  stores: { id: string; name: string }[];
}

const ROLES = ['Picker', 'Packer', 'Loader', 'Rider', 'Supervisor'];
const SHIFTS = ['morning', 'evening', 'night', 'full_day'];
const STATUSES = ['Active', 'Break', 'Meeting', 'Offline'];

export function AddEmployeeModal({ open, onOpenChange, onSuccess, editEmployee, stores }: AddEmployeeModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Picker');
  const [storeId, setStoreId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [shift, setShift] = useState('full_day');
  const [status, setStatus] = useState('Offline');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editEmployee) {
        setName(editEmployee.name);
        setRole(editEmployee.role.charAt(0).toUpperCase() + editEmployee.role.slice(1));
        setStoreId(editEmployee.storeId ?? '');
        setPhone(editEmployee.phone ?? '');
        setEmail(editEmployee.email ?? '');
        setShift(editEmployee.shift ?? 'full_day');
        setStatus(editEmployee.status.charAt(0).toUpperCase() + editEmployee.status.slice(1));
      } else {
        setName('');
        setRole('Picker');
        setStoreId('');
        setPhone('');
        setEmail('');
        setShift('full_day');
        setStatus('Offline');
      }
    }
  }, [open, editEmployee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { name: name.trim(), role, storeId: storeId || undefined, phone: phone.trim() || undefined, email: email.trim() || undefined, shift, status };
      if (editEmployee) {
        await updateStaff(editEmployee.id, payload);
        toast.success('Employee updated');
      } else {
        await createStaff(payload);
        toast.success('Employee created');
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
          <DialogTitle>{editEmployee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Store</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
              <SelectContent>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Shift</Label>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHIFTS.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : editEmployee ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
