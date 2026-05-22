import React from 'react';
import { useDrop } from 'react-dnd';
import { Layers, Package, MapPin, Trash2, CheckCircle2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Cluster } from './groupDeliveryTypes';
import { DND_ORDER_TYPE, type DragOrderItem } from './groupDeliveryTypes';

interface GroupDeliveryClusterColumnProps {
  clusters: Cluster[];
  selectedClusterId: string | null;
  distanceThreshold: number;
  clustering?: boolean;
  loading?: boolean;
  onSelectCluster: (cluster: Cluster) => void;
  onDeleteCluster: (cluster: Cluster) => void;
  onDistanceChange: (km: number) => void;
  onDropOrders: (orderIds: string[], targetClusterId: string | 'new') => void;
}

function DroppableClusterCard({
  cluster,
  selected,
  onSelect,
  onDelete,
  onDropOrders,
}: {
  cluster: Cluster;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDropOrders: (orderIds: string[], targetId: string) => void;
}) {
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: DND_ORDER_TYPE,
      drop: (item: DragOrderItem) => {
        onDropOrders(item.orderIds, cluster.id);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [cluster.id, onDropOrders]
  );

  return (
    <div
      ref={drop}
      onClick={onSelect}
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all',
        selected ? 'border-[#F97316] bg-[#FFF7ED]' : 'border-[#E0E0E0] hover:border-[#F97316]',
        isOver && canDrop && 'ring-2 ring-[#F97316] ring-offset-1 bg-orange-50/80',
        cluster.isSaved && 'opacity-95'
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cluster.color }} />
          <span className="font-bold text-sm truncate">
            {cluster.id.startsWith('draft') ? 'Draft group' : `Group #${(cluster.clusterId || cluster.id).slice(-4).toUpperCase()}`}
          </span>
          {cluster.isSaved && <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
            {cluster.orders.length}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-gray-400 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="text-xs text-[#757575] space-y-1">
        <div className="flex items-center gap-1">
          <Package size={12} className="shrink-0" />
          <span className="truncate">{cluster.orders.map((o) => o.id).join(', ')}</span>
        </div>
        {cluster.orders[0] && (
          <div className="flex items-center gap-1">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate text-[10px]">{String(cluster.orders[0].dropLocation)}</span>
          </div>
        )}
      </div>
      {isOver && canDrop && (
        <p className="text-[10px] text-[#F97316] font-semibold mt-2">Drop to add to group</p>
      )}
    </div>
  );
}

function NewGroupDropZone({ onDropOrders }: { onDropOrders: (orderIds: string[], targetId: string | 'new') => void }) {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: DND_ORDER_TYPE,
      drop: (item: DragOrderItem) => {
        onDropOrders(item.orderIds, 'new');
      },
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    }),
    [onDropOrders]
  );

  return (
    <div
      ref={drop}
      className={cn(
        'mt-2 p-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-xs text-[#757575]',
        isOver ? 'border-[#F97316] bg-[#FFF7ED] text-[#F97316]' : 'border-[#E0E0E0]'
      )}
    >
      <Plus size={14} />
      Drop here to create new group
    </div>
  );
}

export function GroupDeliveryClusterColumn({
  clusters,
  selectedClusterId,
  distanceThreshold,
  clustering,
  loading,
  onSelectCluster,
  onDeleteCluster,
  onDistanceChange,
  onDropOrders,
}: GroupDeliveryClusterColumnProps) {
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 shadow-sm flex flex-col overflow-hidden h-full min-h-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-[#212121] flex items-center gap-2 text-sm">
          <Layers size={18} className="text-[#F97316]" />
          Groups ({clusters.length})
        </h3>
        <select
          className="text-xs border border-[#E0E0E0] rounded p-1 disabled:opacity-50"
          value={distanceThreshold}
          disabled={loading || clustering}
          onChange={(e) => onDistanceChange(Number(e.target.value))}
          title="Auto-group radius (km)"
        >
          <option value={0.1}>0.1 km</option>
          <option value={0.5}>0.5 km</option>
          <option value={1}>1 km</option>
          <option value={2}>2 km</option>
          <option value={5}>5 km</option>
        </select>
      </div>
      <p className="text-[10px] text-[#757575] mb-3">
        {clustering ? 'Forming groups…' : `Auto-group at ${distanceThreshold} km · drag orders into groups`}
      </p>

      <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1">
        {clusters.map((cluster) => (
          <DroppableClusterCard
            key={cluster.id}
            cluster={cluster}
            selected={selectedClusterId === cluster.id}
            onSelect={() => onSelectCluster(cluster)}
            onDelete={() => onDeleteCluster(cluster)}
            onDropOrders={onDropOrders}
          />
        ))}
        <NewGroupDropZone onDropOrders={onDropOrders} />
      </div>
    </div>
  );
}
