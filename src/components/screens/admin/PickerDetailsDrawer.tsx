import React, { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActionLogsTimeline } from '@/components/ui/action-logs-timeline';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, FileText, CreditCard, CheckCircle2, XCircle, Ban, Clock, Smartphone, Link2, Unlink } from 'lucide-react';
import {
  PickerApprovalDetails,
  fetchPickerDetails,
  updatePickerStatus,
  fetchPickerActionLogs,
  linkPickerHhd,
  unlinkPickerHhd,
  approveDocument,
  rejectDocument,
  fetchPickerTrainingProgress,
  reviewBankAccount,
  fetchPickerFaceVerification,
  overrideFaceVerification,
  PickerStatus,
  type PickerFaceVerificationData,
} from './pickerApprovalsApi';
import { toast } from 'sonner';
import {
  fetchAgencies,
  fetchStoreShiftSlots,
  sendPickerPushNotification,
  updatePickerAssignment,
  type AgencyItem,
  type ShiftSlotItem,
} from '@/api/admin/pickerOpsApi';
import { fetchStores, type Store } from './storeWarehouseApi';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { normalizePickerDocSide, type PickerDocSidePayload } from '@/utils/resolveMediaUrl';

const STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  BLOCKED: 'bg-red-50 text-red-700 border-red-200',
  SUSPENDED: 'bg-gray-50 text-gray-700 border-gray-200',
  APPROVED: 'bg-green-50 text-green-700 border-green-200',
  DEACTIVATED: 'bg-gray-50 text-gray-700 border-gray-200',
};

const FACE_APPROVED_STATUSES = new Set(['verified', 'overridden_approved']);
const FACE_REJECTED_STATUSES = new Set(['rejected', 'overridden_rejected']);

function faceStatusFromPicker(picker: PickerApprovalDetails): PickerFaceVerificationData {
  const rec = picker.faceVerificationRecord;
  const status = rec?.status || (picker.faceVerification ? 'verified' : 'pending');
  return {
    status,
    verifiedAt: rec?.verifiedAt ?? null,
    confidence: rec?.confidence ?? null,
    faceVerification: !!picker.faceVerification,
    overrideReason: rec?.overrideReason,
    overrideAt: rec?.overrideAt ?? null,
  };
}

function formatFaceStatusLabel(status: string): string {
  switch (status) {
    case 'overridden_approved':
      return 'Approved';
    case 'overridden_rejected':
      return 'Rejected';
    case 'verified':
      return 'Verified';
    case 'pending':
      return 'Pending';
    case 'rejected':
      return 'Rejected';
    default:
      return status.replace(/_/g, ' ');
  }
}

function faceStatusBadgeClass(status: string, isApproved: boolean, isRejected: boolean): string {
  if (isApproved) return 'bg-green-50 text-green-700 border-green-200';
  if (isRejected) return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-yellow-50 text-yellow-700 border-yellow-200';
}

/** Normalize ops list status (lowercase) and DB status (uppercase) for drawer UI */
function normalizePickerStatus(status?: string): PickerStatus {
  const s = (status || 'PENDING').toUpperCase();
  if (s === 'APPROVED') return 'ACTIVE';
  if (s === 'DEACTIVATED') return 'BLOCKED';
  if (['PENDING', 'ACTIVE', 'REJECTED', 'BLOCKED', 'SUSPENDED'].includes(s)) {
    return s as PickerStatus;
  }
  return 'PENDING';
}

interface Props {
  picker: PickerApprovalDetails | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onPickerUpdated?: (picker: PickerApprovalDetails) => void;
}

export function PickerDetailsDrawer({ picker, open, onClose, onRefresh, onPickerUpdated }: Props) {
  const [actionLoading, setActionLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [hhdUserIdInput, setHhdUserIdInput] = useState('');
  const [rejectReasonOpen, setRejectReasonOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [actionLogsLoading, setActionLogsLoading] = useState(false);
  const [trainingRows, setTrainingRows] = useState<Array<{ videoId: string; title: string; watchedSeconds: number; duration: number; progress: number; completed: boolean; completedAt: string | null }>>([]);
  const [faceVerification, setFaceVerification] = useState<PickerFaceVerificationData | null>(null);
  const [faceActionLoading, setFaceActionLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [agencies, setAgencies] = useState<AgencyItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [shiftSlots, setShiftSlots] = useState<ShiftSlotItem[]>([]);
  const [agencyId, setAgencyId] = useState<string>('none');
  const [storeId, setStoreId] = useState<string>('none');
  const [shiftSlotId, setShiftSlotId] = useState<string>('none');
  const [docReject, setDocReject] = useState<{ open: boolean; docType: 'aadhar' | 'pan'; side: 'front' | 'back' } | null>(null);
  const [docRejectReason, setDocRejectReason] = useState('');

  const overallTrainingCompleted = useMemo(
    () => trainingRows.length > 0 && trainingRows.every((row) => row.completed),
    [trainingRows]
  );

  const faceState = useMemo((): PickerFaceVerificationData => {
    if (faceVerification) return faceVerification;
    if (picker) return faceStatusFromPicker(picker);
    return {
      status: 'pending',
      verifiedAt: null,
      confidence: null,
      faceVerification: false,
    };
  }, [faceVerification, picker]);

  const faceStatusKey = (faceState.status || 'pending').toLowerCase();
  const faceIsApproved =
    FACE_APPROVED_STATUSES.has(faceStatusKey) || faceState.faceVerification;
  const faceIsRejected = FACE_REJECTED_STATUSES.has(faceStatusKey);
  const faceIsPending = !faceIsApproved && !faceIsRejected;

  const handleStatusUpdate = async (status: PickerStatus, reason?: string) => {
    if (!picker) return;
    setActionLoading(true);
    try {
      await updatePickerStatus(picker.pickerId, status, reason);
      toast.success(`Picker ${status.toLowerCase()}`);
      onRefresh();
      onClose();
      setRejectReasonOpen(false);
      setRejectReason('');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = () => {
    if (rejectReason.trim()) {
      handleStatusUpdate('REJECTED', rejectReason.trim());
    } else {
      toast.error('Please provide a rejection reason');
    }
  };

  const handleRequestReupload = () => {
    handleStatusUpdate('REJECTED', 'Please re-upload documents');
  };

  const handleLinkHhd = async () => {
    if (!picker || !hhdUserIdInput.trim()) return;
    setLinkLoading(true);
    try {
      await linkPickerHhd(picker.pickerId, hhdUserIdInput.trim());
      toast.success('Picker linked to HHD user');
      onRefresh();
      const detailed = await fetchPickerDetails(picker.pickerId);
      onPickerUpdated?.(detailed);
      setHhdUserIdInput('');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to link HHD');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleUnlinkHhd = async () => {
    if (!picker) return;
    setLinkLoading(true);
    try {
      await unlinkPickerHhd(picker.pickerId);
      toast.success('Picker unlinked from HHD');
      onRefresh();
      const detailed = await fetchPickerDetails(picker.pickerId);
      onPickerUpdated?.(detailed);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to unlink HHD');
    } finally {
      setLinkLoading(false);
    }
  };

  const displayStatus = picker ? normalizePickerStatus(picker.status) : 'PENDING';

  useEffect(() => {
    if (!open) return;
    fetchAgencies().then(setAgencies).catch(() => setAgencies([]));
    fetchStores({ limit: 200, type: 'store' })
      .then((r) => setStores(r.data))
      .catch(() => setStores([]));
  }, [open]);

  useEffect(() => {
    if (!open || !picker?.pickerId) {
      setFaceVerification(null);
      return;
    }
    setFaceVerification(faceStatusFromPicker(picker));
  }, [open, picker?.pickerId, picker?.faceVerificationRecord, picker?.faceVerification]);

  useEffect(() => {
    if (!open || !picker?.pickerId) return;
    setAgencyId((picker as { agencyId?: string; agency?: { _id?: string } }).agencyId || picker.agency?._id || 'none');
    setStoreId((picker as { storeId?: string; store?: { _id?: string } }).storeId || picker.store?._id || 'none');
    setShiftSlotId((picker as { shiftSlotId?: string; shiftSlot?: { _id?: string } }).shiftSlotId || picker.shiftSlot?._id || 'none');
  }, [open, picker?.pickerId, picker]);

  useEffect(() => {
    if (!open) return;
    if (!storeId || storeId === 'none') {
      setShiftSlots([]);
      setShiftSlotId('none');
      return;
    }
    fetchStoreShiftSlots(storeId)
      .then(setShiftSlots)
      .catch(() => setShiftSlots([]));
  }, [open, storeId]);

  if (!open) return null;

  const refreshPickerDetails = async () => {
    if (!picker?.pickerId) return;
    const detailed = await fetchPickerDetails(picker.pickerId);
    onPickerUpdated?.(detailed);
  };

  const refreshFaceVerification = async () => {
    if (!picker?.pickerId) return;
    const [faceRes, detailed] = await Promise.all([
      fetchPickerFaceVerification(picker.pickerId),
      fetchPickerDetails(picker.pickerId),
    ]);
    setFaceVerification(faceRes.data);
    onPickerUpdated?.(detailed);
  };

  const docThumb = (
    label: string,
    docType: 'aadhar' | 'pan',
    side: 'front' | 'back',
    rawPayload?: PickerDocSidePayload
  ) => {
    const payload = normalizePickerDocSide(rawPayload);
    const imageUrl = payload?.url ?? null;
    return (
      <div className="border rounded-lg p-3 space-y-2" key={`${docType}-${side}`}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{label}</p>
          <Badge variant="outline" className="capitalize shrink-0">
            {payload?.status || 'pending'}
          </Badge>
        </div>
        {imageUrl ? (
          <a href={imageUrl} target="_blank" rel="noreferrer" className="block">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-md border bg-gray-50">
              <ImageWithFallback
                src={imageUrl}
                alt={label}
                className="w-full h-full object-contain"
              />
            </div>
          </a>
        ) : (
          <p className="text-xs text-gray-500 py-8 text-center border rounded-md bg-gray-50">
            Not uploaded
          </p>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={reviewLoading || !imageUrl}
            onClick={async () => {
              if (!picker) return;
              setReviewLoading(true);
              try {
                await approveDocument(picker.pickerId, docType, side);
                toast.success('Document approved');
                await refreshPickerDetails();
                onRefresh();
              } finally {
                setReviewLoading(false);
              }
            }}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={reviewLoading || !imageUrl}
            onClick={() => {
              if (!picker) return;
              setDocReject({ open: true, docType, side });
              setDocRejectReason(payload?.rejectionReason || '');
            }}
          >
            Reject
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col h-full bg-white">
        <div className="p-6 border-b border-gray-100">
          {!picker ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-6 bg-gray-200 rounded w-2/3" />
            </div>
          ) : (
          <>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              Picker Profile
            </span>
            <Badge
              variant="outline"
              className={`ml-auto capitalize ${STATUS_BADGE_CLASSES[displayStatus] || ''}`}
            >
              {displayStatus}
            </Badge>
          </div>
          <SheetTitle className="text-xl font-bold text-gray-900">
            {picker.name || 'Unnamed Picker'}
          </SheetTitle>
          <SheetDescription className="hidden">
            Detailed view of picker {picker?.pickerId}
          </SheetDescription>
          </>
          )}
        </div>

        <Tabs defaultValue="profile" className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 pt-2 border-b border-gray-100">
            <TabsList className="bg-gray-100 flex-wrap h-auto">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger
                value="documents"
                onClick={() => {
                  if (!picker?.pickerId) return;
                  void refreshPickerDetails().catch(() => {
                    toast.error('Failed to refresh documents');
                  });
                }}
              >
                Documents
              </TabsTrigger>
              <TabsTrigger
                value="training"
                onClick={() => {
                  if (!picker?.pickerId) return;
                  fetchPickerTrainingProgress(picker.pickerId)
                    .then((res) => setTrainingRows(res.data.videos || []))
                    .catch(() => setTrainingRows([]));
                }}
              >
                Training
              </TabsTrigger>
              <TabsTrigger value="bank">Bank</TabsTrigger>
              <TabsTrigger
                value="face"
                onClick={() => {
                  if (!picker?.pickerId) return;
                  void refreshFaceVerification().catch(() => {
                    toast.error('Failed to load face verification');
                  });
                }}
              >
                Face Verification
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                onClick={() => {
                  if (picker?.pickerId) {
                    setActionLogsLoading(true);
                    fetchPickerActionLogs(picker.pickerId)
                      .then((data) => setActionLogs(Array.isArray(data) ? data : []))
                      .catch(() => setActionLogs([]))
                      .finally(() => setActionLogsLoading(false));
                  }
                }}
              >
                Action Logs
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="profile" className="flex-1 overflow-y-auto mt-0">
        <ScrollArea
          className="flex-1 overflow-y-auto"
          style={{ height: 'calc(100vh - 320px)', maxHeight: 'calc(100vh - 320px)' }}
        >
          <div className="p-6 space-y-6">
          {!picker ? (
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-gray-100 rounded" />
              <div className="h-32 bg-gray-100 rounded" />
              <div className="h-24 bg-gray-100 rounded" />
            </div>
          ) : (
            <>
            {/* Basic Info */}
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100">
                <User size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{picker.name || '—'}</h4>
                <p className="text-sm text-gray-500">{picker.phone || '—'}</p>
                <p className="text-xs text-gray-400 mt-1">ID: {picker.pickerId}</p>
              </div>
            </div>

            <Separator />

            {/* Profile Info */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <User size={18} /> Profile
              </h4>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Site / Location</span>
                  <span className="font-medium">
                    {picker.site || (picker as { locationName?: string }).locationName || picker.locationType || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Onboarding Stage</span>
                  <span className="font-medium capitalize">{picker.onboardingStage || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Docs Status</span>
                  <span className="font-medium capitalize">{picker.docsStatus?.replace('_', ' ') || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Training</span>
                  <span className="font-medium">{picker.trainingProgress ?? 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Applied</span>
                  <span className="font-medium">
                    {picker.appliedDate ? new Date(picker.appliedDate).toLocaleString() : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <User size={18} /> Assignment
              </h4>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-3 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Agency</Label>
                    <Select value={agencyId} onValueChange={setAgencyId} disabled={assignmentLoading}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select agency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {agencies.map((a) => (
                          <SelectItem key={a.agencyId} value={a.agencyId}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Store</Label>
                    <Select value={storeId} onValueChange={setStoreId} disabled={assignmentLoading}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select store" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {stores.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Shift slot</Label>
                    <Select
                      value={shiftSlotId}
                      onValueChange={setShiftSlotId}
                      disabled={assignmentLoading || storeId === 'none' || shiftSlots.length === 0}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder={storeId === 'none' ? 'Pick store first' : 'Select slot'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {shiftSlots.map((slot) => (
                          <SelectItem key={slot.shiftSlotId} value={slot.shiftSlotId}>
                            {String(slot.type).toUpperCase()} • {slot.startTime} - {slot.endTime}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!picker) return;
                      setAssignmentLoading(true);
                      try {
                        await updatePickerAssignment(picker.pickerId, {
                          agencyId: agencyId === 'none' ? null : agencyId,
                          storeId: storeId === 'none' ? null : storeId,
                          shiftSlotId: shiftSlotId === 'none' ? null : shiftSlotId,
                        });
                        toast.success('Assignment updated');
                        const detailed = await fetchPickerDetails(picker.pickerId);
                        onPickerUpdated?.(detailed);
                        onRefresh();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Failed to update assignment');
                      } finally {
                        setAssignmentLoading(false);
                      }
                    }}
                    disabled={assignmentLoading}
                  >
                    {assignmentLoading ? 'Saving…' : 'Save assignment'}
                  </Button>
                </div>
              </div>
            </div>

            {/* HHD Device Linking */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Smartphone size={18} /> HHD Device
              </h4>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-3 text-sm">
                {picker.hhdUserId ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-600">
                      <Link2 size={14} className="inline mr-1" />
                      Linked: <code className="text-xs bg-gray-200 px-1 rounded">{picker.hhdUserId}</code>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUnlinkHhd}
                      disabled={linkLoading}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Unlink size={14} className="mr-1" /> Unlink
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="HHD User ID (ObjectId)"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md"
                      value={hhdUserIdInput}
                      onChange={(e) => setHhdUserIdInput(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={handleLinkHhd}
                      disabled={linkLoading || !hhdUserIdInput.trim()}
                    >
                      {linkLoading ? '...' : 'Link'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Shifts */}
            {picker.selectedShifts && picker.selectedShifts.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Selected Shifts</h4>
                <div className="flex flex-wrap gap-2">
                  {picker.selectedShifts.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {s.name || s.time}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Rejection Info */}
            {displayStatus === 'REJECTED' && picker.rejectedReason && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-700">Rejection</h4>
                <p className="text-sm text-gray-700">{picker.rejectedReason}</p>
                {picker.rejectedAt && (
                  <p className="text-xs text-gray-500">
                    {new Date(picker.rejectedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </>
          )}
          </div>
        </ScrollArea>
          </TabsContent>
          <TabsContent value="documents" className="flex-1 overflow-y-auto mt-0 p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Documents Review</h4>
            <div className="grid grid-cols-2 gap-3">
              {docThumb('Aadhar Front', 'aadhar', 'front', picker?.documents?.aadhar?.front || null)}
              {docThumb('Aadhar Back', 'aadhar', 'back', picker?.documents?.aadhar?.back || null)}
              {docThumb('PAN Front', 'pan', 'front', picker?.documents?.pan?.front || null)}
              {docThumb('PAN Back', 'pan', 'back', picker?.documents?.pan?.back || null)}
            </div>
          </TabsContent>
          <TabsContent value="training" className="flex-1 overflow-y-auto mt-0 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Training Progress</h4>
              <Badge variant="outline" className={overallTrainingCompleted ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}>
                {overallTrainingCompleted ? 'Completed' : 'In Progress'}
              </Badge>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Video Title</th>
                    <th className="px-3 py-2 text-left">Progress</th>
                    <th className="px-3 py-2 text-left">Watch %</th>
                    <th className="px-3 py-2 text-left">Completed</th>
                    <th className="px-3 py-2 text-left">Completed At</th>
                  </tr>
                </thead>
                <tbody>
                  {trainingRows.map((row) => (
                    <tr key={row.videoId} className="border-t">
                      <td className="px-3 py-2">{row.title}</td>
                      <td className="px-3 py-2">{row.watchedSeconds}s / {row.duration}s</td>
                      <td className="px-3 py-2">{row.progress}%</td>
                      <td className="px-3 py-2">{row.completed ? 'Yes' : 'No'}</td>
                      <td className="px-3 py-2">{row.completedAt ? new Date(row.completedAt).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          <TabsContent value="bank" className="flex-1 overflow-y-auto mt-0 p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Bank Accounts</h4>
            <div className="space-y-3">
              {(picker?.bankDetails || []).map((bank) => (
                <div key={bank.id} className="border rounded-lg p-3 text-sm">
                  <div className="font-medium">{bank.accountHolder}</div>
                  <div className="text-gray-600">A/C: {bank.accountNumber || '—'}</div>
                  <div className="text-gray-600">IFSC: {bank.ifscCode}</div>
                  <div className="text-gray-600">Bank: {bank.bankName || '—'}</div>
                  <Badge variant="outline" className={bank.isVerified ? 'bg-green-50 text-green-700 mt-2' : 'bg-gray-50 text-gray-700 mt-2'}>
                    {bank.isVerified ? 'Verified' : 'Not verified'}
                  </Badge>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!picker) return;
                        await reviewBankAccount(picker.pickerId, bank.id, 'approve');
                        toast.success('Bank approved');
                        onRefresh();
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        if (!picker) return;
                        const reason = window.prompt('Rejection reason') || 'Rejected by admin';
                        await reviewBankAccount(picker.pickerId, bank.id, 'reject', reason);
                        toast.success('Bank rejected');
                        onRefresh();
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="face" className="flex-1 overflow-y-auto mt-0 p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h4 className="font-semibold text-gray-900">Face Verification</h4>
              <Badge
                variant="outline"
                className={faceStatusBadgeClass(faceStatusKey, faceIsApproved, faceIsRejected)}
              >
                {formatFaceStatusLabel(faceStatusKey)}
              </Badge>
            </div>
            <div className="space-y-2 text-sm border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Verified At</span>
                <span className="font-medium text-right">
                  {faceState.verifiedAt ? new Date(faceState.verifiedAt).toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Confidence</span>
                <span className="font-medium">
                  {faceState.confidence != null ? `${faceState.confidence}%` : '—'}
                </span>
              </div>
              {faceState.overrideAt && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Reviewed At</span>
                  <span className="font-medium text-right">
                    {new Date(faceState.overrideAt).toLocaleString()}
                  </span>
                </div>
              )}
              {faceState.overrideReason ? (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-500 block mb-1">Admin Note</span>
                  <p className="text-gray-800">{faceState.overrideReason}</p>
                </div>
              ) : null}
            </div>

            {faceIsApproved && (
              <p className="text-sm text-green-700 mt-4 flex items-center gap-2">
                <CheckCircle2 size={16} /> Face verification is approved.
              </p>
            )}
            {faceIsRejected && !faceIsApproved && (
              <p className="text-sm text-red-700 mt-4 flex items-center gap-2">
                <XCircle size={16} /> Face verification was rejected.
              </p>
            )}

            <div className="flex gap-2 mt-4">
              {(faceIsPending || faceIsRejected) && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={faceActionLoading || !picker}
                  onClick={async () => {
                    if (!picker) return;
                    setFaceActionLoading(true);
                    try {
                      await overrideFaceVerification(picker.pickerId, 'approve', 'Approved by admin');
                      toast.success('Face verification approved');
                      await refreshFaceVerification();
                      onRefresh();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Approval failed');
                    } finally {
                      setFaceActionLoading(false);
                    }
                  }}
                >
                  {faceActionLoading ? 'Saving…' : 'Approve'}
                </Button>
              )}
              {(faceIsPending || faceIsApproved) && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={faceActionLoading || !picker}
                  onClick={async () => {
                    if (!picker) return;
                    const reason = window.prompt('Rejection reason')?.trim();
                    if (!reason) {
                      toast.error('Rejection reason is required');
                      return;
                    }
                    setFaceActionLoading(true);
                    try {
                      await overrideFaceVerification(picker.pickerId, 'reject', reason);
                      toast.success('Face verification rejected');
                      await refreshFaceVerification();
                      onRefresh();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Rejection failed');
                    } finally {
                      setFaceActionLoading(false);
                    }
                  }}
                >
                  {faceActionLoading ? 'Saving…' : 'Reject'}
                </Button>
              )}
            </div>
          </TabsContent>
          <TabsContent value="audit" className="flex-1 overflow-y-auto mt-0 p-6">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Clock size={18} /> Action Logs
            </h4>
            <ActionLogsTimeline
              logs={actionLogs}
              loading={actionLogsLoading}
              emptyMessage="No action logs for this picker"
            />
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
          {!picker ? null : rejectReasonOpen ? (
            <div className="space-y-2">
              <textarea
                placeholder="Enter rejection reason..."
                className="w-full min-h-[80px] p-3 text-sm border border-gray-200 rounded-md"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setRejectReasonOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={actionLoading || !rejectReason.trim()}
                >
                  {actionLoading ? 'Processing...' : 'Confirm Reject'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {displayStatus === 'PENDING' && (
                <>
                  <Button
                    className="bg-[#14B8A6] hover:bg-[#0D9488]"
                    onClick={() => handleStatusUpdate('ACTIVE')}
                    disabled={actionLoading}
                  >
                    <CheckCircle2 size={16} className="mr-2" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => setRejectReasonOpen(true)}
                    disabled={actionLoading}
                  >
                    <XCircle size={16} className="mr-2" /> Reject
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRequestReupload}
                    disabled={actionLoading}
                  >
                    <FileText size={16} className="mr-2" /> Request Re-upload
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600"
                    onClick={() => handleStatusUpdate('BLOCKED')}
                    disabled={actionLoading}
                  >
                    <Ban size={16} className="mr-2" /> Block
                  </Button>
                </>
              )}
              {(displayStatus === 'BLOCKED' || displayStatus === 'SUSPENDED') && (
                <Button
                  className="bg-[#14B8A6] hover:bg-[#0D9488]"
                  onClick={() => handleStatusUpdate('ACTIVE')}
                  disabled={actionLoading}
                >
                  <CheckCircle2 size={16} className="mr-2" /> Activate
                </Button>
              )}
              {displayStatus === 'REJECTED' && (
                <Button
                  className="bg-[#14B8A6] hover:bg-[#0D9488]"
                  onClick={() => handleStatusUpdate('ACTIVE')}
                  disabled={actionLoading}
                >
                  <CheckCircle2 size={16} className="mr-2" /> Approve
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>

      <Dialog
        open={!!docReject?.open}
        onOpenChange={(o) => {
          if (!o) {
            setDocReject(null);
            setDocRejectReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject document</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <textarea
              className="w-full min-h-[90px] p-3 text-sm border border-gray-200 rounded-md"
              placeholder="Enter rejection reason…"
              value={docRejectReason}
              onChange={(e) => setDocRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDocReject(null)} disabled={reviewLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={reviewLoading || !docRejectReason.trim() || !picker || !docReject}
              onClick={async () => {
                if (!picker || !docReject) return;
                setReviewLoading(true);
                try {
                  await rejectDocument(picker.pickerId, docReject.docType, docRejectReason.trim(), docReject.side);
                  try {
                    await sendPickerPushNotification(picker.pickerId, {
                      title: 'Document rejected',
                      body: `${docReject.docType.toUpperCase()} ${docReject.side} rejected: ${docRejectReason.trim()}`,
                    });
                  } catch {
                    toast.message('Document rejected (push notification failed)');
                  }
                  toast.success('Document rejected');
                  await refreshPickerDetails();
                  onRefresh();
                  setDocReject(null);
                  setDocRejectReason('');
                } finally {
                  setReviewLoading(false);
                }
              }}
            >
              Reject & notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
