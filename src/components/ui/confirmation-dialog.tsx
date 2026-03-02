import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';
import { AlertTriangle, Info, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from './utils';

/**
 * =============================
 * CONFIRMATION DIALOG COMPONENT
 * =============================
 * Replace all window.confirm() with this
 */

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'warning';
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  isLoading = false
}: ConfirmationDialogProps) {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const variantConfig = {
    default: {
      icon: Info,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonClass: 'bg-blue-600 hover:bg-blue-700'
    },
    destructive: {
      icon: Trash2,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      buttonClass: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      buttonClass: 'bg-yellow-600 hover:bg-yellow-700'
    }
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
              config.iconBg
            )}>
              <Icon className={cn("w-5 h-5", config.iconColor)} />
            </div>
            <div className="flex-1">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={config.buttonClass}
          >
            {isLoading ? 'Processing...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * ========================
 * DELETE CONFIRMATION
 * ========================
 * Pre-configured for delete actions
 */

interface DeleteConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteConfirmation({
  open,
  onOpenChange,
  itemName,
  onConfirm,
  isLoading
}: DeleteConfirmationProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Item"
      description={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      variant="destructive"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}

/**
 * =============================
 * BULK DELETE CONFIRMATION
 * =============================
 * Pre-configured for bulk delete actions
 */

interface BulkDeleteConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  itemType: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function BulkDeleteConfirmation({
  open,
  onOpenChange,
  count,
  itemType,
  onConfirm,
  isLoading
}: BulkDeleteConfirmationProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${count} ${itemType}${count > 1 ? 's' : ''}?`}
      description={`You are about to delete ${count} ${itemType}${count > 1 ? 's' : ''}. This action cannot be undone and will permanently remove all selected items.`}
      confirmText={`Delete ${count} ${itemType}${count > 1 ? 's' : ''}`}
      cancelText="Cancel"
      variant="destructive"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}

/**
 * ============================
 * STATUS CHANGE CONFIRMATION
 * ============================
 * Pre-configured for status changes
 */

interface StatusChangeConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  currentStatus: string;
  newStatus: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function StatusChangeConfirmation({
  open,
  onOpenChange,
  itemName,
  currentStatus,
  newStatus,
  onConfirm,
  isLoading
}: StatusChangeConfirmationProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change Status"
      description={`Change "${itemName}" from "${currentStatus}" to "${newStatus}"?`}
      confirmText="Change Status"
      cancelText="Cancel"
      variant="warning"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}

/**
 * =============================
 * CANCEL ORDER CONFIRMATION
 * =============================
 * Pre-configured for order cancellation
 */

interface CancelOrderConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function CancelOrderConfirmation({
  open,
  onOpenChange,
  orderId,
  onConfirm,
  isLoading
}: CancelOrderConfirmationProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel Order"
      description={`Are you sure you want to cancel order ${orderId}? The customer will be notified and a refund will be initiated if applicable.`}
      confirmText="Cancel Order"
      cancelText="Keep Order"
      variant="destructive"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}

/**
 * ============================
 * PUBLISH CONFIRMATION
 * ============================
 * Pre-configured for publishing actions
 */

interface PublishConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function PublishConfirmation({
  open,
  onOpenChange,
  itemName,
  onConfirm,
  isLoading
}: PublishConfirmationProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Publish Changes"
      description={`Publish "${itemName}"? This will make your changes live and visible to all users.`}
      confirmText="Publish"
      cancelText="Cancel"
      variant="default"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}

/**
 * =============================
 * UNSAVED CHANGES WARNING
 * =============================
 * Use when navigating away from forms
 */

interface UnsavedChangesWarningProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onSave?: () => void;
  isLoading?: boolean;
}

export function UnsavedChangesWarning({
  open,
  onOpenChange,
  onConfirm,
  onSave,
  isLoading
}: UnsavedChangesWarningProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-yellow-100">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                You have unsaved changes. Do you want to save before leaving?
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onConfirm} disabled={isLoading}>
            Discard Changes
          </AlertDialogCancel>
          {onSave && (
            <AlertDialogAction
              onClick={() => {
                onSave();
                onOpenChange(false);
              }}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Saving...' : 'Save & Continue'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * ===================================
 * HOOK: USE CONFIRMATION DIALOG
 * ===================================
 * Easy-to-use hook for confirmation dialogs
 */

export function useConfirmationDialog() {
  const [state, setState] = React.useState<{
    open: boolean;
    config: Omit<ConfirmationDialogProps, 'open' | 'onOpenChange'> | null;
  }>({
    open: false,
    config: null
  });

  const confirm = React.useCallback((
    config: Omit<ConfirmationDialogProps, 'open' | 'onOpenChange'>
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        config: {
          ...config,
          onConfirm: () => {
            config.onConfirm();
            resolve(true);
          },
          onCancel: () => {
            config.onCancel?.();
            resolve(false);
          }
        }
      });
    });
  }, []);

  const close = React.useCallback(() => {
    setState({ open: false, config: null });
  }, []);

  const Dialog = React.useMemo(() => {
    if (!state.config) return null;

    return (
      <ConfirmationDialog
        {...state.config}
        open={state.open}
        onOpenChange={close}
      />
    );
  }, [state, close]);

  return {
    confirm,
    close,
    Dialog
  };
}

/**
 * ====================
 * USAGE EXAMPLES
 * ====================
 * 
 * // Basic usage:
 * const [showDialog, setShowDialog] = useState(false);
 * 
 * <ConfirmationDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   title="Delete Item"
 *   description="Are you sure?"
 *   variant="destructive"
 *   onConfirm={() => deleteItem()}
 * />
 * 
 * // Using the hook:
 * const { confirm, Dialog } = useConfirmationDialog();
 * 
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Delete Item',
 *     description: 'Are you sure?',
 *     variant: 'destructive',
 *     onConfirm: () => {}
 *   });
 *   
 *   if (confirmed) {
 *     // Do the delete
 *   }
 * };
 * 
 * return (
 *   <>
 *     <Button onClick={handleDelete}>Delete</Button>
 *     {Dialog}
 *   </>
 * );
 */
