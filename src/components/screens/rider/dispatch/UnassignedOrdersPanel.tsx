import React, { useState, useMemo } from "react";
import { DispatchOrder } from "./types";
import { UnassignedOrderCard } from "./UnassignedOrderCard";
import { Search, Filter, ArrowUpDown, Layers, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface UnassignedOrdersPanelProps {
  orders: DispatchOrder[];
  loading: boolean;
  onAssign: (order: DispatchOrder) => void;
  onBatchAssign: (orderIds: string[]) => void;
  onViewDetail?: (order: DispatchOrder) => void;
}

export function UnassignedOrdersPanel({
  orders,
  loading,
  onAssign,
  onBatchAssign,
  onViewDetail,
}: UnassignedOrdersPanelProps) {
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"priority" | "eta">("priority");

  const filteredOrders = useMemo(() => {
    let result = orders.filter((o) => 
      o.id.toLowerCase().includes(search.toLowerCase()) || 
      o.dropLocation.address.toLowerCase().includes(search.toLowerCase())
    );

    if (filterPriority !== "all") {
      result = result.filter((o) => o.priority === filterPriority);
    }

    result.sort((a, b) => {
      if (sortBy === "priority") {
        const pMap = { high: 3, medium: 2, low: 1 };
        return pMap[b.priority] - pMap[a.priority];
      } else {
        return a.etaMinutes - b.etaMinutes;
      }
    });

    return result;
  }, [orders, search, filterPriority, sortBy]);

  const toggleOrderSelection = (id: string) => {
    if (selectedOrders.includes(id)) {
      setSelectedOrders(selectedOrders.filter((oid) => oid !== id));
    } else {
      setSelectedOrders([...selectedOrders, id]);
    }
  };

  const handleBatchClick = () => {
    if (isBatchMode && selectedOrders.length > 0) {
      onBatchAssign(selectedOrders);
      setSelectedOrders([]);
      setIsBatchMode(false);
    } else {
      setIsBatchMode(!isBatchMode);
      setSelectedOrders([]);
    }
  };

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[#212121]">Unassigned Orders</h3>
            <Badge variant="destructive" className="rounded-full px-2">
              {orders.length}
            </Badge>
          </div>
          <Button 
            size="sm" 
            variant={isBatchMode ? (selectedOrders.length > 0 ? "default" : "secondary") : "outline"}
            className={isBatchMode && selectedOrders.length > 0 ? "bg-[#F97316] hover:bg-[#EA580C]" : ""}
            onClick={handleBatchClick}
          >
            {isBatchMode ? (selectedOrders.length > 0 ? "Assign Selected" : "Cancel Batch") : "Batch Mode"}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search orders..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 text-xs h-8 gap-1">
                <Filter size={12} />
                {filterPriority === "all" ? "All Priorities" : filterPriority}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterPriority("all")}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterPriority("high")}>High</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterPriority("medium")}>Medium</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterPriority("low")}>Low</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-xs h-8 gap-1"
            onClick={() => setSortBy(sortBy === "priority" ? "eta" : "priority")}
          >
            <ArrowUpDown size={12} />
            Sort: {sortBy === "priority" ? "Priority" : "Fastest ETA"}
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50">
        {loading ? (
          <div className="p-4 text-center text-gray-400 text-sm">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-400 flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
              <CheckSquare size={20} />
            </div>
            <p className="font-medium text-gray-600">All caught up!</p>
            <p className="text-xs">No unassigned orders found.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <UnassignedOrderCard
              key={order.id}
              order={order}
              onAssign={onAssign}
              onViewDetail={onViewDetail}
              isBatchMode={isBatchMode}
              isSelected={selectedOrders.includes(order.id)}
              onToggleSelect={toggleOrderSelection}
            />
          ))
        )}
      </div>
      
      {isBatchMode && (
        <div className="p-3 bg-orange-50 border-t border-orange-100 text-xs text-orange-800 flex justify-between items-center">
          <span>{selectedOrders.length} orders selected</span>
          <span className="font-semibold">Select multiple orders to batch assign</span>
        </div>
      )}
    </div>
  );
}
