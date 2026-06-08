import React from 'react';
import { Button } from '@/components/ui/button';
import { DarkstoreDataTable } from '@/components/darkstore/DarkstoreDataTable';
import { StatusBadge } from '@/components/darkstore/StatusBadge';
import { IssueListItem, IssueFilters } from './issuesApi';
import { Bug } from 'lucide-react';

const ISSUE_TYPE_LABELS: Record<string, string> = {
  item_damaged: 'Item Damaged',
  inventory_mismatch: 'Inventory Mismatch',
  shelf_empty: 'Shelf Empty',
  app_bug: 'App Bug',
  device_issue: 'Device Issue',
};

interface Props {
  data: IssueListItem[];
  isLoading: boolean;
  filters: IssueFilters;
  total: number;
  onFilterChange: (filters: IssueFilters) => void;
  onViewDetails: (issue: IssueListItem) => void;
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function IssueManagementTable({
  data,
  isLoading,
  filters,
  total,
  onFilterChange,
  onViewDetails,
}: Props) {
  const pageCount = Math.ceil(total / (filters.limit || 20));
  const currentPage = filters.page || 1;

  return (
    <div className="space-y-3">
      {total > 0 && (
        <p className="text-xs text-slate-500 px-1">
          Showing {data.length} of {total} issues
          {currentPage > 1 && <span className="ml-2">(Page {currentPage})</span>}
        </p>
      )}

      <DarkstoreDataTable
        columns={[
          {
            key: 'id',
            header: 'Issue ID',
            render: (issue) => (
              <span className="font-mono text-xs text-slate-500">{(issue.id || '').slice(-8)}</span>
            ),
          },
          {
            key: 'picker',
            header: 'Picker',
            render: (issue) => <span className="font-medium text-slate-800">{issue.pickerName || '—'}</span>,
          },
          {
            key: 'type',
            header: 'Type',
            render: (issue) => (
              <span className="text-slate-600">
                {ISSUE_TYPE_LABELS[issue.issueType] || issue.issueType}
              </span>
            ),
          },
          {
            key: 'order',
            header: 'Order',
            render: (issue) => <span className="text-slate-600">{issue.orderId || '—'}</span>,
          },
          {
            key: 'description',
            header: 'Description',
            className: 'max-w-[200px]',
            render: (issue) => (
              <span className="text-slate-600 truncate block">{issue.description || '—'}</span>
            ),
          },
          {
            key: 'severity',
            header: 'Severity',
            render: (issue) =>
              issue.severity ? (
                <StatusBadge variant="severity" status={issue.severity} />
              ) : (
                '—'
              ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (issue) => <StatusBadge variant="issue" status={issue.status} />,
          },
          {
            key: 'reported',
            header: 'Reported At',
            render: (issue) => (
              <span className="text-xs text-slate-500">{timeAgo(issue.reportedAt || '')}</span>
            ),
          },
        ]}
        data={data}
        loading={isLoading}
        emptyIcon={Bug}
        emptyTitle="No issues found"
        emptyDescription="No picker-reported issues match your filters."
        onRowClick={onViewDetails}
        rowKey={(issue) => issue.id}
      />

      {total > 0 && !isLoading && total > (filters.limit || 20) && (
        <div className="darkstore-card px-4 py-3 flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onFilterChange({ ...filters, page: currentPage - 1 })}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {currentPage} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= pageCount}
            onClick={() => onFilterChange({ ...filters, page: currentPage + 1 })}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
