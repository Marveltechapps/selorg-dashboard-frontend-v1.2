import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getMasterPickerDetail, type MasterPickerDetail, type MasterPickerRow } from '../masterDataApi';
import { toast } from 'sonner';

interface PickerMasterDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: MasterPickerRow | null;
}

function formatTs(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '—';
  }
}

export function PickerMasterDetailModal({ open, onOpenChange, row }: PickerMasterDetailModalProps) {
  const [detail, setDetail] = useState<MasterPickerDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !row?.id) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getMasterPickerDetail(row.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e: any) => {
        if (!cancelled) toast.error(e?.message ?? 'Failed to load picker');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, row?.id]);

  const d = detail || row;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Picker profile</DialogTitle>
        </DialogHeader>
        {loading && !d ? (
          <p className="text-sm text-[#71717a] py-8 text-center">Loading…</p>
        ) : d ? (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[#71717a]">Name</span>
                <p className="font-medium">{d.name}</p>
              </div>
              <div>
                <span className="text-[#71717a]">Phone</span>
                <p>{d.phone}</p>
              </div>
              <div>
                <span className="text-[#71717a]">Status</span>
                <p className="font-mono">{d.status}</p>
              </div>
              <div>
                <span className="text-[#71717a]">Onboarding</span>
                <p className="capitalize">{(d as MasterPickerDetail).onboardingStage ?? d.onboardingStep}</p>
              </div>
              <div>
                <span className="text-[#71717a]">Location</span>
                <p>{(d as MasterPickerDetail).locationName ?? d.locationName}</p>
              </div>
              <div>
                <span className="text-[#71717a]">Last seen</span>
                <p>{formatTs(d.lastSeenAt)}</p>
              </div>
            </div>
            {(d as MasterPickerDetail).attendanceSummary && (
              <div className="rounded-lg border border-[#e4e4e7] p-3 bg-[#fafafa]">
                <p className="font-semibold text-[#18181b] mb-2">Attendance (this month)</p>
                <p>Days worked: {(d as MasterPickerDetail).attendanceSummary!.daysWorkedThisMonth}</p>
                <p>Shifts recorded: {(d as MasterPickerDetail).attendanceSummary!.shiftsRecorded}</p>
                <p>Orders completed: {(d as MasterPickerDetail).attendanceSummary!.ordersCompletedThisMonth}</p>
              </div>
            )}
            <div>
              <span className="text-[#71717a]">Documents</span>
              <p className="capitalize">{(d as MasterPickerDetail).docsStatus ?? '—'}</p>
            </div>
            {(d as MasterPickerDetail).device ? (
              <div className="rounded-lg border border-[#e4e4e7] p-3">
                <p className="font-semibold text-[#18181b] mb-2">Device</p>
                <p>ID: {(d as MasterPickerDetail).device!.deviceId}</p>
                <p>Serial: {(d as MasterPickerDetail).device!.serial || '—'}</p>
                <p>Status: {(d as MasterPickerDetail).device!.status}</p>
              </div>
            ) : (
              <p className="text-[#71717a]">No device assigned</p>
            )}
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
