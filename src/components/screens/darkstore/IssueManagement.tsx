import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
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
    } catch (e) {
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

  const handleViewDetails = async (issue: IssueListItem) => {
    setSelectedIssue(null);
    setDetailsOpen(true);
    try {
      const detailed = await fetchIssueDetails(issue.id);
      setSelectedIssue(detailed);
    } catch (e) {
      toast.error('Failed to load issue details');
      setDetailsOpen(false);
    }
  };

  const handleRefresh = () => {
    loadList();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Issue Management</h1>
          <p className="text-[#757575] text-sm">
            View and manage picker-reported issues (item damaged, inventory mismatch, etc.)
          </p>
        </div>
      </div>

      <IssueManagementTable
        data={data}
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
    </div>
  );
}
