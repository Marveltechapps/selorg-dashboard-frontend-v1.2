import React from 'react';
import { useDrag } from 'react-dnd';
import { Search, GripVertical, CheckSquare, Square } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { GroupDeliveryFilterOptions, GroupDeliveryOrder } from './groupDeliveryTypes';
import { DND_ORDER_TYPE, type DragOrderItem } from './groupDeliveryTypes';

interface GroupDeliveryOrdersColumnProps {
  orders: GroupDeliveryOrder[];
  filterOptions: GroupDeliveryFilterOptions;
  search: string;
  zoneFilter: string;
  statusFilter: string;
  selectedOrderIds: Set<string>;
  loading?: boolean;
  onSearchChange: (v: string) => void;
  onZoneChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onToggleSelect: (orderId: string, multi?: boolean) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

function DraggableOrderRow({
  order,
  selected,
  selectedOrderIds,
  onToggleSelect,
}: {
  order: GroupDeliveryOrder;
  selected: boolean;
  selectedOrderIds: Set<string>;
  onToggleSelect: (id: string, multi?: boolean) => void;
}) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: DND_ORDER_TYPE,
      item: (): DragOrderItem => {
        if (selected && selectedOrderIds.size > 1) {
          return { orderIds: Array.from(selectedOrderIds) };
        }
        return { orderIds: [order.id] };
      },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [order.id, selected, selectedOrderIds]
  );

  return (
    <div
      ref={drag}
      className={cn(
        'flex items-start gap-2 p-2 rounded-lg border cursor-grab active:cursor-grabbing transition-opacity',
        selected ? 'border-[#F97316] bg-[#FFF7ED]' : 'border-[#E8E8E8] bg-white hover:border-[#F97316]/50',
        isDragging && 'opacity-40'
      )}
      onClick={(e) => onToggleSelect(order.id, e.shiftKey || e.metaKey || e.ctrlKey)}
    >
      <GripVertical size={14} className="text-gray-400 shrink-0 mt-0.5" />
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggleSelect(order.id, true)}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <div className="font-bold text-[11px] truncate">{order.id}</div>
        <div className="text-[10px] text-gray-600 truncate">{order.customerName}</div>
        <div className="flex flex-wrap gap-1 mt-1">
          {order.zone && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{order.zone}</span>
          )}
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">
            {order.status}
          </span>
          {order.distanceKm != null && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {order.distanceKm.toFixed(1)} km
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function GroupDeliveryOrdersColumn({
  orders,
  filterOptions,
  search,
  zoneFilter,
  statusFilter,
  selectedOrderIds,
  loading,
  onSearchChange,
  onZoneChange,
  onStatusChange,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
}: GroupDeliveryOrdersColumnProps) {
  const allSelected = orders.length > 0 && orders.every((o) => selectedOrderIds.has(o.id));

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 shadow-sm flex flex-col overflow-hidden h-full min-h-0">
      <h3 className="font-bold text-[#212121] text-sm mb-3">Available orders</h3>

      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a1a1aa]" size={14} />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search order ID, customer, address…"
          className="pl-8 h-9 text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <Select value={zoneFilter} onValueChange={onZoneChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All zones</SelectItem>
            {filterOptions.zones.map((z) => (
              <SelectItem key={z} value={z}>
                {z}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {filterOptions.statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between text-[10px] text-[#757575] mb-2">
        <span>{loading ? 'Loading…' : `${orders.length} orders`}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="hover:text-[#F97316] flex items-center gap-0.5"
            onClick={allSelected ? onClearSelection : onSelectAll}
          >
            {allSelected ? <CheckSquare size={12} /> : <Square size={12} />}
            {allSelected ? 'Clear' : 'Select all'}
          </button>
          {selectedOrderIds.size > 0 && (
            <span className="font-semibold text-[#F97316]">{selectedOrderIds.size} selected</span>
          )}
        </div>
      </div>

      <p className="text-[10px] text-[#9CA3AF] mb-2">Drag orders onto a group · Shift+click to multi-select</p>

      <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
        {orders.length === 0 && !loading && (
          <div className="text-xs text-center text-gray-400 py-8">No orders match filters</div>
        )}
        {orders.map((order) => (
          <DraggableOrderRow
            key={order.id}
            order={order}
            selected={selectedOrderIds.has(order.id)}
            selectedOrderIds={selectedOrderIds}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    </div>
  );
}
