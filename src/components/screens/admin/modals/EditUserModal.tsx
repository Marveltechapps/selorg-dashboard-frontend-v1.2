import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Role, UpdateUserPayload, updateUser, fetchRoles, fetchAllStores, StoreOption } from '../userManagementApi';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { X, Store } from 'lucide-react';

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  onUserUpdated?: () => void;
  user: User | null;
}

export function EditUserModal({ open, onClose, onUserUpdated, user }: EditUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [formData, setFormData] = useState<UpdateUserPayload & { locationDisplay?: string }>({
    name: '',
    department: '',
    roleId: '',
    status: 'active',
    location: [],
    assignedStores: [],
    primaryStoreId: '',
    notes: '',
    locationDisplay: '',
  });

  useEffect(() => {
    if (open) {
      loadRoles();
      fetchAllStores().then(setStores).catch(() => setStores([]));
      if (user) {
        setFormData({
          name: user.name,
          department: user.department || '',
          roleId: user.roleId || '',
          status: user.status as 'active' | 'inactive' | 'suspended',
          location: user.location || [],
          assignedStores: user.assignedStores || [],
          primaryStoreId: user.primaryStoreId || '',
          notes: user.notes || '',
          locationDisplay: (user.location || []).join(', '),
        });
      }
    }
  }, [open, user]);

  const loadRoles = async () => {
    try {
      const data = await fetchRoles();
      setRoles(data);
    } catch (error: unknown) {
      console.error('Failed to load roles:', error);
      toast.error('Failed to load roles. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!formData.name) {
      toast.error('Name is required');
      return;
    }

    setLoading(true);
    try {
      const payload: UpdateUserPayload = {
        name: formData.name,
        department: formData.department,
        roleId: formData.roleId || undefined,
        status: formData.status,
        assignedStores: formData.assignedStores ?? [],
        primaryStoreId: formData.primaryStoreId ?? '',
        notes: formData.notes,
      };
      if (formData.locationDisplay) {
        payload.location = formData.locationDisplay.split(',').map(s => s.trim()).filter(Boolean);
      }
      await updateUser(user.id, payload);
      toast.success('User updated successfully');
      onUserUpdated?.();
      handleClose();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string }; message?: string }; status?: number }; message?: string };
      let errorMessage = 'Failed to update user. Please try again.';
      if (err?.response?.data?.error?.message) errorMessage = err.response.data.error.message;
      else if (err?.response?.data?.message) errorMessage = err.response.data.message;
      else if (err?.message) errorMessage = err.message;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      department: '',
      roleId: '',
      status: 'active',
      location: [],
      assignedStores: [],
      primaryStoreId: '',
      notes: '',
      locationDisplay: '',
    });
    onClose();
  };

  const toggleStore = (code: string) => {
    const current = formData.assignedStores ?? [];
    const updated = current.includes(code)
      ? current.filter(c => c !== code)
      : [...current, code];
    const primary = formData.primaryStoreId && updated.includes(formData.primaryStoreId)
      ? formData.primaryStoreId
      : updated[0] ?? '';
    setFormData({ ...formData, assignedStores: updated, primaryStoreId: primary });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit User</DialogTitle>
          <DialogDescription>
            Update user information and role assignment
          </DialogDescription>
        </DialogHeader>

        {user && (
          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name *</Label>
                  <Input
                    id="edit-name"
                    type="text"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-department">Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Support">Support</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="Management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select
                    value={formData.roleId || ''}
                    onValueChange={(value) => setFormData({ ...formData, roleId: value })}
                    disabled={roles.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={roles.length > 0 ? 'Select Role' : 'No roles'} />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'active' | 'inactive' | 'suspended') =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-location">City / Zone</Label>
                  <Input
                    id="edit-location"
                    type="text"
                    placeholder="e.g. Bangalore, Zone 5"
                    value={formData.locationDisplay || ''}
                    onChange={(e) => setFormData({ ...formData, locationDisplay: e.target.value })}
                  />
                </div>
              </div>

              {/* Store Assignment */}
              <div className="space-y-3 border-t border-[#E5E7EB] pt-4">
                <h4 className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
                  <Store size={16} />
                  Assigned Stores
                </h4>

                {stores.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto border border-[#E5E7EB] rounded-lg p-2">
                      {stores.map((s) => {
                        const selected = (formData.assignedStores ?? []).includes(s.code);
                        const typeLabel = s.type === 'dark_store' ? 'Dark Store' : s.type === 'warehouse' ? 'Warehouse' : 'Store';
                        return (
                          <label
                            key={s.code}
                            className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                              selected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-[#F9FAFB] border border-transparent'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleStore(s.code)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium text-sm">{s.code}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{typeLabel}</Badge>
                            <span className="text-xs text-[#6B7280] truncate flex-1">{s.name}</span>
                          </label>
                        );
                      })}
                    </div>

                    {(formData.assignedStores ?? []).length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs">Primary Store</Label>
                        <Select
                          value={formData.primaryStoreId || ''}
                          onValueChange={(v) => setFormData({ ...formData, primaryStoreId: v })}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select primary" />
                          </SelectTrigger>
                          <SelectContent>
                            {(formData.assignedStores ?? []).map((code) => (
                              <SelectItem key={code} value={code}>{code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {(formData.assignedStores ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {(formData.assignedStores ?? []).map((code) => (
                          <Badge key={code} variant="secondary" className="gap-1 pr-1 text-xs">
                            {code}
                            {code === formData.primaryStoreId && (
                              <span className="text-[9px] text-blue-600 font-bold ml-0.5">PRIMARY</span>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleStore(code)}
                              className="ml-0.5 hover:bg-gray-300 rounded-full p-0.5"
                            >
                              <X size={10} />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-[#9CA3AF] italic">No stores available.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  placeholder="Internal notes..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
