import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, FileText, CheckCircle2, UserPlus, Image as ImageIcon } from 'lucide-react';
import {
  IssueDetails,
  updateIssue,
  fetchOpsUsers,
  OpsUser,
} from './issuesApi';
import { toast } from 'sonner';

const STATUS_BADGE_CLASSES: Record<string, string> = {
  open: 'bg-red-50 text-red-700 border-red-200',
  assigned: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  closed: 'bg-green-50 text-green-700 border-green-200',
};

const SEVERITY_BADGE_CLASSES: Record<string, string> = {
  low: 'bg-gray-50 text-gray-700 border-gray-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-red-50 text-red-700 border-red-200',
};

const ISSUE_TYPE_LABELS: Record<string, string> = {
  item_damaged: 'Item Damaged',
  inventory_mismatch: 'Inventory Mismatch',
  shelf_empty: 'Shelf Empty',
  app_bug: 'App Bug',
  device_issue: 'Device Issue',
};

interface Props {
  issue: IssueDetails | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function IssueDetailsDrawer({ issue, open, onClose, onRefresh }: Props) {
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [opsUsers, setOpsUsers] = useState<OpsUser[]>([]);

  useEffect(() => {
    if (open) {
      fetchOpsUsers().then(setOpsUsers).catch(() => setOpsUsers([]));
    }
  }, [open]);

  const handleAssign = async () => {
    if (!issue || !selectedAssignee) {
      toast.error('Select an ops user to assign');
      return;
    }
    setActionLoading(true);
    try {
      await updateIssue(issue.id, 'assign', selectedAssignee);
      toast.success('Issue assigned');
      onRefresh();
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to assign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!issue) return;
    setActionLoading(true);
    try {
      await updateIssue(issue.id, 'close');
      toast.success('Issue closed');
      onRefresh();
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to close');
    } finally {
      setActionLoading(false);
    }
  };

  if (!issue && !open) return null;

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col h-full bg-white">
        <div className="p-6 border-b border-gray-100">
          {!issue ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-6 bg-gray-200 rounded w-2/3" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Issue Details
                </span>
                <Badge
                  variant="outline"
                  className={`ml-auto capitalize ${STATUS_BADGE_CLASSES[issue.status] || ''}`}
                >
                  {issue.status}
                </Badge>
              </div>
              <SheetTitle className="text-xl font-bold text-gray-900">
                {ISSUE_TYPE_LABELS[issue.issueType] || issue.issueType}
              </SheetTitle>
              <SheetDescription className="hidden">
                Issue {issue.id} – {issue.issueType}
              </SheetDescription>
            </>
          )}
        </div>

        <ScrollArea
          className="flex-1 overflow-y-auto"
          style={{ height: 'calc(100vh - 280px)', maxHeight: 'calc(100vh - 280px)' }}
        >
          <div className="p-6 space-y-6">
            {!issue ? (
              <div className="animate-pulse space-y-4">
                <div className="h-20 bg-gray-100 rounded" />
                <div className="h-32 bg-gray-100 rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100">
                    <User size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{issue.pickerName || '—'}</h4>
                    <p className="text-sm text-gray-500">{issue.pickerPhone || '—'}</p>
                    <p className="text-xs text-gray-400 mt-1">Issue ID: {issue.id}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileText size={18} /> Details
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type</span>
                      <span className="font-medium">
                        {ISSUE_TYPE_LABELS[issue.issueType] || issue.issueType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Order</span>
                      <span className="font-medium">{issue.orderId || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Severity</span>
                      <span>
                        {issue.severity ? (
                          <Badge
                            variant="outline"
                            className={`capitalize text-xs ${
                              SEVERITY_BADGE_CLASSES[issue.severity] || ''
                            }`}
                          >
                            {issue.severity}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Reported</span>
                      <span className="font-medium">
                        {issue.reportedAt
                          ? new Date(issue.reportedAt).toLocaleString()
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Assigned To</span>
                      <span className="font-medium">{issue.assignedTo || '—'}</span>
                    </div>
                    {issue.closedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Closed At</span>
                        <span className="font-medium">
                          {new Date(issue.closedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <Separator className="bg-gray-200" />
                    <div>
                      <span className="text-gray-500 block mb-1">Description</span>
                      <p className="text-gray-900">{issue.description}</p>
                    </div>
                  </div>
                </div>

                {issue.imageUrl && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <ImageIcon size={18} /> Image
                    </h4>
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={issue.imageUrl}
                        alt="Issue"
                        className="w-full max-h-64 object-contain bg-gray-50"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {issue && issue.status !== 'closed' && (
          <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
            {issue.status === 'open' && (
              <div className="flex items-center gap-2">
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder="Select ops user to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {opsUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} {u.email ? `(${u.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="bg-[#14B8A6] hover:bg-[#0D9488]"
                  onClick={handleAssign}
                  disabled={actionLoading || !selectedAssignee}
                >
                  <UserPlus size={16} className="mr-2" />
                  {actionLoading ? 'Assigning...' : 'Assign'}
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50"
              onClick={handleClose}
              disabled={actionLoading}
            >
              <CheckCircle2 size={16} className="mr-2" />
              {actionLoading ? 'Closing...' : 'Close Issue'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
