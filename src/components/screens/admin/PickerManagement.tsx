import React, { useEffect, useMemo, useState } from 'react';
import { History, Sliders, UserPlus, AlertTriangle, Video, UserRoundSearch, UserCheck, UserX, Ban } from 'lucide-react';
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

export function PickerManagement() {
  const [activeTab, setActiveTab] = useState<PickerManagementTab>('pickers');

  const [pickers, setPickers] = useState<PickerOpsListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<PickerOpsStatus | 'all'>('all');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<PickerApprovalDetails | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<PickerOpsListItem | null>(null);

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
    return pickers.filter((p) => (p.name || '').toLowerCase().includes(query) || (p.phone || '').includes(query));
  }, [pickers, q]);

  const statusBadge = (s: PickerOpsStatus) => {
    if (s === 'approved') return <Badge className="bg-emerald-500">Approved</Badge>;
    if (s === 'pending') return <Badge className="bg-amber-500">Pending</Badge>;
    if (s === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="secondary">Deactivated</Badge>;
  };

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
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pickers (name/phone)..." className="w-[280px]" />
                <div className="flex gap-2">
                  {(['all', 'pending', 'approved', 'rejected', 'deactivated'] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={status === s ? 'default' : 'outline'}
                      onClick={() => setStatus(s as any)}
                    >
                      {s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={loadPickers} disabled={loading}>
                Refresh
              </Button>
            </div>

            <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-auto max-h-[650px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-[#f9fafb] z-10">
                    <TableRow>
                      <TableHead>Picker</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Agency</TableHead>
                      <TableHead>Assigned store</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-[#71717a]">
                          Loading pickers…
                        </TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-[#71717a]">
                          No pickers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((p) => (
                        <TableRow key={p.pickerId} className="hover:bg-[#fcfcfc]">
                          <TableCell>
                            <div className="font-medium text-[#18181b]">{p.name || '—'}</div>
                            <div className="text-xs text-[#a1a1aa] font-mono">{p.pickerId}</div>
                          </TableCell>
                          <TableCell>{p.phone || '—'}</TableCell>
                          <TableCell>{p.agencyName || '—'}</TableCell>
                          <TableCell>{p.storeName || '—'}</TableCell>
                          <TableCell>{p.shiftSlotLabel || '—'}</TableCell>
                          <TableCell>{statusBadge(p.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  setDrawerOpen(true);
                                  setSelectedDetails(null);
                                  try {
                                    const details = await fetchPickerDetails(p.pickerId);
                                    setSelectedDetails(details);
                                  } catch (e) {
                                    toast.error('Failed to load picker details');
                                    setDrawerOpen(false);
                                  }
                                }}
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAssignTarget(p);
                                  setAssignOpen(true);
                                }}
                              >
                                Assign
                              </Button>
                              {p.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={async () => {
                                      await updatePickerOpsStatus(p.pickerId, 'approved');
                                      toast.success('Picker approved');
                                      await loadPickers();
                                    }}
                                  >
                                    <UserCheck size={14} className="mr-1.5" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={async () => {
                                      const reason = window.prompt('Rejection reason') || 'Rejected by admin';
                                      await updatePickerOpsStatus(p.pickerId, 'rejected', reason);
                                      toast.success('Picker rejected');
                                      await loadPickers();
                                    }}
                                  >
                                    <UserX size={14} className="mr-1.5" /> Reject
                                  </Button>
                                </>
                              )}
                              {p.status !== 'deactivated' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-rose-200 text-rose-700 hover:bg-rose-50"
                                  onClick={async () => {
                                    if (!confirm(`Deactivate picker "${p.name}"?`)) return;
                                    await updatePickerOpsStatus(p.pickerId, 'deactivated');
                                    toast.success('Picker deactivated');
                                    await loadPickers();
                                  }}
                                >
                                  <Ban size={14} className="mr-1.5" /> Deactivate
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="p-3 border-t border-[#e4e4e7] text-sm text-[#71717a] flex justify-between">
                <span>Showing {filtered.length} of {pickers.length}</span>
                <span>Total: {total}</span>
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
                await updatePickerAssignment(assignTarget.pickerId, payload);
                toast.success('Picker assignment updated');
                await loadPickers();
              }}
            />
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
