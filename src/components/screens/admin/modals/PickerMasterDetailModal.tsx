import React, { useEffect, useState } from 'react';
import { AdminModal } from './AdminModal';
import { Button } from '@/components/ui/button';
import { getMasterPickerDetail, type MasterPickerDetail, type MasterPickerRow } from '../masterDataApi';
import { toast } from 'sonner';
import { resolvePickerOtpForRow } from '@/utils/pickerLocationOtp';

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
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title="Picker profile"
      maxWidth="max-w-lg"
      footer={
        d ? <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Close</Button> : undefined
      }
    >
        {loading && !d ? (
          <p className="text-sm text-gray-500 py-8 text-center">Loading...</p>
        ) : d ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 space-y-4 text-sm py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-gray-500">Name</span>
                <p className="font-medium">{d.name}</p>
              </div>
              <div>
                <span className="text-gray-500">Phone</span>
                <p>{d.phone}</p>
              </div>
              <div>
                <span className="text-gray-500">Status</span>
                <p className="font-mono">{d.status}</p>
              </div>
              <div>
                <span className="text-gray-500">Onboarding</span>
                <p className="capitalize">{(d as MasterPickerDetail).onboardingStage ?? d.onboardingStep}</p>
              </div>
              <div>
                <span className="text-gray-500">Location</span>
                <p>{(d as MasterPickerDetail).locationName ?? d.locationName}</p>
              </div>
              <div>
                <span className="text-gray-500">OTP</span>
                <p className="font-mono tracking-widest">
                  {resolvePickerOtpForRow({
                    id: d.id,
                    otp: (d as MasterPickerDetail).otp ?? d.otp,
                    currentLocationId: (d as MasterPickerDetail).currentLocationId ?? null,
                    otpLocationId: (d as MasterPickerDetail).otpLocationId ?? null,
                  }) ?? '—'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Last seen</span>
                <p>{formatTs(d.lastSeenAt)}</p>
              </div>
            </div>
            {(d as MasterPickerDetail).attendanceSummary && (
              <div className="rounded-lg border border-[#e4e4e7] p-3 bg-gray-50">
                <p className="font-semibold text-[#18181b] mb-2">Attendance (this month)</p>
                <p>Days worked: {(d as MasterPickerDetail).attendanceSummary!.daysWorkedThisMonth}</p>
                <p>Shifts recorded: {(d as MasterPickerDetail).attendanceSummary!.shiftsRecorded}</p>
                <p>Orders completed: {(d as MasterPickerDetail).attendanceSummary!.ordersCompletedThisMonth}</p>
              </div>
            )}
            <div>
              <span className="text-gray-500">Documents</span>
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
              <p className="text-gray-500">No device assigned</p>
            )}
          </div>
        ) : null}
    </AdminModal>
  );
}
