import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { DarkstoreScreenShell } from '@/components/darkstore/DarkstoreScreenShell';
import { MetricCard } from '@/components/darkstore/MetricCard';
import { StoreRequiredGuard } from '@/components/darkstore/StoreRequiredGuard';
import { LoadingState } from '@/components/ui/ux-components';
import { getWorkflowSlaMetrics, type WorkflowSlaMetrics } from '@/api/darkstore/operations.api';
import {
  getSlaAdherence,
  getRiderPerformance,
  type SlaAdherencePoint,
  type RiderPerformancePoint,
} from '@/api/darkstore/analytics.api';

export function OpsAnalyticsScreen() {
  const { activeStoreId } = useAuth();
  const [workflow, setWorkflow] = useState<WorkflowSlaMetrics | null>(null);
  const [slaData, setSlaData] = useState<SlaAdherencePoint[]>([]);
  const [riderData, setRiderData] = useState<RiderPerformancePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>();

  const fetchAll = useCallback(async () => {
    if (!activeStoreId) return;
    setLoading(true);
    try {
      const [wf, sla, rider] = await Promise.all([
        getWorkflowSlaMetrics({ storeId: activeStoreId }),
        getSlaAdherence({ storeId: activeStoreId, dateRange: '7d' }),
        getRiderPerformance({ storeId: activeStoreId, dateRange: '7d' }),
      ]);
      setWorkflow(wf?.data ?? null);
      setSlaData(sla?.data ?? []);
      setRiderData(rider?.data ?? []);
      setLastSync(new Date());
    } catch {
      setWorkflow(null);
      setSlaData([]);
      setRiderData([]);
    } finally {
      setLoading(false);
    }
  }, [activeStoreId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const breachChart = (workflow?.breachRateByHour ?? []).map((r) => ({
    hour: `${r.hour}:00`,
    rate: r.rate,
    breaches: r.breaches,
  }));

  const slaChart = slaData.map((p) => ({
    date: new Date(p.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    onTime: p.onTimePercent,
    breaches: p.slaBreaches,
  }));

  const riderChart = riderData.map((p) => ({
    date: new Date(p.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    deliveries: p.deliveriesCompleted,
    riders: p.activeRiders,
  }));

  return (
    <StoreRequiredGuard title="Select a store for Ops Analytics">
      <DarkstoreScreenShell
        title="Ops Analytics"
        subtitle="Pick times, SLA adherence, and delivery performance"
        toolbar={{ onRefresh: fetchAll, refreshing: loading, lastSync, showConnection: true }}
      >
        {loading && !workflow ? (
          <LoadingState message="Loading analytics…" />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard label="Pick P50" value={`${workflow?.pickTimeP50Sec ?? 0}s`} icon={Clock} />
              <MetricCard label="Pick P95" value={`${workflow?.pickTimeP95Sec ?? 0}s`} icon={TrendingUp} />
              <MetricCard
                label="Avg Exception Resolution"
                value={`${workflow?.avgExceptionResolutionMin ?? 0} min`}
                icon={AlertTriangle}
                accent="warning"
              />
              <MetricCard label="Pick Samples Today" value={workflow?.sampleSize ?? 0} icon={BarChart3} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">SLA Breach Rate by Hour (Today)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={breachChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                    <YAxis tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip />
                    <Bar dataKey="rate" fill="var(--ds-primary, #6366f1)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">SLA Adherence (7 days)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={slaChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={[80, 100]} unit="%" />
                    <Tooltip />
                    <Line type="monotone" dataKey="onTime" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Rider Deliveries (7 days)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={riderChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="deliveries" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </DarkstoreScreenShell>
    </StoreRequiredGuard>
  );
}
