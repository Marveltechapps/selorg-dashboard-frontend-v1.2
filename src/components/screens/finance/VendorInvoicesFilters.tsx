import React, { useRef, useEffect } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { Label } from "../../ui/label";
import { VendorInvoiceFilter, Vendor } from './payablesApi';

interface Props {
  filters: VendorInvoiceFilter;
  vendors: Vendor[];
  invoices?: any[];
  onFilterChange: (newFilters: VendorInvoiceFilter) => void;
  onExport: () => void;
}

export function VendorInvoicesFilters({ filters, vendors, invoices = [], onFilterChange, onExport }: Props) {
  const [searchQuery, setSearchQuery] = React.useState(filters.query || '');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sync search query with filters
  useEffect(() => {
    setSearchQuery(filters.query || '');
  }, [filters.query]);
  
  const handleStatusChange = (val: string) => {
      onFilterChange({ ...filters, status: val === 'all' ? undefined : val, page: 1 });
  };

  const handleVendorChange = (val: string) => {
      onFilterChange({ ...filters, vendorId: val === 'all' ? undefined : val, page: 1 });
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
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  const handleExportClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Call parent export handler which uses filtered invoices
    onExport();
  };

  return (
    <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-[#E0E0E0] shadow-sm mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
        <Input 
          type="text" 
          placeholder="Search invoice #..." 
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#F5F5F5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#14B8A6] focus:border-transparent transition-all shadow-none"
        />
      </div>

      <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[160px] h-9 border-[#E0E0E0] bg-white focus:ring-[#14B8A6]">
           <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.vendorId || 'all'} onValueChange={handleVendorChange}>
        <SelectTrigger className="w-[180px] h-9 border-[#E0E0E0] bg-white focus:ring-[#14B8A6]">
           <SelectValue placeholder="All Vendors" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="h-9 gap-2 text-[#757575] border-[#E0E0E0] hover:text-[#212121]">
                <Filter size={16} />
                Date
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
                <h4 className="font-medium leading-none">Date Range</h4>
                <div className="space-y-2">
                    <Label htmlFor="date-from">From</Label>
                    <Input 
                        id="date-from" 
                        type="date" 
                        className="h-8" 
                        value={filters.dateFrom || ''}
                        onChange={(e) => {
                          e.preventDefault();
                          onFilterChange({...filters, dateFrom: e.target.value || undefined, page: 1});
                        }}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="date-to">To</Label>
                    <Input 
                        id="date-to" 
                        type="date" 
                        className="h-8"
                        value={filters.dateTo || ''}
                        onChange={(e) => {
                          e.preventDefault();
                          onFilterChange({...filters, dateTo: e.target.value || undefined, page: 1});
                        }}
                    />
                </div>
            </div>
        </PopoverContent>
      </Popover>

      <Button variant="ghost" className="h-9 w-9 p-0 text-[#757575] hover:text-[#14B8A6]" onClick={handleExportClick} title="Export List" type="button">
          <Download size={18} />
      </Button>
    </div>
  );
}
