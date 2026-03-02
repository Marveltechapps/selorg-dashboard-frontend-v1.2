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
import { Role, CreateUserPayload, createUser, fetchRoles, fetchAllStores, StoreOption } from '../userManagementApi';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { X, Store } from 'lucide-react';

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onUserAdded?: () => void;
}

export function AddUserModal({ open, onClose, onUserAdded }: AddUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [formData, setFormData] = useState<CreateUserPayload>({
    email: '',
    name: '',
    department: '',
    roleId: '',
    assignedStores: [],
    primaryStoreId: '',
    twoFactorEnabled: false,
    sendInvite: true,
    startDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (open) {
      loadRoles();
      fetchAllStores().then(setStores).catch(() => setStores([]));
    }
  }, [open]);

  const loadRoles = async () => {
    try {
      const data = await fetchRoles();
      console.log('Roles loaded:', data);
      setRoles(data);
      if (data.length === 0) {
        toast.warning('No roles available. Please create a role first.');
      } else {
        console.log(`Loaded ${data.length} roles successfully`);
      }
    } catch (error: any) {
      console.error('Failed to load roles:', error);
      // fetchRoles already has fallback, so try again
      try {
        const fallbackData = await fetchRoles();
        setRoles(fallbackData);
        if (fallbackData.length > 0) {
          toast.warning('Using fallback roles data');
        } else {
          toast.error('No roles available. Please create a role first.');
        }
      } catch (fallbackError) {
        toast.error('Failed to load roles. Please check your connection.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submission:', formData);
    
    // Validation
    if (!formData.email || !formData.name || !formData.department || !formData.roleId) {
      const missingFields = [];
      if (!formData.email) missingFields.push('Email');
      if (!formData.name) missingFields.push('Name');
      if (!formData.department) missingFields.push('Department');
      if (!formData.roleId) missingFields.push('Role');
      
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating user with payload:', formData);
      const result = await createUser(formData);
      console.log('User created successfully:', result);
      toast.success('User created successfully. Default password has been set - user should reset it on first login.');
      onUserAdded?.();
      handleClose();
    } catch (error: any) {
      console.error('Create user error:', error);
      // Extract error message from different possible error formats
      let errorMessage = 'Failed to create user. Please try again.';
      
      if (error?.response?.status === 403) {
        const errorData = error?.response?.data;
        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        } else {
          errorMessage = 'Permission denied. You do not have the "create_users" permission.';
        }
        // Add helpful message about logging out and back in
        toast.error(errorMessage, {
          duration: 6000,
          description: 'Please log out and log back in to refresh your permissions. If the issue persists, contact your administrator.',
        });
      } else if (error?.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
        // Redirect to login after a delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (error?.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        duration: 5000,
        description: error?.response?.status === 403 
          ? 'Your current role does not have permission to create users. Please contact your system administrator.'
          : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultForm: CreateUserPayload = {
    email: '',
    name: '',
    department: '',
    roleId: '',
    assignedStores: [],
    primaryStoreId: '',
    twoFactorEnabled: false,
    sendInvite: true,
    startDate: new Date().toISOString().split('T')[0],
  };

  const handleClose = () => {
    setFormData(defaultForm);
    onClose();
  };

  const handleClear = () => {
    setFormData(defaultForm);
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

  const selectedRole = roles.find(r => r.id === formData.roleId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account and assign roles and permissions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Section 1: Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#1F2937]">Personal Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <p className="text-xs text-[#6B7280]">User will receive invite at this email</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
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
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Access Configuration */}
          <div className="space-y-4 border-t border-[#E5E7EB] pt-4">
            <h3 className="text-lg font-bold text-[#1F2937]">Access Configuration</h3>
            
            <div className="space-y-2">
              <Label htmlFor="role">Assign Role *</Label>
              <Select 
                value={formData.roleId || ""} 
                onValueChange={(value) => {
                  console.log('Role selected:', value);
                  setFormData(prev => ({ ...prev, roleId: value }));
                }}
                disabled={roles.length === 0 || loading}
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder={roles.length > 0 ? "Select Role" : "Loading roles..."} />
                </SelectTrigger>
                <SelectContent>
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_roles__" disabled>No roles available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#6B7280]">User will have permissions of selected role</p>
              {formData.roleId && (
                <p className="text-xs text-emerald-600">✓ Role selected</p>
              )}
            </div>

            {selectedRole && (
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-4 rounded-lg">
                <div className="text-sm font-medium text-[#1F2937] mb-2">Access Level (Auto-populated)</div>
                <div className="text-sm text-[#6B7280]">
                  <strong>Role:</strong> {selectedRole.name}
                </div>
                <div className="text-sm text-[#6B7280]">
                  <strong>Scope:</strong> {selectedRole.accessScope === 'global' ? 'Full Access' : 'Zone Limited'}
                </div>
                <div className="text-sm text-[#6B7280]">
                  <strong>Permissions:</strong> {selectedRole.permissions.length} permissions assigned
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Store Assignment */}
          <div className="space-y-4 border-t border-[#E5E7EB] pt-4">
            <h3 className="text-lg font-bold text-[#1F2937] flex items-center gap-2">
              <Store size={18} />
              Store Assignment
            </h3>
            <p className="text-xs text-[#6B7280]">
              Assign stores/darkstores this user can access. For darkstore operators, this determines which store dashboard they see.
            </p>

            {stores.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border border-[#E5E7EB] rounded-lg p-3">
                  {stores.map((s) => {
                    const selected = (formData.assignedStores ?? []).includes(s.code);
                    const typeLabel = s.type === 'dark_store' ? 'Dark Store' : s.type === 'warehouse' ? 'Warehouse' : 'Store';
                    return (
                      <label
                        key={s.code}
                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                          selected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-[#F9FAFB] border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleStore(s.code)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{s.code}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {typeLabel}
                            </Badge>
                          </div>
                          <span className="text-xs text-[#6B7280] truncate block">{s.name}</span>
                        </div>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          s.status === 'active' ? 'bg-emerald-400' : s.status === 'maintenance' ? 'bg-amber-400' : 'bg-gray-300'
                        }`} />
                      </label>
                    );
                  })}
                </div>

                {(formData.assignedStores ?? []).length > 0 && (
                  <div className="space-y-2">
                    <Label>Primary Store</Label>
                    <Select
                      value={formData.primaryStoreId || ''}
                      onValueChange={(v) => setFormData({ ...formData, primaryStoreId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select primary store" />
                      </SelectTrigger>
                      <SelectContent>
                        {(formData.assignedStores ?? []).map((code) => (
                          <SelectItem key={code} value={code}>{code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#6B7280]">The default store shown when this user logs in</p>
                  </div>
                )}

                {(formData.assignedStores ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(formData.assignedStores ?? []).map((code) => (
                      <Badge key={code} variant="secondary" className="gap-1 pr-1">
                        {code}
                        {code === formData.primaryStoreId && (
                          <span className="text-[9px] text-blue-600 font-bold ml-0.5">PRIMARY</span>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleStore(code)}
                          className="ml-0.5 hover:bg-gray-300 rounded-full p-0.5"
                        >
                          <X size={12} />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#9CA3AF] italic">No stores available. Create stores in Store & Warehouse Management first.</p>
            )}
          </div>

          {/* Section 4: Security Settings */}
          <div className="space-y-4 border-t border-[#E5E7EB] pt-4">
            <h3 className="text-lg font-bold text-[#1F2937]">Security Settings</h3>
            
            <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg">
              <div>
                <Label htmlFor="twoFactor" className="text-sm font-medium">Two-Factor Authentication</Label>
                <p className="text-xs text-[#6B7280]">Require authenticator app or SMS for login</p>
              </div>
              <Switch
                id="twoFactor"
                checked={formData.twoFactorEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, twoFactorEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg">
              <div>
                <Label htmlFor="sendInvite" className="text-sm font-medium">Send Invite Email</Label>
                <p className="text-xs text-[#6B7280]">User will receive email with setup link</p>
              </div>
              <Switch
                id="sendInvite"
                checked={formData.sendInvite}
                onCheckedChange={(checked) => setFormData({ ...formData, sendInvite: checked })}
              />
            </div>
          </div>

          {/* Section 5: Additional Information */}
          <div className="space-y-4 border-t border-[#E5E7EB] pt-4">
            <h3 className="text-lg font-bold text-[#1F2937]">Additional Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Internal Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any internal notes about this user..."
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-[#E5E7EB] pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={handleClear}>
              Clear
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
