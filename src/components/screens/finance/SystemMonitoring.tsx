import React, { useEffect, useState } from 'react';
import { Activity, Server, Signal } from 'lucide-react';
import { Skeleton } from '../../ui/skeleton';
import { fetchGatewayStatus } from './monitoringApi';

export function SystemMonitoring() {
  const [gateways, setGateways] = useState<Awaited<ReturnType<typeof fetchGatewayStatus>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchGatewayStatus();
        if (!cancelled) setGateways(data ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load gateway status');
          setGateways([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#166534]">
            Operational
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            Degraded
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Offline
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">System & Gateway Monitoring</h1>
          <p className="text-[#757575] text-sm">Real-time status of payment gateways and banking APIs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                  <Activity size={24} />
              </div>
              <div>
                  <p className="text-[#757575] text-sm font-medium">API Uptime</p>
                  <h3 className="text-2xl font-bold text-[#212121]">—</h3>
              </div>
          </div>
           <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                  <Server size={24} />
              </div>
              <div>
                  <p className="text-[#757575] text-sm font-medium">Active Webhooks</p>
                  <h3 className="text-2xl font-bold text-[#212121]">—</h3>
              </div>
          </div>
           <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-700 rounded-lg">
                  <Signal size={24} />
              </div>
              <div>
                  <p className="text-[#757575] text-sm font-medium">Failed Retries</p>
                  <h3 className="text-2xl font-bold text-[#212121]">—</h3>
              </div>
          </div>
      </div>

      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA]">
            <h3 className="font-bold text-[#212121]">Gateway Status</h3>
        </div>
        {error && (
          <div className="p-4 bg-red-50 text-red-700 border-b border-red-200">
            {error}
          </div>
        )}
        {loading ? (
          <div className="p-6">
            <Skeleton className="w-full h-[200px] rounded-lg" />
          </div>
        ) : (
        <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3">Gateway</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Response Time</th>
                <th className="px-6 py-3">Uptime</th>
                <th className="px-6 py-3 text-right">Last Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {gateways.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#757575]">
                    No gateway data available
                  </td>
                </tr>
              ) : (
                gateways.map((gw) => (
                  <tr key={gw.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-6 py-4 font-bold text-[#212121]">{gw.name}</td>
                    <td className="px-6 py-4">{statusBadge(gw.status)}</td>
                    <td className="px-6 py-4 text-[#616161]">{gw.responseTime}ms</td>
                    <td className="px-6 py-4 text-[#616161]">{gw.uptime}%</td>
                    <td className="px-6 py-4 text-right text-[#616161]">{gw.lastCheck}</td>
                  </tr>
                ))
              )}
            </tbody>
        </table>
        )}
      </div>
    </div>
  );
}
