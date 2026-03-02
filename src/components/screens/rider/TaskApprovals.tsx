import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import { CheckCircle, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getApprovalSummary,
  listApprovals,
  approveRequest,
  rejectRequest,
  batchApprove,
  ApprovalSummary,
  ApprovalRequest,
  ApprovalStatus,
} from './approvalsApi';

interface TaskApprovalsProps {
  searchQuery?: string;
}

export function TaskApprovals({ searchQuery = '' }: TaskApprovalsProps) {
  const [summary, setSummary] = useState<ApprovalSummary | null>(null);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ApprovalStatus | 'all'>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const localApprovalUpdatesRef = useRef<Record<string, ApprovalStatus>>({});

  // Filter approvals based on search query
  const filteredApprovals = React.useMemo(() => {
    if (!searchQuery.trim()) return approvals;
    const query = searchQuery.toLowerCase();
    return approvals.filter(a =>
      a.id.toLowerCase().includes(query) ||
      a.requestedBy?.toLowerCase().includes(query) ||
      a.title?.toLowerCase().includes(query) ||
      a.description?.toLowerCase().includes(query) ||
      a.type?.toLowerCase().includes(query)
    );
  }, [approvals, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryData, approvalsData] = await Promise.all([
        getApprovalSummary(),
        listApprovals({ 
          status: (activeTab === 'all' ? 'all' : activeTab) as ApprovalStatus, 
          limit: 100 
        }),
      ]);
      setSummary(summaryData);
      const list = Array.isArray(approvalsData) ? approvalsData : [];
      const merged = list.map(a => ({
        ...a,
        ...(localApprovalUpdatesRef.current[a.id] && { status: localApprovalUpdatesRef.current[a.id] }),
      }));
      setApprovals(merged);
    } catch (error) {
      console.error('Failed to load approvals data:', error);
      setSummary({ pendingCount: 0, approvedToday: 0, rejectedToday: 0, date: new Date().toISOString().split('T')[0] });
      setApprovals([]);
      toast.error(`Failed to load approvals: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (processing.has(id)) return;
    setProcessing((prev) => new Set(prev).add(id));
    try {
      const result = await approveRequest(id);
      localApprovalUpdatesRef.current[id] = 'approved';
      toast.success('Request approved');
      // Remove from selected if selected
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      // Reload data to ensure persistence - this will filter out approved items
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed');
      // Reload on error too to sync state
      await loadData();
    } finally {
      setProcessing((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleReject = async (id: string) => {
    if (processing.has(id)) return;
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    setProcessing((prev) => new Set(prev).add(id));
    try {
      const result = await rejectRequest(id, reason);
      localApprovalUpdatesRef.current[id] = 'rejected';
      toast.success('Request rejected');
      // Remove from selected if selected
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      // Reload data to ensure persistence - this will filter out rejected items
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed');
      // Reload on error too to sync state
      await loadData();
    } finally {
      setProcessing((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) {
      toast.info('Please select requests to approve');
      return;
    }
    const ids = Array.from(selectedIds);
    // Add to processing set to show loading state
    setProcessing((prev) => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
    
    try {
      const result = await batchApprove(ids);
      ids.forEach(id => { 
        localApprovalUpdatesRef.current[id] = 'approved';
      });
      toast.success(`Approved ${result?.approved ?? ids.length} request(s)`);
      setSelectedIds(new Set());
      // Reload data to ensure persistence - this will filter out approved items
      await loadData();
    } catch (err) {
      console.error('Batch approval error:', err);
      toast.error(err instanceof Error ? err.message : 'Batch approval failed');
      // Reload on error too to sync state
      await loadData();
    } finally {
      // Remove from processing set
      setProcessing((prev) => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Automatic polling disabled - use manual refresh button instead
  // Real-time polling for approvals (every 30 seconds)
  // useEffect(() => {
  //   let interval: NodeJS.Timeout | null = null;
  //   
  //   const startPolling = () => {
  //     if (interval) clearInterval(interval);
  //     interval = setInterval(() => {
  //       if (!document.hidden) {
  //         loadData();
  //       }
  //     }, 30000); // Poll every 30 seconds for real-time queue updates
  //   };

  //   const handleVisibilityChange = () => {
  //     if (document.hidden) {
  //       if (interval) {
  //         clearInterval(interval);
  //         interval = null;
  //       }
  //     } else {
  //       startPolling();
  //       loadData();
  //     }
  //   };

  //   startPolling();
  //   document.addEventListener('visibilitychange', handleVisibilityChange);

  //   return () => {
  //     if (interval) clearInterval(interval);
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   };
  // }, []);

  const getTypeBadge = (type: string) => {
    const styles = {
      order_exception: 'bg-red-100 text-red-700 border-red-200',
      vehicle_request: 'bg-blue-100 text-blue-700 border-blue-200',
      document_approval: 'bg-green-100 text-green-700 border-green-200',
      other: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return styles[type as keyof typeof styles] || styles.other;
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Task Approvals"
        subtitle={`Queue for ${activeTab === 'all' ? 'all' : activeTab} requests`}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={handleBatchApprove}
              disabled={selectedIds.size === 0 || activeTab !== 'pending' || processing.size > 0}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing.size > 0 ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
              <CheckCircle size={16} className="mr-2" />
              Approve Selected ({selectedIds.size})
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => setActiveTab('pending')}
          className={`bg-white p-6 rounded-xl border shadow-sm flex flex-col items-center text-center cursor-pointer transition-all ${
            activeTab === 'pending' ? 'ring-2 ring-orange-500 border-transparent' : 'border-[#E0E0E0] hover:shadow-md'
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-[#F97316]" />
          </div>
          <h3 className="text-2xl font-bold text-[#212121]">
            {loading ? '...' : summary?.pendingCount || 0}
          </h3>
          <p className="text-[#757575] text-sm font-medium">Pending Requests</p>
        </div>

        <div 
          onClick={() => setActiveTab('approved')}
          className={`bg-white p-6 rounded-xl border shadow-sm flex flex-col items-center text-center cursor-pointer transition-all ${
            activeTab === 'approved' ? 'ring-2 ring-green-500 border-transparent' : 'border-[#E0E0E0] hover:shadow-md'
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-[#212121]">
            {loading ? '...' : summary?.approvedToday || 0}
          </h3>
          <p className="text-[#757575] text-sm font-medium">Approved Today</p>
        </div>

        <div 
          onClick={() => setActiveTab('rejected')}
          className={`bg-white p-6 rounded-xl border shadow-sm flex flex-col items-center text-center cursor-pointer transition-all ${
            activeTab === 'rejected' ? 'ring-2 ring-red-500 border-transparent' : 'border-[#E0E0E0] hover:shadow-md'
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <XCircle size={32} className="text-red-600" />
          </div>
          <h3 className="text-2xl font-bold text-[#212121]">
            {loading ? '...' : summary?.rejectedToday || 0}
          </h3>
          <p className="text-[#757575] text-sm font-medium">Rejected Today</p>
        </div>
      </div>

      {/* Approval Queue Table */}
      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-[#212121]">Approval Queue</h3>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'all' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'pending' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'approved' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'rejected' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Rejected
              </button>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredApprovals.length && filteredApprovals.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(filteredApprovals.map((a) => a.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="rounded"
                    disabled={activeTab !== 'pending'}
                  />
                </th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Request Details</th>
                <th className="px-6 py-3">Requested By</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-6 py-4">
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredApprovals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    <CheckCircle2 size={48} className="mx-auto mb-2 opacity-20" />
                    <p>{searchQuery ? `No approvals found matching "${searchQuery}"` : 'No approvals'}</p>
                  </td>
                </tr>
              ) : (
                filteredApprovals.map((approval) => (
                  <tr key={approval.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(approval.id)}
                        onChange={() => toggleSelection(approval.id)}
                        className="rounded"
                        disabled={approval.status !== 'pending'}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getTypeBadge(
                          approval.type
                        )}`}
                      >
                        {approval.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#212121]">{approval.title}</p>
                      <p className="text-xs text-[#757575] mt-0.5 line-clamp-1">
                        {approval.reason || approval.description}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-[#212121]">{approval.requestedBy}</span>
                        <span className="text-[10px] text-[#757575] uppercase">{approval.requesterRole || 'Staff'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold ${
                        approval.status === 'approved' ? 'text-green-600' : 
                        approval.status === 'rejected' ? 'text-red-600' : 
                        'text-orange-600'
                      }`}>
                        {approval.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#757575] text-xs">
                      {new Date(approval.createdAt).toLocaleDateString()}<br/>
                      {new Date(approval.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {approval.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(approval.id)}
                            disabled={processing.has(approval.id)}
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle2 size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(approval.id)}
                            disabled={processing.has(approval.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle size={18} />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
