import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  IssueListItem,
  IssueFilters,
} from './issuesApi';

const STATUS_BADGE_CLASSES: Record<string, string> = {
  open: 'bg-red-100 text-red-800',
  assigned: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-green-100 text-green-800',
};

const SEVERITY_BADGE_CLASSES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-800',
};

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

export function IssueManagementTable({
  data,
  isLoading,
  filters,
  total,
  onFilterChange,
  onViewDetails,
}: Props) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [siteInput, setSiteInput] = React.useState(filters.site || '');

  const handleStatusChange = (val: string) => {
    onFilterChange({ ...filters, status: val === 'all' ? undefined : val, page: 1 });
  };

  const handleSeverityChange = (val: string) => {
    onFilterChange({ ...filters, severity: val === 'all' ? undefined : val, page: 1 });
  };

  const handleSiteApply = () => {
    onFilterChange({ ...filters, site: siteInput.trim() || undefined, page: 1 });
  };

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const filteredData = React.useMemo(() => {
    let filtered = [...data];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          (i.pickerName || '').toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q) ||
          (i.orderId || '').toLowerCase().includes(q) ||
          (i.id || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [data, searchQuery]);

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-between gap-4 flex-wrap">
        <h3 className="font-bold text-[#212121] whitespace-nowrap">Issue Queue</h3>
        <div className="flex items-center gap-2 w-full justify-end flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={14} />
            <Input
              placeholder="Search Picker, Order, Desc..."
              className="h-8 pl-9 bg-white text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1">
            <Input
              placeholder="Site (storeId)"
              className="h-8 w-32 text-xs bg-white"
              value={siteInput}
              onChange={(e) => setSiteInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSiteApply()}
            />
            <button
              onClick={handleSiteApply}
              className="px-2 py-1.5 h-8 text-xs bg-[#14B8A6] text-white rounded hover:bg-[#0D9488]"
            >
              Apply
            </button>
          </div>
          <Select value={filters.severity || 'all'} onValueChange={handleSeverityChange}>
            <SelectTrigger className="w-[120px] h-8 text-xs bg-white">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
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
      </div>

      {total > 0 && (
        <div className="px-4 py-2 border-b border-[#E0E0E0] text-xs text-[#757575]">
          Showing {data.length} of {total} issues
          {filters.page && filters.page > 1 && <span className="ml-2">(Page {filters.page})</span>}
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-gray-500">Loading issues...</div>
      ) : filteredData.length === 0 ? (
        <div className="p-12 text-center text-gray-500">No issues match your filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3">Issue ID</th>
                <th className="px-6 py-3">Picker</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Order</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Severity</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Reported At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {filteredData.map((issue) => (
                <tr
                  key={issue.id}
                  className="hover:bg-[#FAFAFA] group transition-colors cursor-pointer"
                  onClick={() => onViewDetails(issue)}
                >
                  <td className="px-6 py-4 font-mono text-xs text-[#616161]">
                    {(issue.id || '').slice(-8)}
                  </td>
                  <td className="px-6 py-4 font-medium text-[#212121]">{issue.pickerName || '—'}</td>
                  <td className="px-6 py-4 text-[#616161]">
                    {ISSUE_TYPE_LABELS[issue.issueType] || issue.issueType}
                  </td>
                  <td className="px-6 py-4 text-[#616161]">{issue.orderId || '—'}</td>
                  <td className="px-6 py-4 text-[#616161] max-w-[200px] truncate">
                    {issue.description || '—'}
                  </td>
                  <td className="px-6 py-4">
                    {issue.severity ? (
                      <Badge
                        variant="outline"
                        className={`capitalize border-0 font-medium text-xs ${
                          SEVERITY_BADGE_CLASSES[issue.severity] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {issue.severity}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={`capitalize border-0 font-medium ${
                        STATUS_BADGE_CLASSES[issue.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {issue.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-[#616161] text-xs">
                    {timeAgo(issue.reportedAt || '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && !isLoading && total > (filters.limit || 20) && (
        <div className="p-4 border-t border-[#E0E0E0] flex justify-between items-center">
          <button
            className="px-3 py-1.5 text-sm text-[#616161] hover:bg-[#F5F5F5] rounded disabled:opacity-50"
            disabled={(filters.page || 1) <= 1}
            onClick={() => onFilterChange({ ...filters, page: (filters.page || 1) - 1 })}
          >
            Previous
          </button>
          <span className="text-sm text-[#757575]">
            Page {filters.page || 1} of {Math.ceil(total / (filters.limit || 20))}
          </span>
          <button
            className="px-3 py-1.5 text-sm text-[#616161] hover:bg-[#F5F5F5] rounded disabled:opacity-50"
            disabled={(filters.page || 1) >= Math.ceil(total / (filters.limit || 20))}
            onClick={() => onFilterChange({ ...filters, page: (filters.page || 1) + 1 })}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
