import React, { useState } from 'react';
import { AdminModal } from './AdminModal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { User, resetUserPassword } from '../userManagementApi';
import { toast } from 'sonner';
import { KeyRound, Loader2, Copy } from 'lucide-react';

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

export function ResetPasswordModal({ open, onClose, user }: ResetPasswordModalProps) {
  const [loading, setLoading] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const handleClose = () => {
    setNewPassword(null);
    setSendEmail(true);
    onClose();
  };

  const handleReset = async () => {
    if (!user) return;
    if (!confirm(`Reset password for ${user.name}? They will need the new temporary password to sign in.`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await resetUserPassword(user.id, { sendEmail });
      setNewPassword(result.newPassword);
      toast.success(result.emailSent ? 'Password reset and email sent' : 'Password reset successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reset password');
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

  return (
    <AdminModal
      open={open}
      onOpenChange={(next) => !next && handleClose()}
      title="Reset Password"
      subtitle={user ? `${user.name} · ${user.email}` : undefined}
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
              <Button onClick={() => void handleReset()} disabled={loading || !user}>
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
      {!user ? null : newPassword ? (
        <div className="space-y-4 p-1">
          <p className="text-sm text-[#6B7280]">
            Share this temporary password securely with the user. They should change it after signing in.
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
            A new temporary password will be generated. The user&apos;s dashboard login will be updated.
          </p>
          <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <div>
              <Label htmlFor="send-reset-email" className="text-sm font-medium">
                Send email notification
              </Label>
              <p className="text-xs text-[#6B7280]">Email the temporary password to {user.email}</p>
            </div>
            <Switch id="send-reset-email" checked={sendEmail} onCheckedChange={setSendEmail} />
          </div>
        </div>
      )}
    </AdminModal>
  );
}
