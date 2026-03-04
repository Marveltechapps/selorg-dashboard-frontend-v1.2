import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  PickerApprovalListItem,
  PickerApprovalsFilter,
} from './pickerApprovalsApi';

const STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  BLOCKED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-gray-100 text-gray-800',
};

const DOCS_STATUS_CLASSES: Record<string, string> = {
  not_uploaded: 'bg-red-100 text-red-800',
  partial: 'bg-yellow-100 text-yellow-800',
  complete: 'bg-green-100 text-green-800',
};

const ONBOARDING_STAGE_LABELS: Record<string, string> = {
  profile: 'Profile',
  documents: 'Documents',
  training: 'Training',
  complete: 'Complete',
};

const RISK_BADGE_CLASS: Record<string, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

interface Props {
  data: PickerApprovalListItem[];
  riskMap?: Record<string, { riskScore: number; riskLevel: 'low' | 'medium' | 'high' }>;
  isLoading: boolean;
  filters: PickerApprovalsFilter;
  total: number;
  onFilterChange: (filters: PickerApprovalsFilter) => void;
  onViewDetails: (picker: PickerApprovalListItem) => void;
}

export function PickerApprovalsTable({
  data,
  riskMap = {},
  isLoading,
  filters,
  total,
  onFilterChange,
  onViewDetails,
}: Props) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleStatusChange = (val: string) => {
    onFilterChange({ ...filters, status: val === 'all' ? undefined : val, page: 1 });
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
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.phone || '').toLowerCase().includes(q) ||
          (p.pickerId || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [data, searchQuery]);

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-between gap-4">
        <h3 className="font-bold text-[#212121] whitespace-nowrap">Picker Queue</h3>
        <div className="flex items-center gap-2 w-full justify-end">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={14} />
            <Input
              placeholder="Search Name, Phone..."
              className="h-8 pl-9 bg-white text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {total > 0 && (
        <div className="px-4 py-2 border-b border-[#E0E0E0] text-xs text-[#757575]">
          Showing {data.length} of {total} pickers
          {filters.page > 1 && (
            <span className="ml-2">
              (Page {filters.page})
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-gray-500">Loading pickers...</div>
      ) : filteredData.length === 0 ? (
        <div className="p-12 text-center text-gray-500">No pickers match your filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3">Picker ID</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Site</th>
                <th className="px-6 py-3">Docs</th>
                <th className="px-6 py-3">Face</th>
                <th className="px-6 py-3">Training</th>
                <th className="px-6 py-3">Onboarding</th>
                <th className="px-6 py-3">Applied</th>
                <th className="px-6 py-3">Risk</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {filteredData.map((picker) => (
                <tr
                  key={picker.pickerId}
                  className="hover:bg-[#FAFAFA] group transition-colors cursor-pointer"
                  onClick={() => onViewDetails(picker)}
                >
                  <td className="px-6 py-4 font-mono text-xs text-[#616161]">
                    {(picker.pickerId || '').slice(-8)}
                  </td>
                  <td className="px-6 py-4 font-medium text-[#212121]">{picker.name || '—'}</td>
                  <td className="px-6 py-4 text-[#616161]">{picker.phone || '—'}</td>
                  <td className="px-6 py-4 text-[#616161]">{picker.site || '—'}</td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={`capitalize border-0 font-medium text-xs ${
                        DOCS_STATUS_CLASSES[picker.docsStatus] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {picker.docsStatus.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={`border-0 font-medium text-xs ${
                        picker.faceVerification ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {picker.faceVerification ? 'Yes' : '—'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-[#616161]">{picker.trainingProgress}%</td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className="capitalize border-0 font-medium text-xs bg-gray-100 text-gray-800"
                    >
                      {ONBOARDING_STAGE_LABELS[picker.onboardingStage] || picker.onboardingStage}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-[#616161] text-xs">
                    {timeAgo(picker.appliedDate || '')}
                  </td>
                  <td className="px-6 py-4">
                    {riskMap[picker.pickerId] ? (
                      <Badge
                        variant="outline"
                        className={`capitalize border-0 font-medium text-xs ${
                          RISK_BADGE_CLASS[riskMap[picker.pickerId].riskLevel] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {riskMap[picker.pickerId].riskLevel} ({riskMap[picker.pickerId].riskScore})
                      </Badge>
                    ) : (
                      <span className="text-[#9E9E9E] text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={`capitalize border-0 font-medium ${
                        STATUS_BADGE_CLASSES[picker.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {picker.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && !isLoading && total > filters.limit && (
        <div className="p-4 border-t border-[#E0E0E0] flex justify-between items-center">
          <button
            className="px-3 py-1.5 text-sm text-[#616161] hover:bg-[#F5F5F5] rounded disabled:opacity-50"
            disabled={filters.page <= 1}
            onClick={() => onFilterChange({ ...filters, page: filters.page - 1 })}
          >
            Previous
          </button>
          <span className="text-sm text-[#757575]">
            Page {filters.page} of {Math.ceil(total / filters.limit)}
          </span>
          <button
            className="px-3 py-1.5 text-sm text-[#616161] hover:bg-[#F5F5F5] rounded disabled:opacity-50"
            disabled={filters.page >= Math.ceil(total / filters.limit)}
            onClick={() => onFilterChange({ ...filters, page: filters.page + 1 })}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
