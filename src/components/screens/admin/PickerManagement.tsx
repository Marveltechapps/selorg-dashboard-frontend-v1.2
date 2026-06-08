import React, { useEffect, useMemo, useState } from 'react';
import {
  History,
  Sliders,
  UserPlus,
  AlertTriangle,
  Video,
  UserRoundSearch,
  UserCheck,
  UserX,
  Ban,
  MoreHorizontal,
  Eye,
  Link2,
  RefreshCw,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PickerApprovals } from './PickerApprovals';
import { PickerActivityLogs } from './PickerActivityLogs';
import { PickerConfigManagement } from './PickerConfigManagement';
import { TrainingContentManagement } from './TrainingContentManagement';
import { OperationsAlerts } from '../darkstore/OperationsAlerts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { fetchPickers, updatePickerAssignment, updatePickerOpsStatus, type PickerOpsListItem, type PickerOpsStatus } from '@/api/admin/pickerOpsApi';
import { PickerDetailsDrawer } from './PickerDetailsDrawer';
import { fetchPickerDetails, type PickerApprovalDetails } from './pickerApprovalsApi';
import { AssignPickerModal } from './modals/AssignPickerModal';

const TABS = [
  { value: 'pickers', label: 'Pickers', icon: UserRoundSearch },
  { value: 'picker-approvals', label: 'Picker Approvals', icon: UserPlus },
  { value: 'picker-activity-logs', label: 'Picker Activity Logs', icon: History },
  { value: 'picker-config', label: 'Picker Config', icon: Sliders },
  { value: 'training-content', label: 'Training Content', icon: Video },
  { value: 'ops-alerts', label: 'Operations Alerts', icon: AlertTriangle },
] as const;

type PickerManagementTab = (typeof TABS)[number]['value'];

const OPS_STATUS_BADGE: Record<PickerOpsStatus, string> = {
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  rejected: 'bg-red-50 text-red-800 border-red-200',
  deactivated: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

const OPS_STATUS_LABEL: Record<PickerOpsStatus, string> = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
  deactivated: 'Deactivated',
};

type ConfirmAction = 'approve' | 'reject' | 'activate' | 'deactivate';

function shortPickerId(id: string): string {
  if (!id) return '—';
  return id.length > 10 ? `…${id.slice(-8)}` : id;
}

function AssignmentCell({ value, unassignedLabel = 'Unassigned' }: { value?: string | null; unassignedLabel?: string }) {
  if (value?.trim()) {
    return <span className="text-[#3f3f46]">{value}</span>;
  }
  return <span className="text-[#a1a1aa] text-xs italic">{unassignedLabel}</span>;
}

export function PickerManagement() {
  const [activeTab, setActiveTab] = useState<PickerManagementTab>('pickers');

  const [pickers, setPickers] = useState<PickerOpsListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<PickerOpsStatus | 'all'>('all');
  const [actionPickerId, setActionPickerId] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<PickerApprovalDetails | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<PickerOpsListItem | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmPicker, setConfirmPicker] = useState<PickerOpsListItem | null>(null);
  const [confirmReason, setConfirmReason] = useState('');

  const loadPickers = async () => {
    setLoading(true);
    try {
      const res = await fetchPickers({ q: q.trim() || undefined, status, page: 1, limit: 50 });
      setPickers(res.data || []);
      setTotal(res.total || 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load pickers');
      setPickers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'pickers') return;
    loadPickers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, status]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return pickers;
    return pickers.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(query) ||
        (p.phone || '').includes(query) ||
        (p.pickerId || '').toLowerCase().includes(query)
    );
  }, [pickers, q]);

  const openConfirm = (picker: PickerOpsListItem, action: ConfirmAction) => {
    setConfirmPicker(picker);
    setConfirmAction(action);
    setConfirmReason(action === 'reject' ? '' : action === 'deactivate' ? '' : 'Approved by admin');
    setConfirmOpen(true);
  };

  const runConfirmAction = async () => {
    if (!confirmPicker || !confirmAction) return;
    const needsReason = confirmAction === 'reject' || confirmAction === 'deactivate';
    if (needsReason && !confirmReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    setActionPickerId(confirmPicker.pickerId);
    try {
      if (confirmAction === 'approve' || confirmAction === 'activate') {
        await updatePickerOpsStatus(confirmPicker.pickerId, 'approved');
        toast.success(confirmAction === 'activate' ? 'Picker reactivated' : 'Picker approved');
      } else if (confirmAction === 'reject') {
        await updatePickerOpsStatus(confirmPicker.pickerId, 'rejected', confirmReason.trim());
        toast.success('Picker rejected');
      } else {
        await updatePickerOpsStatus(confirmPicker.pickerId, 'deactivated');
        toast.success('Picker deactivated');
      }
      setConfirmOpen(false);
      setConfirmPicker(null);
      setConfirmAction(null);
      await loadPickers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionPickerId(null);
    }
  };

  const openPickerDetails = async (pickerId: string) => {
    setDrawerOpen(true);
    setSelectedDetails(null);
    try {
      const details = await fetchPickerDetails(pickerId);
      setSelectedDetails(details);
    } catch {
      toast.error('Failed to load picker details');
      setDrawerOpen(false);
    }
  };

  const statusBadge = (s: PickerOpsStatus) => (
    <Badge variant="outline" className={`font-medium text-xs capitalize border ${OPS_STATUS_BADGE[s]}`}>
      {OPS_STATUS_LABEL[s]}
    </Badge>
  );

  const confirmTitle =
    confirmAction === 'approve'
      ? 'Approve picker'
      : confirmAction === 'reject'
        ? 'Reject picker'
        : confirmAction === 'activate'
          ? 'Reactivate picker'
          : confirmAction === 'deactivate'
            ? 'Deactivate picker'
            : '';

  const confirmDescription =
    confirmAction === 'approve'
      ? `Approve "${confirmPicker?.name}"? They can be assigned to stores and shifts.`
      : confirmAction === 'reject'
        ? `Reject "${confirmPicker?.name}"? They will not be able to work until re-approved.`
        : confirmAction === 'activate'
          ? `Reactivate "${confirmPicker?.name}"? They will be able to work again.`
          : confirmAction === 'deactivate'
            ? `Deactivate "${confirmPicker?.name}"? They will lose access until reactivated.`
            : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18181b]">Picker Management</h1>
        <p className="text-[#71717a] text-sm">
          Manage picker approvals, activity, configuration, training content, and operational alerts.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PickerManagementTab)} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                <Icon size={14} className="mr-1.5" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="pickers">
          <div className="space-y-4">
            <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#e4e4e7] bg-[#fafafa] flex flex-wrap gap-3 items-center justify-between">
                <h3 className="font-semibold text-[#18181b]">Active pickers</h3>
                <div className="flex flex-wrap gap-2 items-center">
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search name, phone, ID…"
                    className="w-[220px] h-9 text-sm bg-white"
                  />
                  <Select value={status} onValueChange={(v) => setStatus(v as PickerOpsStatus | 'all')}>
                    <SelectTrigger className="w-[150px] h-9 text-sm bg-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="deactivated">Deactivated</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="h-9" onClick={loadPickers} disabled={loading}>
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    <span className="ml-1.5">Refresh</span>
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-[#f5f7fa] z-10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[#71717a] font-medium">Picker</TableHead>
                      <TableHead className="text-[#71717a] font-medium">Phone</TableHead>
                      <TableHead className="text-[#71717a] font-medium">Agency</TableHead>
                      <TableHead className="text-[#71717a] font-medium">Store</TableHead>
                      <TableHead className="text-[#71717a] font-medium">Shift</TableHead>
                      <TableHead className="text-[#71717a] font-medium w-[110px]">Status</TableHead>
                      <TableHead className="text-[#71717a] font-medium text-right w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-[#71717a]">
                          Loading pickers…
                        </TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-[#71717a]">
                          No pickers match your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((p) => {
                        const busy = actionPickerId === p.pickerId;
                        return (
                          <TableRow key={p.pickerId} className="hover:bg-[#fafafa]">
                            <TableCell>
                              <button
                                type="button"
                                className="text-left group"
                                onClick={() => openPickerDetails(p.pickerId)}
                              >
                                <div className="font-medium text-[#18181b] group-hover:text-[#1677ff]">
                                  {p.name || 'Unnamed picker'}
                                </div>
                                <div
                                  className="text-xs text-[#a1a1aa] font-mono mt-0.5"
                                  title={p.pickerId}
                                >
                                  {shortPickerId(p.pickerId)}
                                </div>
                              </button>
                            </TableCell>
                            <TableCell className="text-[#3f3f46] tabular-nums">{p.phone || '—'}</TableCell>
                            <TableCell>
                              <AssignmentCell value={p.agencyName} />
                            </TableCell>
                            <TableCell>
                              <AssignmentCell value={p.storeName} />
                            </TableCell>
                            <TableCell>
                              <AssignmentCell value={p.shiftSlotLabel} unassignedLabel="No shift" />
                            </TableCell>
                            <TableCell>{statusBadge(p.status)}</TableCell>
                            <TableCell className="text-right">
                              <div
                                className="inline-flex items-center justify-end gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5"
                                  disabled={busy}
                                  onClick={() => openPickerDetails(p.pickerId)}
                                  title="View details"
                                >
                                  <Eye size={14} />
                                  <span className="sr-only">View</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5"
                                  disabled={busy}
                                  onClick={() => {
                                    setAssignTarget(p);
                                    setAssignOpen(true);
                                  }}
                                  title="Assign agency, store, shift"
                                >
                                  <Link2 size={14} />
                                  <span className="sr-only">Assign</span>
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-8 p-0"
                                      disabled={busy}
                                      aria-label="More actions"
                                    >
                                      <MoreHorizontal size={16} />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel className="text-xs text-[#71717a] font-normal truncate">
                                      {p.name || p.pickerId}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => openPickerDetails(p.pickerId)}>
                                      <Eye size={14} className="mr-2" />
                                      View details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setAssignTarget(p);
                                        setAssignOpen(true);
                                      }}
                                    >
                                      <Link2 size={14} className="mr-2" />
                                      Assign store / shift
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {p.status === 'pending' && (
                                      <>
                                        <DropdownMenuItem
                                          className="text-emerald-700 focus:text-emerald-700"
                                          onClick={() => openConfirm(p, 'approve')}
                                        >
                                          <UserCheck size={14} className="mr-2" />
                                          Approve
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-red-700 focus:text-red-700"
                                          onClick={() => openConfirm(p, 'reject')}
                                        >
                                          <UserX size={14} className="mr-2" />
                                          Reject
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {p.status === 'rejected' && (
                                      <DropdownMenuItem
                                        className="text-emerald-700 focus:text-emerald-700"
                                        onClick={() => openConfirm(p, 'approve')}
                                      >
                                        <UserCheck size={14} className="mr-2" />
                                        Approve
                                      </DropdownMenuItem>
                                    )}
                                    {p.status === 'deactivated' && (
                                      <DropdownMenuItem
                                        className="text-emerald-700 focus:text-emerald-700"
                                        onClick={() => openConfirm(p, 'activate')}
                                      >
                                        <UserCheck size={14} className="mr-2" />
                                        Reactivate
                                      </DropdownMenuItem>
                                    )}
                                    {p.status !== 'deactivated' && p.status !== 'rejected' && (
                                      <DropdownMenuItem
                                        className="text-red-700 focus:text-red-700"
                                        onClick={() => openConfirm(p, 'deactivate')}
                                      >
                                        <Ban size={14} className="mr-2" />
                                        Deactivate
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="px-4 py-3 border-t border-[#e4e4e7] text-sm text-[#71717a] flex justify-between bg-[#fafafa]">
                <span>
                  Showing {filtered.length} of {pickers.length} loaded
                </span>
                <span>Total in system: {total}</span>
              </div>
            </div>

            <PickerDetailsDrawer
              picker={selectedDetails}
              open={drawerOpen}
              onClose={() => {
                setDrawerOpen(false);
                setSelectedDetails(null);
              }}
              onRefresh={loadPickers}
              onPickerUpdated={setSelectedDetails}
            />

            <AssignPickerModal
              open={assignOpen}
              onOpenChange={(o) => {
                setAssignOpen(o);
                if (!o) setAssignTarget(null);
              }}
              pickerName={assignTarget?.name || 'Picker'}
              initial={{
                agencyId: assignTarget?.agencyId ?? null,
                storeId: assignTarget?.storeId ?? null,
                shiftSlotId: assignTarget?.shiftSlotId ?? null,
              }}
              onSubmit={async (payload) => {
                if (!assignTarget) return;
                setActionPickerId(assignTarget.pickerId);
                try {
                  await updatePickerAssignment(assignTarget.pickerId, payload);
                  toast.success('Assignment updated');
                  await loadPickers();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Assignment failed');
                } finally {
                  setActionPickerId(null);
                }
              }}
            />

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
                </AlertDialogHeader>
                {(confirmAction === 'reject' || confirmAction === 'deactivate') && (
                  <div className="space-y-2">
                    <Label htmlFor="picker-action-reason">Reason</Label>
                    <Input
                      id="picker-action-reason"
                      value={confirmReason}
                      onChange={(e) => setConfirmReason(e.target.value)}
                      placeholder={
                        confirmAction === 'reject' ? 'Why is this picker rejected?' : 'Reason for deactivation'
                      }
                    />
                  </div>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={!!actionPickerId}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={!!actionPickerId}
                    onClick={(e) => {
                      e.preventDefault();
                      void runConfirmAction();
                    }}
                    className={
                      confirmAction === 'reject' || confirmAction === 'deactivate'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }
                  >
                    {actionPickerId ? 'Saving…' : 'Confirm'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TabsContent>

        <TabsContent value="picker-approvals">
          <PickerApprovals />
        </TabsContent>
        <TabsContent value="picker-activity-logs">
          <PickerActivityLogs />
        </TabsContent>
        <TabsContent value="picker-config">
          <PickerConfigManagement />
        </TabsContent>
        <TabsContent value="training-content">
          <TrainingContentManagement />
        </TabsContent>
        <TabsContent value="ops-alerts">
          <OperationsAlerts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
