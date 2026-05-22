import React, { useEffect, useState } from 'react';
import {
  Clock,
  IndianRupee,
  MapPin,
  Package,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { computeClusterMetrics } from './groupDeliveryApi';
import type { Cluster, ClusterMetrics, SlaRiskLevel } from './groupDeliveryTypes';
import { cn } from '@/lib/utils';

const SLA_STYLES: Record<SlaRiskLevel, { bg: string; text: string; border: string }> = {
  high: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200' },
  low: { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-200' },
  ok: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
};

interface GroupDeliveryMetricsPanelProps {
  cluster: Cluster | null;
}

export function GroupDeliveryMetricsPanel({ cluster }: GroupDeliveryMetricsPanelProps) {
  const [metrics, setMetrics] = useState<ClusterMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cluster || cluster.orders.length === 0) {
      setMetrics(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    computeClusterMetrics(cluster.orders.map((o) => o.id))
      .then((data) => {
        if (!cancelled) setMetrics(data);
      })
      .catch(() => {
        if (!cancelled) setMetrics(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cluster?.id, cluster?.orders.length, cluster?.orders.map((o) => o.id).join(',')]);

  if (!cluster) {
    return (
      <div className="rounded-xl border border-dashed border-[#E0E0E0] bg-[#FAFAFA] p-4 text-sm text-[#757575]">
        Select a group to view route metrics (distance, ETA, earnings, SLA risk).
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[#E0E0E0] bg-white p-4 flex items-center gap-2 text-sm text-[#757575]">
        <Loader2 size={16} className="animate-spin text-[#F97316]" />
        Calculating group metrics…
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="rounded-xl border border-[#E0E0E0] bg-white p-4 text-sm text-[#757575]">
        Could not load metrics for this group.
      </div>
    );
  }

  const slaStyle = SLA_STYLES[metrics.slaRisk] || SLA_STYLES.ok;

  return (
    <div className="rounded-xl border border-[#E0E0E0] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="font-bold text-sm text-[#212121]">Group metrics</h4>
        <span
          className={cn(
            'text-[10px] font-bold uppercase px-2 py-1 rounded-full border flex items-center gap-1',
            slaStyle.bg,
            slaStyle.text,
            slaStyle.border
          )}
        >
          {metrics.slaRisk === 'ok' ? (
            <ShieldCheck size={12} />
          ) : (
            <AlertTriangle size={12} />
          )}
          SLA {metrics.slaRisk}
        </span>
      </div>

      <p className={cn('text-xs mb-3', slaStyle.text)}>{metrics.slaRiskLabel}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon={<Package size={16} className="text-[#F97316]" />}
          label="Orders"
          value={String(metrics.orderCount)}
        />
        <MetricCard
          icon={<MapPin size={16} className="text-blue-600" />}
          label="Route distance"
          value={`${metrics.totalDistanceKm.toFixed(1)} km`}
        />
        <MetricCard
          icon={<Clock size={16} className="text-violet-600" />}
          label="Est. delivery"
          value={`${metrics.estimatedDeliveryMinutes} min`}
        />
        <MetricCard
          icon={<IndianRupee size={16} className="text-emerald-600" />}
          label="Total earnings"
          value={`₹${metrics.totalEarnings.toFixed(0)}`}
        />
      </div>

      {metrics.ordersAtRisk > 0 && (
        <p className="text-[10px] text-amber-700 mt-2">
          {metrics.ordersAtRisk} order(s) may miss SLA at current route estimate.
        </p>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-[#F9FAFB] border border-[#F0F0F0] p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] text-[#757575] mb-1">{icon}{label}</div>
      <div className="font-bold text-sm text-[#212121]">{value}</div>
    </div>
  );
}
