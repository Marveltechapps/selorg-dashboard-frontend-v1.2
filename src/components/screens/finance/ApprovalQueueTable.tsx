import React, { useMemo, useState } from 'react';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "../../ui/table";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Skeleton } from "../../ui/skeleton";
import { 
    CheckCircle2, 
    XCircle, 
    ArrowUpDown, 
    Filter,
    ChevronRight,
    Search
} from 'lucide-react';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "../../ui/dropdown-menu";
import { ApprovalTask, TaskType, ApprovalDecisionPayload } from './approvalsApi';

interface Props {
  tasks: ApprovalTask[];
  isLoading: boolean;
  onTaskClick: (task: ApprovalTask) => void;
  onQuickApprove: (id: string) => void;
  onQuickReject: (id: string) => void;
}

export function ApprovalQueueTable({ tasks, isLoading, onTaskClick, onQuickApprove, onQuickReject }: Props) {
  const [filterType, setFilterType] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks;
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }
    
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortField === 'type') {
        comparison = a.type.localeCompare(b.type);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [tasks, filterType, sortField, sortDirection]);
  
  if (isLoading) {
      return (
          <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center space-x-4 p-4">
                      <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
              ))}
          </div>
      );
  }

  if (tasks.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-gray-50/50 border-dashed">
              <div className="bg-green-100 p-3 rounded-full mb-4">
                  <CheckCircle2 className="text-green-600 h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">All caught up!</h3>
              <p className="text-gray-500 max-w-sm mt-1">No pending approvals found matching your criteria.</p>
          </div>
      );
  }

  const getTypeBadge = (type: string) => {
      switch (type) {
          case 'refund': return <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200 border-0">Refund</Badge>;
          case 'invoice': return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">Invoice</Badge>;
          case 'large_payment': return <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-0">High Value</Badge>;
          case 'vendor_payment': return <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-0">Vendor</Badge>;
          default: return <Badge variant="outline" className="text-gray-600">Other</Badge>;
      }
  };

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
            <h3 className="font-bold text-[#212121]">Approval Queue</h3>
            <div className="flex gap-2">
                 <DropdownMenu open={showFilterMenu} onOpenChange={setShowFilterMenu}>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs font-medium" 
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                        >
                            <Filter className="h-3.5 w-3.5 mr-1.5" /> Filter
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                        <DropdownMenuItem 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setFilterType('all'); 
                                setShowFilterMenu(false);
                            }}
                        >
                            All Types
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setFilterType('refund'); 
                                setShowFilterMenu(false);
                            }}
                        >
                            Refunds
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setFilterType('invoice'); 
                                setShowFilterMenu(false);
                            }}
                        >
                            Invoices
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setFilterType('vendor_payment'); 
                                setShowFilterMenu(false);
                            }}
                        >
                            Vendor Payments
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setFilterType('large_payment'); 
                                setShowFilterMenu(false);
                            }}
                        >
                            Large Payments
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
                 <DropdownMenu open={showSortMenu} onOpenChange={setShowSortMenu}>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs font-medium" 
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                        >
                            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" /> Sort
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                        <DropdownMenuItem 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSortField('date'); 
                                setSortDirection(sortField === 'date' && sortDirection === 'desc' ? 'asc' : 'desc'); 
                                setShowSortMenu(false);
                            }}
                        >
                            Date {sortField === 'date' && sortDirection === 'desc' ? '↓' : '↑'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSortField('amount'); 
                                setSortDirection(sortField === 'amount' && sortDirection === 'desc' ? 'asc' : 'desc'); 
                                setShowSortMenu(false);
                            }}
                        >
                            Amount {sortField === 'amount' && sortDirection === 'desc' ? '↓' : '↑'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSortField('type'); 
                                setSortDirection(sortField === 'type' && sortDirection === 'desc' ? 'asc' : 'desc'); 
                                setShowSortMenu(false);
                            }}
                        >
                            Type {sortField === 'type' && sortDirection === 'desc' ? '↓' : '↑'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
            </div>
        </div>

        <Table>
            <TableHeader className="bg-[#F5F7FA]">
                <TableRow>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredAndSortedTasks.map((task) => (
                    <TableRow 
                        key={task.id} 
                        className="group cursor-pointer hover:bg-gray-50/80 transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.currentTarget === e.target || (e.target as HTMLElement).closest('td')) {
                            onTaskClick(task);
                          }
                        }}
                    >
                        <TableCell className="font-medium">
                            {getTypeBadge(task.type)}
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="font-medium text-[#212121]">{task.description}</span>
                                <span className="text-xs text-[#757575] mt-0.5 line-clamp-1">{task.details}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <span className="font-bold text-[#212121]">
                                ${task.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-700">{task.requesterName}</span>
                                <span className="text-xs text-gray-500">{task.requesterRole}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onQuickApprove(task.id);
                                    }}
                                    title="Quick Approve"
                                    type="button"
                                >
                                    <CheckCircle2 size={18} />
                                </Button>
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onQuickReject(task.id);
                                    }}
                                    title="Quick Reject"
                                    type="button"
                                >
                                    <XCircle size={18} />
                                </Button>
                                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-400 ml-2" />
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  );
}
