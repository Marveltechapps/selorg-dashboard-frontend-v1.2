import React from 'react';
import { Search, Filter, MoreHorizontal, Eye, CheckCircle, XCircle } from 'lucide-react';
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Skeleton } from "../../ui/skeleton";
import { Badge } from "../../ui/badge";
import { RefundRequest, RefundQueueFilter } from './refundsApi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

interface Props {
  data: RefundRequest[];
  isLoading: boolean;
  filters: RefundQueueFilter;
  onFilterChange: (filters: RefundQueueFilter) => void;
  onApprove: (refund: RefundRequest) => void;
  onReject: (refund: RefundRequest) => void;
  onViewDetails: (refund: RefundRequest) => void;
}

export function RefundQueueTable({ 
  data, 
  isLoading, 
  filters, 
  onFilterChange, 
  onApprove, 
  onReject, 
  onViewDetails 
}: Props) {
  const [searchQuery, setSearchQuery] = React.useState(filters.query || '');
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync search query with filters
  React.useEffect(() => {
    setSearchQuery(filters.query || '');
  }, [filters.query]);

  const handleStatusChange = (val: string) => {
      onFilterChange({ ...filters, status: val === 'all' ? undefined : val, page: 1 });
  };
  
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Debounce the search - wait 300ms after user stops typing
    debounceTimerRef.current = setTimeout(() => {
      onFilterChange({ ...filters, query: value, page: 1 });
    }, 300);
  };
  
  // Cleanup debounce timer on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  // Client-side filtering for immediate feedback (no loading state needed)
  const REASON_BADGE_COLORS: Record<string, string> = {
    item_damaged: 'bg-orange-100 text-orange-800',
    expired: 'bg-red-100 text-red-800',
    late_delivery: 'bg-amber-100 text-amber-800',
    wrong_item: 'bg-purple-100 text-purple-800',
    customer_cancelled: 'bg-blue-100 text-blue-800',
    other: 'bg-gray-100 text-gray-800',
  };

  const filteredData = React.useMemo(() => {
    let filtered = [...data];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.orderId.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerEmail.toLowerCase().includes(q)
      );
    }
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === filters.status);
    }
    if (filters.reason && filters.reason !== 'all') {
      filtered = filtered.filter(r => r.reasonCode === filters.reason);
    }
    return filtered;
  }, [data, searchQuery, filters.status, filters.reason]);

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
      {/* Table Filters */}
      <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-between gap-4">
        <h3 className="font-bold text-[#212121] whitespace-nowrap">Refund Queue</h3>
        
        <div className="flex items-center gap-2 w-full justify-end">
            <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={14} />
                <Input 
                    placeholder="Search Order ID..." 
                    className="h-8 pl-9 bg-white text-xs"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                />
            </div>
            
            <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
                    <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
            </Select>
            <Select value={filters.reason || 'all'} onValueChange={(val) => onFilterChange({ ...filters, reason: val === 'all' ? undefined : val, page: 1 })}>
                <SelectTrigger className="w-[160px] h-8 text-xs bg-white">
                    <SelectValue placeholder="All Reasons" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Reasons</SelectItem>
                    <SelectItem value="item_damaged">Item Damaged</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="late_delivery">Late Delivery</SelectItem>
                    <SelectItem value="wrong_item">Wrong Item</SelectItem>
                    <SelectItem value="customer_cancelled">Customer Cancelled</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      {filteredData.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
              No refund requests match your filters.
          </div>
      ) : (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
                <tr>
                    <th className="px-6 py-3">Order ID</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Reason</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Requested</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-[#E0E0E0]">
                {filteredData.map((refund) => (
                    <tr key={refund.id} className="hover:bg-[#FAFAFA] group transition-colors cursor-pointer" onClick={() => onViewDetails(refund)}>
                        <td className="px-6 py-4 font-mono text-[#616161] font-medium">{refund.orderId}</td>
                        <td className="px-6 py-4">
                            <div className="font-medium text-[#212121]">{refund.customerName}</div>
                            <div className="text-xs text-[#757575]">{refund.customerEmail}</div>
                        </td>
                        <td className="px-6 py-4">
                            <Badge variant="outline" className={`capitalize border-0 font-medium text-xs ${REASON_BADGE_COLORS[refund.reasonCode] || 'bg-gray-100 text-gray-800'}`}>
                              {refund.reasonCode.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-xs text-[#757575] truncate max-w-[200px] block mt-0.5">{refund.reasonText}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-[#212121]">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: refund.currency }).format(refund.amount)}
                        </td>
                        <td className="px-6 py-4 text-[#616161] text-xs">
                            {timeAgo(refund.requestedAt)}
                        </td>
                         <td className="px-6 py-4">
                             <Badge variant="outline" className={`capitalize border-0 font-medium ${
                                refund.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                refund.status === 'approved' ? 'bg-green-100 text-green-800' :
                                refund.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                                {refund.status}
                            </Badge>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-2 items-center">
                                {refund.status === 'pending' ? (
                                    <>
                                        <button 
                                            onClick={() => onApprove(refund)}
                                            className="px-3 py-1.5 bg-[#14B8A6] text-white text-xs font-bold rounded hover:bg-[#0D9488] transition-colors"
                                        >
                                            Approve
                                        </button>
                                        <button 
                                            onClick={() => onReject(refund)}
                                            className="px-3 py-1.5 bg-white border border-[#E0E0E0] text-[#757575] text-xs font-bold rounded hover:bg-[#F5F5F5] transition-colors"
                                        >
                                            Reject
                                        </button>
                                    </>
                                ) : (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onViewDetails(refund)}>
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
