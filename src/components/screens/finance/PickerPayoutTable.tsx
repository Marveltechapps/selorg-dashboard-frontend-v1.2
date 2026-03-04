import React from 'react';
import { Search, MoreHorizontal, Eye, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import {
  PickerWithdrawalListItem,
  PickerWithdrawalFilters,
  WithdrawalStatus,
} from './pickerWithdrawalsApi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';

interface Props {
  data: PickerWithdrawalListItem[];
  isLoading: boolean;
  filters: PickerWithdrawalFilters;
  onFilterChange: (filters: PickerWithdrawalFilters) => void;
  onApprove: (item: PickerWithdrawalListItem) => void;
  onReject: (item: PickerWithdrawalListItem) => void;
  onMarkPaid: (item: PickerWithdrawalListItem) => void;
  onViewDetails: (item: PickerWithdrawalListItem) => void;
}

const STATUS_OPTIONS: { value: WithdrawalStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PAID', label: 'Paid' },
  { value: 'REJECTED', label: 'Rejected' },
];

const STATUS_BADGE_CLASS: Record<WithdrawalStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export function PickerPayoutTable({
  data,
  isLoading,
  filters,
  onFilterChange,
  onApprove,
  onReject,
  onMarkPaid,
  onViewDetails,
}: Props) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleStatusChange = (val: string) => {
    onFilterChange({ ...filters, status: val === 'all' ? undefined : (val as WithdrawalStatus), page: 1 });
  };

  const filteredData = React.useMemo(() => {
    let filtered = [...data];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.pickerName?.toLowerCase().includes(q) ||
          r.id?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [data, searchQuery]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-between gap-4">
        <h3 className="font-bold text-[#212121] whitespace-nowrap">Picker Withdrawal Queue</h3>
        <div className="flex items-center gap-2 w-full justify-end">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={14} />
            <Input
              placeholder="Search Picker..."
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
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-500">Loading...</div>
      ) : filteredData.length === 0 ? (
        <div className="p-12 text-center text-gray-500">No withdrawal requests match your filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3">Picker Name</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Bank (last 4)</th>
                <th className="px-6 py-3">Requested</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {filteredData.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-[#FAFAFA] group transition-colors cursor-pointer"
                  onClick={() => onViewDetails(item)}
                >
                  <td className="px-6 py-4 font-medium text-[#212121]">{item.pickerName || '—'}</td>
                  <td className="px-6 py-4 font-bold text-[#212121]">
                    ₹{(item.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-[#616161] text-xs">
                    {item.bankDetails?.last4 ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-[#616161] text-xs">{timeAgo(item.requestedAt)}</td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={`capitalize border-0 font-medium ${STATUS_BADGE_CLASS[item.status as WithdrawalStatus] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2 items-center">
                      {item.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => onApprove(item)}
                            className="px-3 py-1.5 bg-[#14B8A6] text-white text-xs font-bold rounded hover:bg-[#0D9488] transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => onReject(item)}
                            className="px-3 py-1.5 bg-white border border-[#E0E0E0] text-[#757575] text-xs font-bold rounded hover:bg-[#F5F5F5] transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {item.status === 'APPROVED' && (
                        <button
                          onClick={() => onMarkPaid(item)}
                          className="px-3 py-1.5 bg-[#14B8A6] text-white text-xs font-bold rounded hover:bg-[#0D9488] transition-colors"
                        >
                          Mark Paid
                        </button>
                      )}
                      {(item.status === 'PAID' || item.status === 'REJECTED') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onViewDetails(item)}>
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
