import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActionLogsTimeline } from '@/components/ui/action-logs-timeline';
import { User, FileText, CreditCard, CheckCircle2, XCircle, Ban, Clock } from 'lucide-react';
import {
  PickerApprovalDetails,
  updatePickerStatus,
  fetchPickerActionLogs,
  PickerStatus,
} from './pickerApprovalsApi';
import { toast } from 'sonner';

const STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  BLOCKED: 'bg-red-50 text-red-700 border-red-200',
  SUSPENDED: 'bg-gray-50 text-gray-700 border-gray-200',
};

interface Props {
  picker: PickerApprovalDetails | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function PickerDetailsDrawer({ picker, open, onClose, onRefresh }: Props) {
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReasonOpen, setRejectReasonOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [actionLogsLoading, setActionLogsLoading] = useState(false);

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

  if (!picker && !open) return null;

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
              className={`ml-auto capitalize ${STATUS_BADGE_CLASSES[picker.status] || ''}`}
            >
              {picker.status}
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
            <TabsList className="bg-gray-100">
              <TabsTrigger value="profile">Profile</TabsTrigger>
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
                  <span className="font-medium">{picker.site || picker.locationType || '—'}</span>
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
                  <span className="font-medium">{picker.trainingProgress}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Applied</span>
                  <span className="font-medium">
                    {picker.appliedDate ? new Date(picker.appliedDate).toLocaleString() : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <FileText size={18} /> Documents
              </h4>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm">
                {picker.documents ? (
                  <div className="space-y-2">
                    {picker.documents.aadhar && (
                      <div>
                        <span className="text-gray-500">Aadhar: </span>
                        {picker.documents.aadhar.front || picker.documents.aadhar.back ? (
                          <span className="text-green-600">Uploaded</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    )}
                    {picker.documents.pan && (
                      <div>
                        <span className="text-gray-500">PAN: </span>
                        {picker.documents.pan.front || picker.documents.pan.back ? (
                          <span className="text-green-600">Uploaded</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No documents</p>
                )}
              </div>
            </div>

            {/* Bank Details */}
            {picker.bankDetails && picker.bankDetails.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <CreditCard size={18} /> Bank
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-2 text-sm">
                  {picker.bankDetails.map((b, i) => (
                    <div key={i}>
                      <span className="font-medium">{b.accountHolder}</span>
                      {b.accountNumber && (
                        <span className="text-gray-500 ml-2">…{b.accountNumber.slice(-4)}</span>
                      )}
                      <Badge
                        variant="outline"
                        className={`ml-2 text-xs ${b.isVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                      >
                        {b.isVerified ? 'Verified' : 'Not verified'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
            {picker.status === 'REJECTED' && picker.rejectedReason && (
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
              {picker.status === 'PENDING' && (
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
              {picker.status === 'BLOCKED' && (
                <Button
                  className="bg-[#14B8A6] hover:bg-[#0D9488]"
                  onClick={() => handleStatusUpdate('ACTIVE')}
                  disabled={actionLoading}
                >
                  <CheckCircle2 size={16} className="mr-2" /> Unblock
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
