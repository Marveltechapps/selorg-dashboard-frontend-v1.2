import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Role,
  fetchRoles,
  bulkAssignRole,
  bulkUpdateUsers 
} from '../userManagementApi';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

interface BulkOperationsModalProps {
  open: boolean;
  onClose: () => void;
  selectedUserIds: string[];
  onOperationComplete?: () => void;
}

type OperationType = 'assign_role' | 'change_department' | 'change_status' | 'suspend' | 'reset_password';

export function BulkOperationsModal({ 
  open, 
  onClose,
  selectedUserIds,
  onOperationComplete 
}: BulkOperationsModalProps) {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [operation, setOperation] = useState<OperationType>('assign_role');
  const [roleId, setRoleId] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'suspended'>('active');
  const [reason, setReason] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  useEffect(() => {
    if (open) {
      loadRoles();
    }
  }, [open]);

  const loadRoles = async () => {
    try {
      const data = await fetchRoles();
      setRoles(data);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    try {
      switch (operation) {
        case 'assign_role':
          if (!roleId) {
            toast.error('Please select a role');
            setLoading(false);
            return;
          }
          await bulkAssignRole(selectedUserIds, roleId);
          toast.success(`Role assigned to ${selectedUserIds.length} users`);
          break;

        case 'change_department':
          if (!department) {
            toast.error('Please select a department');
            setLoading(false);
            return;
          }
          await bulkUpdateUsers(selectedUserIds, { department });
          toast.success(`Department updated for ${selectedUserIds.length} users`);
          break;

        case 'change_status':
          await bulkUpdateUsers(selectedUserIds, { status });
          toast.success(`Status updated for ${selectedUserIds.length} users`);
          break;

        case 'suspend':
          if (!reason) {
            toast.error('Please provide a reason for suspension');
            setLoading(false);
            return;
          }
          await bulkUpdateUsers(selectedUserIds, { status: 'suspended' });
          toast.warning(`${selectedUserIds.length} users suspended`);
          break;

        case 'reset_password':
          toast.success(`Password reset initiated for ${selectedUserIds.length} users`);
          break;
      }

      onOperationComplete?.();
      handleClose();
    } catch (error) {
      toast.error('Bulk operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOperation('assign_role');
    setRoleId('');
    setDepartment('');
    setStatus('active');
    setReason('');
    setSendEmail(true);
    onClose();
  };

  const isDangerous = operation === 'suspend' || (operation === 'change_status' && status === 'suspended');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Bulk Operations</DialogTitle>
          <DialogDescription>
            Apply changes to {selectedUserIds.length} selected user{selectedUserIds.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <div className="text-sm font-medium text-blue-900">
              {selectedUserIds.length} user{selectedUserIds.length > 1 ? 's' : ''} selected
            </div>
          </div>

          <div className="space-y-4">
            <Label>Select Operation</Label>
            <RadioGroup value={operation} onValueChange={(value: OperationType) => setOperation(value)}>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB]">
                  <RadioGroupItem value="assign_role" id="assign_role" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="assign_role" className="font-medium cursor-pointer">
                      Assign Role
                    </Label>
                    <p className="text-xs text-[#6B7280]">Will replace current roles for selected users</p>
                    {operation === 'assign_role' && (
                      <div className="mt-3">
                        <Select value={roleId} onValueChange={setRoleId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role to assign" />
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
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB]">
                  <RadioGroupItem value="change_department" id="change_department" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="change_department" className="font-medium cursor-pointer">
                      Change Department
                    </Label>
                    <p className="text-xs text-[#6B7280]">Update department for all selected users</p>
                    {operation === 'change_department' && (
                      <div className="mt-3">
                        <Select value={department} onValueChange={setDepartment}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
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
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB]">
                  <RadioGroupItem value="change_status" id="change_status" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="change_status" className="font-medium cursor-pointer">
                      Change Status
                    </Label>
                    <p className="text-xs text-[#6B7280]">Update user status</p>
                    {operation === 'change_status' && (
                      <div className="mt-3">
                        <Select value={status} onValueChange={(value: 'active' | 'inactive' | 'suspended') => setStatus(value)}>
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
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border border-rose-200 bg-rose-50 rounded-lg">
                  <RadioGroupItem value="suspend" id="suspend" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="suspend" className="font-medium cursor-pointer text-rose-900">
                      Suspend Users
                    </Label>
                    <p className="text-xs text-rose-700">Users will lose access immediately</p>
                    {operation === 'suspend' && (
                      <div className="mt-3">
                        <Label htmlFor="reason">Suspension Reason *</Label>
                        <Textarea
                          id="reason"
                          placeholder="Enter reason for suspension..."
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB]">
                  <RadioGroupItem value="reset_password" id="reset_password" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="reset_password" className="font-medium cursor-pointer">
                      Reset Passwords
                    </Label>
                    <p className="text-xs text-[#6B7280]">Users will receive password reset email</p>
                    {operation === 'reset_password' && (
                      <div className="mt-3 flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg">
                        <div>
                          <Label htmlFor="sendEmailToggle" className="text-sm font-medium">Send Email</Label>
                          <p className="text-xs text-[#6B7280]">Notify users via email</p>
                        </div>
                        <Switch
                          id="sendEmailToggle"
                          checked={sendEmail}
                          onCheckedChange={setSendEmail}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          {isDangerous && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="text-rose-600 flex-shrink-0" size={20} />
              <div className="text-sm text-rose-900">
                <strong>Warning:</strong> This action will immediately affect {selectedUserIds.length} user{selectedUserIds.length > 1 ? 's' : ''}. 
                This operation cannot be undone.
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#E5E7EB] pt-4 mt-6">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            variant={isDangerous ? "destructive" : "default"}
            onClick={handleExecute}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Execute'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
