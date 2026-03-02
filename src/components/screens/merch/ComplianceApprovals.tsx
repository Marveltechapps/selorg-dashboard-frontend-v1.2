import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tabs, TabsList, TabsTrigger } from '../../ui/tabs';
import { Search, Filter, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { complianceApi } from './compliance/complianceApi';
import { ApprovalRequest } from './compliance/types';
import { KPICards } from './compliance/KPICards';
import { ApprovalQueueTable } from './compliance/ApprovalQueueTable';
import { RequestDetailDrawer } from './compliance/RequestDetailDrawer';
import { ComplianceOverviewSheet } from './compliance/ComplianceOverviewSheet';
import { AuditLogSheet } from './compliance/AuditLogSheet';
import { ApproveDialog, RejectDialog } from './compliance/ActionDialogs';

export function ComplianceApprovals({ searchQuery: externalSearch = "" }: { searchQuery?: string }) {
  // State - Using Real API
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const resp = await complianceApi.getApprovalRequests({});
      const data = resp?.data ?? [];
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load compliance approvals', err);
      toast.error('Failed to load approval requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Filter State
  const [tabFilter, setTabFilter] = useState('Pending'); 
  const [searchQuery, setSearchQuery] = useState(externalSearch);
  const [typeFilter, setTypeFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  // Sync external search
  useEffect(() => {
    setSearchQuery(externalSearch);
  }, [externalSearch]);

  // Dialog/Sheet State
  const [detailRequest, setDetailRequest] = useState<ApprovalRequest | null>(null);
  const [approveRequest, setApproveRequest] = useState<ApprovalRequest | null>(null);
  const [rejectRequest, setRejectRequest] = useState<ApprovalRequest | null>(null);
  const [isComplianceOpen, setIsComplianceOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);

  // Derived Data
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (tabFilter !== 'All' && req.status !== tabFilter) return false;
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (!req.title.toLowerCase().includes(q) && !req.id.includes(q)) return false;
      }
      if (typeFilter !== 'all' && req.type !== typeFilter) return false;
      if (riskFilter !== 'all' && req.riskLevel !== riskFilter) return false;
      return true;
    });
  }, [requests, tabFilter, searchQuery, typeFilter, riskFilter]);

  const [summary, setSummary] = useState({ pendingCount: 0, complianceScore: 94, auditsPassed: 0 });

  const loadSummary = async () => {
    try {
      const r = await complianceApi.getSummary();
      const d = r?.data ?? {};
      setSummary({
        pendingCount: d.pendingCount ?? 0,
        complianceScore: d.complianceScore ?? 94,
        auditsPassed: d.auditsPassed ?? 0,
      });
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadSummary();
  }, [requests.length]);
  const pendingCount = summary.pendingCount ?? requests.filter(r => r.status === 'Pending').length;
  const complianceScore = summary.complianceScore;
  const auditsPassed = summary.auditsPassed; 

  // Handlers - Updated to use local state only
  const handleSelect = (id: string, checked: boolean) => {
      const newSet = new Set(selectedIds);
      if (checked) newSet.add(id);
      else newSet.delete(id);
      setSelectedIds(newSet);
  };

  const handleSelectAll = (checked: boolean) => {
      if (checked) {
          setSelectedIds(new Set(filteredRequests.map(r => r.id)));
      } else {
          setSelectedIds(new Set());
      }
  };

  const handleApprove = async (_note?: string) => {
      if (!approveRequest) return;
      try {
        await complianceApi.updateApprovalStatus(approveRequest.id, 'Approved');
        setRequests(prev => prev.map(r => r.id === approveRequest.id ? { ...r, status: 'Approved' } : r));
        loadSummary();
        toast.success("Request Approved");
        setApproveRequest(null);
        if (detailRequest?.id === approveRequest.id) setDetailRequest(null);
      } catch {
        toast.error("Failed to approve request");
      }
  };

  const handleReject = async (_reason: string) => {
      if (!rejectRequest) return;
      try {
        await complianceApi.updateApprovalStatus(rejectRequest.id, 'Rejected');
        setRequests(prev => prev.map(r => r.id === rejectRequest.id ? { ...r, status: 'Rejected' } : r));
        loadSummary();
        toast.success("Request Rejected");
        setRejectRequest(null);
        if (detailRequest?.id === rejectRequest.id) setDetailRequest(null);
      } catch {
        toast.error("Failed to reject request");
      }
  };

  const handleComplianceBulkAction = async (action: 'approve' | 'reject') => {
      if (selectedIds.size === 0) return;
      const status = action === 'approve' ? 'Approved' : 'Rejected';
      try {
        for (const id of selectedIds) {
          await complianceApi.updateApprovalStatus(id, status);
        }
        setRequests(prev => prev.map(r => selectedIds.has(r.id) ? { ...r, status } : r));
        loadSummary();
        toast.success(`${action === 'approve' ? 'Approved' : 'Rejected'} ${selectedIds.size} requests`);
        setSelectedIds(new Set());
      } catch {
        toast.error(`Failed to ${action} selected requests`);
      }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Compliance & Approvals</h1>
          <p className="text-[#757575] text-sm">Regulatory checks, pricing approvals, and audit logs</p>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards 
        pendingCount={pendingCount}
        complianceScore={complianceScore}
        auditsPassed={auditsPassed}
        onPendingClick={() => setTabFilter('Pending')}
        onScoreClick={() => setIsComplianceOpen(true)}
        onAuditsClick={() => setIsAuditLogOpen(true)}
      />

      {/* Combined Filter Bar */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                    placeholder="Search by title, SKU, or requester..." 
                    className="pl-9 h-10 text-sm border-gray-200 focus:ring-primary" 
                    value={searchQuery}
                    onChange={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSearchQuery(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                />
            </div>

            <Tabs value={tabFilter} onValueChange={setTabFilter} className="min-w-[380px]">
                <TabsList className="grid w-full grid-cols-5 h-10 p-1 bg-gray-100/80">
                    <TabsTrigger value="Pending" className="text-[10px] font-black uppercase tracking-wider">Pending</TabsTrigger>
                    <TabsTrigger value="Approved" className="text-[10px] font-black uppercase tracking-wider">Approved</TabsTrigger>
                    <TabsTrigger value="Rejected" className="text-[10px] font-black uppercase tracking-wider">Rejected</TabsTrigger>
                    <TabsTrigger value="Expired" className="text-[10px] font-black uppercase tracking-wider">Expired</TabsTrigger>
                    <TabsTrigger value="All" className="text-[10px] font-black uppercase tracking-wider">All</TabsTrigger>
                </TabsList>
            </Tabs>

            <Button 
                variant={isFiltersVisible ? "default" : "outline"} 
                size="icon" 
                className={`h-10 w-10 transition-all ${isFiltersVisible ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white border-[#7C3AED]' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                onClick={() => setIsFiltersVisible(!isFiltersVisible)}
            >
                <Filter className="h-4 w-4" />
            </Button>

            {selectedIds.size > 0 && (
                <div className="flex gap-2 animate-in fade-in slide-in-from-right-2 border-l pl-3 ml-1">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 h-10 px-4 text-[10px] font-black uppercase tracking-widest text-white shadow-sm" onClick={() => handleComplianceBulkAction('approve')}>Approve Selected</Button>
                    <Button size="sm" variant="outline" className="h-10 px-4 text-[10px] font-black uppercase tracking-widest text-red-600 border-red-100 hover:bg-red-50" onClick={() => handleComplianceBulkAction('reject')}>Reject Selected</Button>
                </div>
            )}
        </div>

        {/* Expandable Advanced Filters */}
        {isFiltersVisible && (
            <div className="flex flex-wrap gap-4 pt-4 border-t border-dashed border-gray-100 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1.5 flex-1 min-w-[180px]">
                    <label className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400 ml-1">Filter by Category</label>
                    <Select 
                      value={typeFilter} 
                      onValueChange={(value) => {
                        setTypeFilter(value);
                      }}
                    >
                        <SelectTrigger className="h-9 text-xs font-bold bg-gray-50/50 border-gray-100 hover:border-gray-200 transition-all">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="Price Change">Price Change</SelectItem>
                            <SelectItem value="New Campaign">New Campaign</SelectItem>
                            <SelectItem value="Zone Change">Zone Change</SelectItem>
                            <SelectItem value="Policy Override">Policy Override</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5 flex-1 min-w-[180px]">
                    <label className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400 ml-1">Filter by Risk</label>
                    <Select 
                      value={riskFilter} 
                      onValueChange={(value) => {
                        setRiskFilter(value);
                      }}
                    >
                        <SelectTrigger className="h-9 text-xs font-bold bg-gray-50/50 border-gray-100 hover:border-gray-200 transition-all">
                            <SelectValue placeholder="All Risk Levels" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Risk Levels</SelectItem>
                            <SelectItem value="Low">Low Risk</SelectItem>
                            <SelectItem value="Medium">Medium Risk</SelectItem>
                            <SelectItem value="High">High Risk</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-end pb-0.5">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-red-600 hover:bg-transparent"
                        onClick={() => {
                            setTypeFilter('all');
                            setRiskFilter('all');
                            setSearchQuery('');
                        }}
                    >
                        Reset Filters
                    </Button>
                </div>
            </div>
        )}
      </div>

      {/* Main Table */}
      <ApprovalQueueTable 
        requests={filteredRequests}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        onApprove={setApproveRequest}
        onReject={setRejectRequest}
        onRowClick={setDetailRequest}
      />

      {/* Drawers & Dialogs */}
      <RequestDetailDrawer 
        request={detailRequest}
        onClose={() => setDetailRequest(null)}
        onApprove={setApproveRequest}
        onReject={setRejectRequest}
      />

      <ApproveDialog 
        request={approveRequest}
        onClose={() => setApproveRequest(null)}
        onConfirm={handleApprove}
      />

      <RejectDialog 
        request={rejectRequest}
        onClose={() => setRejectRequest(null)}
        onConfirm={handleReject}
      />

      <ComplianceOverviewSheet 
        isOpen={isComplianceOpen}
        onClose={() => setIsComplianceOpen(false)}
      />

      <AuditLogSheet 
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
      />

    </div>
  );
}
