import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Clock, MoreVertical, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert } from './types';
// import { formatDistanceToNow } from 'date-fns'; // We might need to handle this manually if date-fns is not available, but let's assume standard JS for now or implement a simple helper.

interface AlertTileProps {
  alert: Alert;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onClick: () => void;
  onAction: (action: string, alert: Alert) => void;
}

const getSeverityStyles = (severity: string) => {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        iconBg: 'bg-white',
        iconColor: 'text-red-600',
        text: 'text-red-900',
        desc: 'text-red-800',
        Icon: ShieldAlert,
      };
    case 'warning':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        iconBg: 'bg-white',
        iconColor: 'text-yellow-600',
        text: 'text-yellow-900',
        desc: 'text-yellow-800',
        Icon: AlertTriangle,
      };
    case 'info':
    default:
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        iconBg: 'bg-white',
        iconColor: 'text-blue-600',
        text: 'text-blue-900',
        desc: 'text-blue-800',
        Icon: Info,
      };
  }
};

const SimpleTimeAgo = ({ date }: { date: string }) => {
    try {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return <>{mins} mins ago</>;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return <>{hours} hours ago</>;
        return <>{Math.floor(hours / 24)} days ago</>;
    } catch (e) {
        return <>Just now</>;
    }
}

export function AlertTile({ alert, isSelected, onSelect, onClick, onAction }: AlertTileProps) {
  const styles = getSeverityStyles(alert.severity);
  const Icon = styles.Icon;

  return (
    <div 
        className={`relative group flex gap-4 p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${styles.bg} ${styles.border} ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
        onClick={onClick}
    >
      {/* Selection Checkbox - Visible on hover or selected */}
      <div className={`absolute top-4 left-4 z-10 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`} onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={isSelected} onCheckedChange={(c) => onSelect(c as boolean)} className="bg-white border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
      </div>

      {/* Icon */}
      <div className={`shrink-0 p-3 rounded-full shadow-sm ${styles.iconBg} ${styles.iconColor} ml-8`}>
        <Icon size={24} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
            <h3 className={`font-bold text-lg ${styles.text} flex items-center gap-2`}>
                {alert.title}
                {alert.region && <Badge variant="outline" className="bg-white/50 font-normal text-xs">{alert.region}</Badge>}
            </h3>
            <span className={`text-xs font-bold ${styles.text} flex items-center gap-1 opacity-70`}>
                <Clock size={12} />
                <SimpleTimeAgo date={alert.createdAt} />
            </span>
        </div>
        
        <p className={`text-sm ${styles.desc} mb-4 leading-relaxed`}>
            {alert.description}
        </p>

        {/* Action Buttons - Stop Propagation to prevent drawer open */}
        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            {alert.type === 'Pricing' && (
                <>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white border-0" onClick={() => onAction('resolve_pricing', alert)}>Resolve Conflict</Button>
                    <Button size="sm" variant="outline" className="bg-white border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => onAction('view_campaigns', alert)}>View Campaigns</Button>
                </>
            )}
             {alert.type === 'Stock' && (
                <>
                    <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white border-0" onClick={() => onAction('allocate_stock', alert)}>Allocate Stock</Button>
                    <Button size="sm" variant="outline" className="bg-white border-yellow-200 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800" onClick={() => onAction('pause_campaign', alert)}>Pause Campaign</Button>
                </>
            )}
             {alert.type === 'Campaign' && (
                <>
                    <Button size="sm" variant="outline" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800" onClick={() => onAction('view_report', alert)}>View Report</Button>
                </>
            )}
             {alert.type === 'System' && alert.status !== 'Resolved' && (
                 <Button size="sm" variant="ghost" onClick={() => onAction('dismiss', alert)}>Dismiss</Button>
             )}
        </div>
      </div>
      
      {/* Right side status badge if resolved */}
      {alert.status === 'Resolved' && (
          <div className="absolute top-4 right-4">
               <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
                   <CheckCircle2 size={12} /> Resolved
               </Badge>
          </div>
      )}
    </div>
  );
}
