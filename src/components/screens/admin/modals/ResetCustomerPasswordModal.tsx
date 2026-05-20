import React, { useState } from 'react';
import { AdminModal } from './AdminModal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Customer, PasswordInfo, resetCustomerPassword } from '../customerManagementApi';
import { toast } from 'sonner';
import { KeyRound, Loader2, Copy } from 'lucide-react';

interface ResetCustomerPasswordModalProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onPasswordUpdated?: (info: PasswordInfo, newPassword: string) => void;
}

export function ResetCustomerPasswordModal({
  open,
  onClose,
  customer,
  onPasswordUpdated,
}: ResetCustomerPasswordModalProps) {
  const [loading, setLoading] = useState(false);
  const [sendSms, setSendSms] = useState(true);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const handleClose = () => {
    setNewPassword(null);
    setSendSms(true);
    onClose();
  };

  const handleReset = async () => {
    if (!customer) return;
    const label = customer.name || customer.phoneNumber || 'this customer';
    if (!confirm(`Reset password for ${label}? They will need the new temporary password to sign in.`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await resetCustomerPassword(customer._id, { sendSms });
      setNewPassword(result.newPassword);
      onPasswordUpdated?.(result.passwordInfo, result.newPassword);
      toast.success(
        result.smsSent
          ? 'Password reset and SMS sent'
          : sendSms && customer.phoneNumber
            ? 'Password reset (SMS could not be sent)'
            : 'Password reset successfully'
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to reset password';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = async () => {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      toast.success('Password copied to clipboard');
    } catch {
      toast.error('Could not copy password');
    }
  };

  const customerLabel = customer
    ? `${customer.name || 'Customer'} · ${customer.phoneNumber}`
    : undefined;

  return (
    <AdminModal
      open={open}
      onOpenChange={(next) => !next && handleClose()}
      title="Reset Customer Password"
      subtitle={customerLabel}
      icon={<KeyRound size={20} />}
      maxWidth="max-w-md"
      footer={
        <div className="flex w-full justify-end gap-3">
          {newPassword ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={() => void handleReset()} disabled={loading || !customer}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting…
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </>
          )}
        </div>
      }
    >
      {!customer ? null : newPassword ? (
        <div className="space-y-4 p-1">
          <p className="text-sm text-[#6B7280]">
            Share this temporary password securely with the customer. They can use it where password sign-in is supported.
          </p>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <Label className="text-xs text-emerald-800">Temporary password</Label>
            <div className="mt-2 flex items-center justify-between gap-3">
              <code className="text-lg font-semibold tracking-wide text-emerald-900">{newPassword}</code>
              <Button type="button" variant="outline" size="sm" onClick={() => void copyPassword()}>
                <Copy size={14} className="mr-1" />
                Copy
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-1">
          <p className="text-sm text-[#6B7280]">
            A new temporary password will be generated and stored for this customer account.
          </p>
          <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <div>
              <Label htmlFor="send-reset-sms" className="text-sm font-medium">
                Send SMS notification
              </Label>
              <p className="text-xs text-[#6B7280]">
                {customer.phoneNumber
                  ? `Text the temporary password to ${customer.phoneNumber}`
                  : 'No phone number on file — SMS unavailable'}
              </p>
            </div>
            <Switch
              id="send-reset-sms"
              checked={sendSms}
              onCheckedChange={setSendSms}
              disabled={!customer.phoneNumber}
            />
          </div>
        </div>
      )}
    </AdminModal>
  );
}
