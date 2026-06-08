import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DarkstoreScreenShell } from '@/components/darkstore/DarkstoreScreenShell';
import { IssueManagementTable } from './IssueManagementTable';
import { IssueDetailsDrawer } from './IssueDetailsDrawer';
import {
  IssueListItem,
  IssueDetails,
  IssueFilters,
  fetchIssues,
  fetchIssueDetails,
} from './issuesApi';

export function IssueManagement() {
  const [data, setData] = useState<IssueListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [siteInput, setSiteInput] = useState('');
  const [filters, setFilters] = useState<IssueFilters>({
    page: 1,
    limit: 20,
    status: undefined,
    severity: undefined,
    site: undefined,
  });
  const [selectedIssue, setSelectedIssue] = useState<IssueDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchIssues(filters);
      setData(result.data);
      setTotal(result.total);
    } catch {
      toast.error('Failed to load issues');
      setData([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (i) =>
        (i.pickerName || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.orderId || '').toLowerCase().includes(q) ||
        (i.id || '').toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const handleViewDetails = async (issue: IssueListItem) => {
    setSelectedIssue(null);
    setDetailsOpen(true);
    try {
      const detailed = await fetchIssueDetails(issue.id);
      setSelectedIssue(detailed);
    } catch {
      toast.error('Failed to load issue details');
      setDetailsOpen(false);
    }
  };

  const handleRefresh = () => {
    loadList();
  };

  const applySiteFilter = () => {
    setFilters((prev) => ({ ...prev, site: siteInput.trim() || undefined, page: 1 }));
  };

  return (
    <DarkstoreScreenShell
      title="Issue Management"
      subtitle="View and manage picker-reported issues (item damaged, inventory mismatch, etc.)"
      toolbar={{
        onRefresh: handleRefresh,
        refreshing: isLoading,
        showConnection: true,
        filters: (
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input
                placeholder="Search picker, order, description..."
                className="h-9 pl-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Input
              placeholder="Site (storeId)"
              className="h-9 w-32 text-sm"
              value={siteInput}
              onChange={(e) => setSiteInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySiteFilter()}
            />
            <Button type="button" size="sm" variant="secondary" className="h-9" onClick={applySiteFilter}>
              Apply
            </Button>
            <Select
              value={filters.severity || 'all'}
              onValueChange={(val) =>
                setFilters((prev) => ({ ...prev, severity: val === 'all' ? undefined : val, page: 1 }))
              }
            >
              <SelectTrigger className="w-[120px] h-9 text-sm">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.status || 'all'}
              onValueChange={(val) =>
                setFilters((prev) => ({ ...prev, status: val === 'all' ? undefined : val, page: 1 }))
              }
            >
              <SelectTrigger className="w-[130px] h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ),
      }}
    >
      <IssueManagementTable
        data={filteredData}
        isLoading={isLoading}
        filters={filters}
        total={total}
        onFilterChange={setFilters}
        onViewDetails={handleViewDetails}
      />

      <IssueDetailsDrawer
        issue={selectedIssue}
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedIssue(null);
        }}
        onRefresh={handleRefresh}
      />
    </DarkstoreScreenShell>
  );
}
