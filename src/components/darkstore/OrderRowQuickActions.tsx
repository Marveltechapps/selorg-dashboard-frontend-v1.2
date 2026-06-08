import React from 'react';
import { User, Phone, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderRowQuickActionsProps {
  onAssign: () => void;
  onCall: () => void;
  onRto: () => void;
  showAssign?: boolean;
  calling?: boolean;
  className?: string;
}

export function OrderRowQuickActions({
  onAssign,
  onCall,
  onRto,
  showAssign = true,
  calling = false,
  className,
}: OrderRowQuickActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {showAssign && (
        <button
          type="button"
          title="Assign picker"
          onClick={onAssign}
          className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
        >
          <User size={14} />
        </button>
      )}
      <button
        type="button"
        title="Call customer"
        disabled={calling}
        onClick={onCall}
        className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
      >
        <Phone size={14} />
      </button>
      <button
        type="button"
        title="Mark RTO"
        onClick={onRto}
        className="p-1.5 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
      >
        <AlertOctagon size={14} />
      </button>
    </div>
  );
}
