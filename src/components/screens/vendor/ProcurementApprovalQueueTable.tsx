import React, { useState, useMemo } from 'react';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { 
    CheckCircle2, 
    XCircle, 
    ArrowUpDown, 
    Filter,
    ChevronRight,
    AlertCircle,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { ProcurementApprovalTask, ProcurementTaskType } from './procurementApprovalsApi';

interface Props {
  tasks: ProcurementApprovalTask[];
  isLoading: boolean;
  onTaskClick: (task: ProcurementApprovalTask) => void;
  onQuickApprove: (id: string) => void;
  onQuickReject: (id: string) => void;
}

type SortField = 'type' | 'description' | 'requester' | 'value' | 'createdAt' | 'priority';
type SortDirection = 'asc' | 'desc';

export function ProcurementApprovalQueueTable({ tasks, isLoading, onTaskClick, onQuickApprove, onQuickReject }: Props) {
  const [filterType, setFilterType] = useState<ProcurementTaskType | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks;
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(task => task.type === filterType);
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'requester':
          comparison = a.requesterName.localeCompare(b.requesterName);
          break;
        case 'value':
          comparison = (a.valueAmount || 0) - (b.valueAmount || 0);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'priority':
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [tasks, filterType, sortField, sortDirection]);
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setShowSortMenu(false);
  };
  

  const getTypeBadge = (type: ProcurementTaskType) => {
      switch (type) {
          case 'vendor_onboarding': return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">Onboarding</Badge>;
          case 'purchase_order': return <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-0">PO</Badge>;
          case 'contract_renewal': return <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-0">Contract</Badge>;
          case 'price_change': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-0">Price Change</Badge>;
          case 'payment_release': return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200 border-0">Payment</Badge>;
          default: return <Badge variant="outline" className="text-gray-600">Other</Badge>;
      }
  };

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
            <h3 className="font-bold text-[#212121]">Approval Queue {filteredAndSortedTasks.length !== tasks.length && `(${filteredAndSortedTasks.length} of ${tasks.length})`}</h3>
            <div className="flex gap-2">
                 <DropdownMenu open={showFilterMenu} onOpenChange={setShowFilterMenu}>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-medium">
                            <Filter className="h-3.5 w-3.5 mr-1.5" /> Filter {filterType !== 'all' && `(${filterType})`}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setFilterType('all')}>
                            All Types {filterType === 'all' && '✓'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterType('vendor_onboarding')}>
                            Vendor Onboarding {filterType === 'vendor_onboarding' && '✓'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterType('purchase_order')}>
                            Purchase Order {filterType === 'purchase_order' && '✓'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterType('contract_renewal')}>
                            Contract Renewal {filterType === 'contract_renewal' && '✓'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterType('price_change')}>
                            Price Change {filterType === 'price_change' && '✓'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterType('payment_release')}>
                            Payment Release {filterType === 'payment_release' && '✓'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
                 <DropdownMenu open={showSortMenu} onOpenChange={setShowSortMenu}>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-medium">
                            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" /> Sort {sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleSort('priority')}>
                            Priority {sortField === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('createdAt')}>
                            Date {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('type')}>
                            Type {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('description')}>
                            Description {sortField === 'description' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('requester')}>
                            Requester {sortField === 'requester' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('value')}>
                            Value {sortField === 'value' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
            </div>
        </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="space-y-3 w-full max-w-2xl px-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="bg-green-100 p-3 rounded-full mb-4">
                    <CheckCircle2 className="text-green-600 h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">All caught up!</h3>
                <p className="text-gray-500 max-w-sm mt-1">No procurement approvals found.</p>
            </div>
        ) : filteredAndSortedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="bg-gray-100 p-3 rounded-full mb-4">
                    <Filter className="text-gray-600 h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No tasks match your filter</h3>
                <p className="text-gray-500 max-w-sm mt-1">Try selecting a different filter type.</p>
            </div>
        ) : (
            <Table>
                <TableHeader className="bg-[#F5F7FA]">
                    <TableRow>
                        <TableHead className="w-[140px]">Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Requester</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredAndSortedTasks.map((task) => (
                        <TableRow 
                            key={task.id} 
                            className="group cursor-pointer hover:bg-gray-50/80 transition-colors"
                            onClick={() => onTaskClick(task)}
                        >
                            <TableCell className="font-medium align-top py-4">
                                <div className="flex flex-col gap-2">
                                    {getTypeBadge(task.type)}
                                    {task.priority === 'high' && (
                                        <span className="inline-flex items-center text-[10px] font-bold text-red-600 uppercase">
                                            <AlertCircle size={10} className="mr-1" /> High Priority
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="align-top py-4">
                                <div className="flex flex-col">
                                    <span className="font-medium text-[#212121]">{task.description}</span>
                                    <span className="text-xs text-[#757575] mt-1 line-clamp-1">{task.details}</span>
                                </div>
                            </TableCell>
                            <TableCell className="align-top py-4">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-700">{task.requesterName}</span>
                                    <span className="text-xs text-gray-500">{task.requesterRole}</span>
                                </div>
                            </TableCell>
                             <TableCell className="align-top py-4">
                                <span className="font-bold text-[#212121]">
                                    {task.valueAmount ? `₹${task.valueAmount.toLocaleString()}` : '—'}
                                </span>
                            </TableCell>
                            <TableCell className="text-right align-top py-4">
                                <div className="flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => onQuickApprove(task.id)}
                                        title="Quick Approve"
                                    >
                                        <CheckCircle2 size={18} />
                                    </Button>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => onQuickReject(task.id)}
                                        title="Quick Reject"
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
        )}
    </div>
  );
}
