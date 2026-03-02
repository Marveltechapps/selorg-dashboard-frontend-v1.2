import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiRequest } from '@/api/apiClient';
import { PageHeader } from '../../ui/page-header';
import { Search, RefreshCw, AlertTriangle, CheckCircle2, Phone, UserCheck, XCircle, CalendarClock, Bike } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Escalation {
  _id: string;
  orderId: string;
  ticketId?: string;
  riderId?: string;
  riderName?: string;
  issueType: string;
  targetTeam: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  description: string;
  customerName?: string;
  customerPhone?: string;
  attemptLogs?: any[];
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export function DeliveryEscalations({ searchQuery: externalSearch }: { searchQuery?: string }) {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);

  // Action modals
  const [reassignOpen, setReassignOpen] = useState(false);
  const [newRiderId, setNewRiderId] = useState('');
  const [reattemptOpen, setReattemptOpen] = useState(false);
  const [reattemptNotes, setReattemptNotes] = useState('');

  const loadEscalations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('targetTeam', 'rider_ops');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await apiRequest<{ success: boolean; data: Escalation[] }>(`/shared/escalations?${params}`);
      setEscalations(res.data ?? []);
    } catch {
      setEscalations([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadEscalations(); }, [loadEscalations]);

  const filtered = escalations.filter(e => {
    const q = (searchQuery || externalSearch || '').toLowerCase();
    if (!q) return true;
    return (e.orderId || '').toLowerCase().includes(q) || (e.riderId || '').toLowerCase().includes(q) || (e.customerName || '').toLowerCase().includes(q);
  });

  const handleViewEscalation = (esc: Escalation) => {
    setSelectedEscalation(esc);
    setResolutionNotes(esc.resolutionNotes || '');
    setDrawerOpen(true);
  };

  const handleResolve = async (status: 'resolved' | 'closed' = 'resolved') => {
    if (!selectedEscalation) return;
    setResolveLoading(true);
    try {
      await apiRequest(`/shared/escalations/${selectedEscalation._id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ resolutionNotes, status }),
      });
      toast.success(status === 'closed' ? 'Marked as failed' : 'Escalation resolved');
      setDrawerOpen(false);
      loadEscalations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setResolveLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedEscalation || !newRiderId) return;
    try {
      await apiRequest(`/shared/escalations/${selectedEscalation._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ riderId: newRiderId, status: 'in_progress' }),
      });
      toast.success('Rider reassigned');
      setReassignOpen(false);
      setNewRiderId('');
      loadEscalations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reassign');
    }
  };

  const handleScheduleReattempt = async () => {
    if (!selectedEscalation) return;
    try {
      await apiRequest(`/shared/escalations/${selectedEscalation._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'in_progress', resolutionNotes: `Reattempt scheduled: ${reattemptNotes}` }),
      });
      toast.success('Reattempt scheduled');
      setReattemptOpen(false);
      setReattemptNotes('');
      loadEscalations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = { open: 'bg-red-100 text-red-800', in_progress: 'bg-blue-100 text-blue-800', resolved: 'bg-green-100 text-green-800', closed: 'bg-gray-100 text-gray-800' };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Escalation Queue"
        subtitle="Rider operations escalations"
        actions={<Button variant="outline" size="sm" onClick={loadEscalations} disabled={loading}><RefreshCw size={16} className={cn('mr-2', loading && 'animate-spin')} /> Refresh</Button>}
      />

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
          <Input placeholder="Search by order, rider, customer..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#FAFAFA]">
              <TableHead>Order ID</TableHead>
              <TableHead>Rider</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#757575]">No delivery escalations found</TableCell></TableRow>
            ) : filtered.map(esc => (
              <TableRow key={esc._id} className="cursor-pointer hover:bg-[#FAFAFA]" onClick={() => handleViewEscalation(esc)}>
                <TableCell className="font-mono font-medium">{esc.orderId || '—'}</TableCell>
                <TableCell className="text-sm">{esc.riderName || esc.riderId || '—'}</TableCell>
                <TableCell className="capitalize text-sm">{(esc.issueType || '—').replace(/_/g, ' ')}</TableCell>
                <TableCell className="text-sm">{esc.attemptLogs?.length || 0}</TableCell>
                <TableCell><Badge variant="outline" className={`capitalize border-0 ${getStatusBadge(esc.status)}`}>{esc.status.replace('_', ' ')}</Badge></TableCell>
                <TableCell className="text-xs text-[#757575]">{new Date(esc.createdAt).toLocaleString()}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost"><AlertTriangle size={14} /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[520px] overflow-y-auto">
          {selectedEscalation && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle>Delivery Escalation</SheetTitle>
                <SheetDescription>Order: {selectedEscalation.orderId}</SheetDescription>
              </SheetHeader>

              <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge variant="outline" className={`capitalize border-0 ${getStatusBadge(selectedEscalation.status)}`}>{selectedEscalation.status.replace('_', ' ')}</Badge></div>
                <div className="flex justify-between"><span className="text-gray-500">Rider</span><span className="font-medium">{selectedEscalation.riderName || selectedEscalation.riderId || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Customer</span><span className="font-medium">{selectedEscalation.customerName || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Issue</span><span className="font-medium capitalize">{(selectedEscalation.issueType || '').replace(/_/g, ' ')}</span></div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Description</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedEscalation.description || 'No description'}</p>
              </div>

              {/* Attempt Logs */}
              {selectedEscalation.attemptLogs && selectedEscalation.attemptLogs.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Delivery Attempts ({selectedEscalation.attemptLogs.length})</h4>
                  <div className="space-y-2">
                    {selectedEscalation.attemptLogs.map((log: any, idx: number) => (
                      <div key={idx} className="text-sm p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between"><span className="font-medium">Attempt {idx + 1}</span><span className="text-xs text-gray-500">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</span></div>
                        <p className="text-gray-600 mt-1">{log.outcome || log.notes || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedEscalation.status !== 'resolved' && selectedEscalation.status !== 'closed' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" onClick={() => setReassignOpen(true)}><UserCheck size={14} className="mr-1" /> Reassign Rider</Button>
                    <Button size="sm" variant="outline" onClick={() => { if (selectedEscalation.customerPhone) window.open(`tel:${selectedEscalation.customerPhone}`); else toast.info('No phone number'); }}><Phone size={14} className="mr-1" /> Call Customer</Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => handleResolve('closed')}><XCircle size={14} className="mr-1" /> Mark Failed</Button>
                    <Button size="sm" variant="outline" onClick={() => setReattemptOpen(true)}><CalendarClock size={14} className="mr-1" /> Reattempt</Button>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Resolution Notes</h4>
                    <textarea className="w-full min-h-20 p-3 border border-gray-200 rounded-lg text-sm resize-none" value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} placeholder="Describe resolution..." />
                    <Button className="w-full mt-2" onClick={() => handleResolve()} disabled={resolveLoading}>
                      <CheckCircle2 size={16} className="mr-2" /> {resolveLoading ? 'Resolving...' : 'Mark Resolved'}
                    </Button>
                  </div>
                </div>
              )}

              {selectedEscalation.resolutionNotes && (
                <div><h4 className="text-sm font-semibold mb-2">Resolution</h4><p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">{selectedEscalation.resolutionNotes}</p></div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reassign Modal */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reassign Rider</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">New Rider ID</label><Input value={newRiderId} onChange={e => setNewRiderId(e.target.value)} placeholder="Enter rider ID" /></div>
            <DialogFooter><Button variant="outline" onClick={() => setReassignOpen(false)}>Cancel</Button><Button onClick={handleReassign}>Reassign</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reattempt Modal */}
      <Dialog open={reattemptOpen} onOpenChange={setReattemptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Schedule Reattempt</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Notes</label><textarea className="w-full min-h-20 p-3 border border-gray-200 rounded-lg text-sm resize-none" value={reattemptNotes} onChange={e => setReattemptNotes(e.target.value)} placeholder="Delivery instructions..." /></div>
            <DialogFooter><Button variant="outline" onClick={() => setReattemptOpen(false)}>Cancel</Button><Button onClick={handleScheduleReattempt}>Schedule</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
