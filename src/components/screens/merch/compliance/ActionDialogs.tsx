import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ApprovalRequest } from './types';

interface ApproveDialogProps {
  request: ApprovalRequest | null;
  onClose: () => void;
  onConfirm: (note?: string) => void;
}

export function ApproveDialog({ request, onClose, onConfirm }: ApproveDialogProps) {
  const [note, setNote] = useState('');

  if (!request) return null;

  return (
    <AlertDialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve Request?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to approve <span>{request.title}</span>.
            {request.type === 'Price Change' && ` This will update the price to ₹${request.details.proposedPrice} immediately.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
             <Label>Approval Note (Optional)</Label>
             <Textarea 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                placeholder="e.g. Approved per weekly sync discussion"
                className="mt-2"
            />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(note)} className="bg-green-600 hover:bg-green-700">Confirm Approval</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface RejectDialogProps {
  request: ApprovalRequest | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function RejectDialog({ request, onClose, onConfirm }: RejectDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(false);

  if (!request) return null;

  const handleConfirm = (e: React.MouseEvent) => {
      e.preventDefault();
      if (!reason.trim()) {
          setError(true);
          return;
      }
      onConfirm(reason);
  };

  return (
    <AlertDialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Request?</AlertDialogTitle>
          <AlertDialogDescription>
             Please provide a reason for rejecting <span>{request.title}</span>. This will be sent to the requester.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
             <Label className={error ? 'text-red-600' : ''}>Reason for Rejection *</Label>
             <Textarea 
                value={reason} 
                onChange={(e) => { setReason(e.target.value); setError(false); }} 
                placeholder="e.g. Margin impact is too high, please revise..."
                className={`mt-2 ${error ? 'border-red-300 ring-red-200' : ''}`}
            />
            {error && <span className="text-xs text-red-600 mt-1">Reason is required.</span>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-red-600 hover:bg-red-700">Reject Request</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
