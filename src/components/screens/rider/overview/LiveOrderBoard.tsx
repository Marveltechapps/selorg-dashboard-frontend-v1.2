import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../../../components/ui/table';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../../../components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../../../components/ui/dropdown-menu';
import { MoreHorizontal, Search, ArrowUpDown } from 'lucide-react';
import { Order, Rider } from './types';
import { Switch } from '../../../../components/ui/switch';
import { Label } from '../../../../components/ui/label';

interface LiveOrderBoardProps {
  orders: Order[];
  riders: Rider[];
  loading: boolean;
  onTrackOrder: (order: Order) => void;
  onAlertOrder: (order: Order) => void;
  onAssignOrder: (order: Order) => void;
  autoAssignEnabled: boolean;
  onToggleAutoAssign: (enabled: boolean) => void;
  refreshData: () => void;
  initialSearchQuery?: string;
}

export function LiveOrderBoard({
  orders,
  riders,
  loading,
  onTrackOrder,
  onAlertOrder,
  onAssignOrder,
  autoAssignEnabled,
  onToggleAutoAssign,
  refreshData,
  initialSearchQuery = '',
}: LiveOrderBoardProps) {
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Order, direction: 'asc' | 'desc' } | null>(null);

  // Sync top bar search into board when it changes
  React.useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  // Filtering logic
  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'All' || order.status.toLowerCase() === filterStatus.toLowerCase();
    
    const riderName = riders.find(r => r.id === order.riderId)?.name || '';
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      riderName.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesStatus && matchesSearch;
  });

  // Sorting logic
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const { key, direction } = sortConfig;
    let aValue: any = a[key];
    let bValue: any = b[key];
    
    if (key === 'etaMinutes') {
       aValue = a.etaMinutes || 999;
       bValue = b.etaMinutes || 999;
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof Order) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_transit': return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
      case 'picked_up': return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100';
      case 'delayed': return 'bg-red-100 text-red-700 hover:bg-red-100';
      case 'delivered': return 'bg-green-100 text-green-700 hover:bg-green-100';
      case 'assigned': return 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100';
      case 'pending': return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRiderName = (riderId?: string) => {
    if (!riderId) return null;
    // Try exact match first
    let rider = riders.find(r => r.id === riderId);
    if (rider) return rider;
    
    // Try normalized matching for different ID formats
    // Handle cases like: RIDER-1 vs RIDER-0001, r1 vs RIDER-1, etc.
    const normalizeId = (id: string) => {
      // Remove leading zeros and normalize format
      const match = id.match(/^(?:r|rider-?)(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        return `RIDER-${String(num).padStart(4, '0')}`;
      }
      // If already in RIDER-XXXX format, normalize padding
      const riderMatch = id.match(/^RIDER-(\d+)$/i);
      if (riderMatch) {
        const num = parseInt(riderMatch[1], 10);
        return `RIDER-${String(num).padStart(4, '0')}`;
      }
      return id;
    };
    
    const normalizedId = normalizeId(riderId);
    rider = riders.find(r => {
      const rNormalized = normalizeId(r.id);
      return rNormalized === normalizedId || r.id === normalizedId || r.id === riderId;
    });
    
    return rider || null;
  };

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="font-bold text-[#212121] text-lg">Live Order Board</h3>
        
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 mr-2">
                <Switch 
                    id="auto-assign" 
                    checked={autoAssignEnabled}
                    onCheckedChange={onToggleAutoAssign}
                />
                <Label htmlFor="auto-assign" className="text-sm font-medium text-[#757575]">
                    {autoAssignEnabled ? 'Auto-Assign On' : 'Auto-Assign Off'}
                </Label>
            </div>

            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                placeholder="Search orders..."
                className="pl-9 w-[200px] h-9 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] h-9 bg-white">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="overflow-auto max-h-[600px]">
        <Table>
          <TableHeader className="bg-[#F5F7FA] sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[120px]">Order ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rider</TableHead>
              <TableHead className="cursor-pointer hover:text-gray-900" onClick={() => handleSort('etaMinutes')}>
                  <div className="flex items-center gap-1">
                      ETA <ArrowUpDown className="h-3 w-3" />
                  </div>
              </TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               Array.from({ length: 5 }).map((_, i) => (
                   <TableRow key={i}>
                       <TableCell><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></TableCell>
                       <TableCell><div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div></TableCell>
                       <TableCell><div className="h-8 bg-gray-200 rounded-full w-8 animate-pulse inline-block mr-2"></div><div className="h-4 bg-gray-200 rounded w-24 animate-pulse inline-block"></div></TableCell>
                       <TableCell><div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div></TableCell>
                       <TableCell><div className="h-8 bg-gray-200 rounded w-8 ml-auto animate-pulse"></div></TableCell>
                   </TableRow>
               ))
            ) : sortedOrders.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No orders found matching your criteria.
                    </TableCell>
                </TableRow>
            ) : (
                sortedOrders.map((order) => {
                  const rider = getRiderName(order.riderId);
                  const isDelayed = order.status === 'delayed';
                  
                  return (
                    <TableRow key={order.id} className="hover:bg-[#FAFAFA]">
                      <TableCell className="font-medium text-[#212121]">{order.id}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`font-medium border-0 ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rider ? (
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                    {rider.avatarInitials}
                                </div>
                                <span className="text-sm text-gray-700">{rider.name}</span>
                            </div>
                        ) : (
                            <span className="text-sm text-gray-400 italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.status === 'delivered' ? (
                            <span className="text-gray-500">Completed</span>
                        ) : order.etaMinutes !== undefined ? (
                            <span className={`font-bold ${isDelayed || order.etaMinutes > 45 ? 'text-[#EF4444]' : 'text-[#16A34A]'}`}>
                                {order.etaMinutes} mins
                            </span>
                        ) : (
                            <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onTrackOrder(order)}>
                              View Details
                            </DropdownMenuItem>
                            {order.status === 'pending' && !autoAssignEnabled && (
                                <DropdownMenuItem onClick={() => onAssignOrder(order)}>
                                    Assign Rider
                                </DropdownMenuItem>
                            )}
                            {(order.status !== 'pending' && order.status !== 'delivered' && order.riderId) || 
                             (order.status === 'assigned' || order.status === 'in_transit' || order.status === 'picked_up') ? (
                                <DropdownMenuItem onClick={() => onAssignOrder(order)}>
                                    Reassign Rider
                                </DropdownMenuItem>
                            ) : null}
                            {isDelayed && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onAlertOrder(order)} className="text-red-600 focus:text-red-600">
                                        Send Alert
                                    </DropdownMenuItem>
                                </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
