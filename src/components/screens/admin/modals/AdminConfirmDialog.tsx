import React from 'react';
import { AdminModal } from './AdminModal';
import { AdminFormBody } from './AdminForm';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface AdminConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function AdminConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  loading = false,
  onConfirm,
}: AdminConfirmDialogProps) {
  const handleConfirm = () => {
    void Promise.resolve(onConfirm());
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      icon={
        variant === 'destructive' ? (
          <AlertTriangle size={20} className="text-rose-600" />
        ) : undefined
      }
      maxWidth="max-w-sm"
      footer={
        <div className="flex w-full justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      }
    >
      <AdminFormBody>
        <div className="text-sm text-[#6B7280] leading-relaxed">{description}</div>
      </AdminFormBody>
    </AdminModal>
  );
}
