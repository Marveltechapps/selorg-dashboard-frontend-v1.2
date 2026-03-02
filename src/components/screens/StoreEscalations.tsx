import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { apiRequest } from '@/api/apiClient';
import { PageHeader } from '../ui/page-header';
import { Search, RefreshCw, AlertTriangle, CheckCircle2, Clock, User, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Escalation {
  _id: string;
  orderId: string;
  ticketId?: string;
  issueType: string;
  targetTeam: string;
  source?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  description: string;
  customerName?: string;
  customerPhone?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export function StoreEscalations() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);

  const loadEscalations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('targetTeam', 'darkstore');
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
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (e.orderId || '').toLowerCase().includes(q) || (e.customerName || '').toLowerCase().includes(q) || (e.issueType || '').toLowerCase().includes(q);
  });

  const handleViewEscalation = (esc: Escalation) => {
    setSelectedEscalation(esc);
    setResolutionNotes(esc.resolutionNotes || '');
    setDrawerOpen(true);
  };

  const handleResolve = async () => {
    if (!selectedEscalation) return;
    setResolveLoading(true);
    try {
      await apiRequest(`/shared/escalations/${selectedEscalation._id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ resolutionNotes, status: 'resolved' }),
      });
      toast.success('Escalation resolved');
      setDrawerOpen(false);
      loadEscalations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve');
    } finally {
      setResolveLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-red-100 text-red-800',
      in_progress: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Escalation Queue"
        subtitle="Escalations assigned to darkstore teams"
        actions={
          <Button variant="outline" size="sm" onClick={loadEscalations} disabled={loading}>
            <RefreshCw size={16} className={cn('mr-2', loading && 'animate-spin')} /> Refresh
          </Button>
        }
      />

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
          <Input placeholder="Search by order ID, customer..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
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
              <TableHead>Issue Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#757575]">Loading escalations...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#757575]"><AlertTriangle size={24} className="mx-auto mb-2 opacity-20" />No escalations found</TableCell></TableRow>
            ) : filtered.map(esc => (
              <TableRow key={esc._id} className="cursor-pointer hover:bg-[#FAFAFA]" onClick={() => handleViewEscalation(esc)}>
                <TableCell className="font-mono font-medium">{esc.orderId || '—'}</TableCell>
                <TableCell className="capitalize">{(esc.issueType || '—').replace(/_/g, ' ')}</TableCell>
                <TableCell className="text-sm">{esc.source || esc.ticketId || 'Support'}</TableCell>
                <TableCell className="text-sm">{esc.customerName || '—'}</TableCell>
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
        <SheetContent className="w-[400px] sm:w-[500px] overflow-y-auto">
          {selectedEscalation && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle>Escalation Details</SheetTitle>
                <SheetDescription>Order: {selectedEscalation.orderId}</SheetDescription>
              </SheetHeader>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Status</span><Badge variant="outline" className={`capitalize border-0 ${getStatusBadge(selectedEscalation.status)}`}>{selectedEscalation.status.replace('_', ' ')}</Badge></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Issue Type</span><span className="font-medium capitalize">{(selectedEscalation.issueType || '').replace(/_/g, ' ')}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Customer</span><span className="font-medium">{selectedEscalation.customerName || '—'}</span></div>
                  {selectedEscalation.customerPhone && <div className="flex justify-between text-sm"><span className="text-gray-500">Phone</span><span className="font-medium">{selectedEscalation.customerPhone}</span></div>}
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Created</span><span className="font-medium">{new Date(selectedEscalation.createdAt).toLocaleString()}</span></div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Issue Description</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedEscalation.description || 'No description provided'}</p>
                </div>

                {selectedEscalation.status !== 'resolved' && selectedEscalation.status !== 'closed' && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Resolution Notes</h4>
                    <textarea
                      className="w-full min-h-24 p-3 border border-gray-200 rounded-lg text-sm resize-none"
                      value={resolutionNotes}
                      onChange={e => setResolutionNotes(e.target.value)}
                      placeholder="Describe how this was resolved..."
                    />
                    <Button className="w-full mt-3" onClick={handleResolve} disabled={resolveLoading}>
                      <CheckCircle2 size={16} className="mr-2" /> {resolveLoading ? 'Resolving...' : 'Mark as Resolved'}
                    </Button>
                  </div>
                )}

                {selectedEscalation.resolutionNotes && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Resolution</h4>
                    <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">{selectedEscalation.resolutionNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
