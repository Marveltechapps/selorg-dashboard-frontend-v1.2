import React from 'react';
import { Bike, Package, Clock, AlertCircle } from 'lucide-react';
import { DashboardSummary } from './types';
import { Skeleton } from '../../../../components/ui/skeleton';

interface SummaryCardsProps {
  data: DashboardSummary | null;
  loading: boolean;
}

function MetricCard({ 
  label, 
  value, 
  subValue, 
  trend, 
  trendUp, 
  icon, 
  color = "orange", 
  loading 
}: { 
  label: string; 
  value: string; 
  subValue?: string; 
  trend?: string; 
  trendUp?: boolean; 
  icon: React.ReactNode; 
  color?: string;
  loading: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-[120px] w-full rounded-xl" />;
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[#757575] font-medium text-xs uppercase tracking-wider">{label}</span>
        {icon && <div className={`text-${color}-500 p-1.5 bg-${color}-50 rounded-lg`}>{icon}</div>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-[#212121]">{value}</span>
        {subValue && <span className="text-sm text-[#757575] mb-1">{subValue}</span>}
      </div>
      {trend && (
        <div className={`text-xs font-medium mt-2 flex items-center gap-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          <span>{trendUp ? '↑' : '↓'}</span>
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

export function SummaryCards({ data, loading }: SummaryCardsProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard 
        label="Active Riders" 
        value={data?.activeRiders.toString() || "0"} 
        subValue={`/ ${data?.maxRiders || 0}`}
        trend={`${data?.activeRiderUtilizationPercent || 0}% Utilization`}
        trendUp={true}
        icon={<Bike size={18} />}
        color="orange"
        loading={loading}
      />
      <MetricCard 
        label="Orders In Transit" 
        value={data?.ordersInTransit.toString() || "0"} 
        trend={`+${data?.ordersInTransitChangePercent || 0}% vs last hour`}
        trendUp={true}
        icon={<Package size={18} />}
        color="blue"
        loading={loading}
      />
      <MetricCard 
        label="Avg Delivery Time" 
        value={loading ? "0m" : formatTime(data?.avgDeliveryTimeSeconds || 0).split(' ')[0]} 
        subValue={loading ? "" : formatTime(data?.avgDeliveryTimeSeconds || 0).split(' ')[1]}
        trend={data?.avgDeliveryTimeWithinSla ? "Within SLA" : "Above SLA"}
        trendUp={data?.avgDeliveryTimeWithinSla}
        icon={<Clock size={18} />}
        color="green"
        loading={loading}
      />
      <MetricCard 
        label="SLA Breaches" 
        value={data?.slaBreaches.toString() || "0"} 
        trend={data?.slaBreaches && data.slaBreaches > 0 ? "Needs Attention" : "All Good"}
        trendUp={!(data?.slaBreaches && data.slaBreaches > 0)}
        icon={<AlertCircle size={18} />}
        color="red"
        loading={loading}
      />
    </div>
  );
}
