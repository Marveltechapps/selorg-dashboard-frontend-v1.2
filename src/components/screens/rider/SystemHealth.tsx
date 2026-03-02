import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import { Activity, Smartphone, Signal, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getSystemHealthSummary,
  listDeviceHealth,
  runDiagnostics,
  SystemHealthSummary,
  DeviceHealth,
  DiagnosticsReport,
} from './systemHealthApi';

let _lastDiagnosticsReport: DiagnosticsReport | null = null;

function loadStoredDiagnostics(): DiagnosticsReport | null {
  return _lastDiagnosticsReport;
}

function saveStoredDiagnostics(report: DiagnosticsReport | null) {
  _lastDiagnosticsReport = report;
}

export function SystemHealth() {
  const [summary, setSummary] = useState<SystemHealthSummary | null>(null);
  const [devices, setDevices] = useState<DeviceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [lastDiagnosticsReport, setLastDiagnosticsReport] = useState<DiagnosticsReport | null>(() => loadStoredDiagnostics());

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryData, devicesData] = await Promise.all([
        getSystemHealthSummary(),
        listDeviceHealth({ limit: 100 }),
      ]);
      const summaryOk = summaryData && typeof summaryData.activeDevices === 'number';
      const devicesList = Array.isArray(devicesData) ? devicesData : [];
      setSummary(summaryOk ? summaryData : { systemUptime: 0, activeDevices: 0, totalDevices: 0, connectivityIssues: 0, lastUpdated: new Date().toISOString() });
      setDevices(devicesList);
    } catch (error) {
      setSummary({ systemUptime: 0, activeDevices: 0, totalDevices: 0, connectivityIssues: 0, lastUpdated: new Date().toISOString() });
      setDevices([]);
      toast.error('Failed to load system health');
    } finally {
      setLoading(false);
    }
  };

  const handleRunDiagnostics = async () => {
    if (runningDiagnostics) return;
    setRunningDiagnostics(true);
    setLastDiagnosticsReport(null);
    try {
      const report = await runDiagnostics({ scope: 'full' });
      setLastDiagnosticsReport(report);
      saveStoredDiagnostics(report);
      toast.success('Diagnostics completed', {
        description: `Passed: ${report.summary?.passed ?? 0}, Failed: ${report.summary?.failed ?? 0}, Warnings: ${report.summary?.warnings ?? 0}`,
      });
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Diagnostics failed');
      await loadData();
    } finally {
      setRunningDiagnostics(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const stored = loadStoredDiagnostics();
    if (stored) setLastDiagnosticsReport(stored);
  }, []);

  // Automatic polling disabled - use manual refresh button instead
  // Real-time polling for system health (every 30 seconds)
  // useEffect(() => {
  //   let interval: NodeJS.Timeout | null = null;
  //   
  //   const startPolling = () => {
  //     if (interval) clearInterval(interval);
  //     interval = setInterval(() => {
  //       if (!document.hidden) {
  //         loadData();
  //       }
  //     }, 30000); // Poll every 30 seconds for real-time monitoring
  //   };

  //   const handleVisibilityChange = () => {
  //     if (document.hidden) {
  //       if (interval) {
  //         clearInterval(interval);
  //         interval = null;
  //       }
  //     } else {
  //       startPolling();
  //       loadData();
  //     }
  //   };

  //   startPolling();
  //   document.addEventListener('visibilitychange', handleVisibilityChange);

  //   return () => {
  //     if (interval) clearInterval(interval);
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   };
  // }, []);

  const getStatusBadge = (status: string) => {
    const styles = {
      Healthy: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
      Attention: 'bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]',
      Critical: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
      Offline: 'bg-[#F3F4F6] text-[#1F2937] border-[#E5E7EB]',
    };
    return styles[status as keyof typeof styles] || styles.Healthy;
  };

  const getSignalBadge = (signal: string) => {
    const styles = {
      Strong: 'text-[#16A34A]',
      Moderate: 'text-yellow-600',
      Weak: 'text-orange-600',
      None: 'text-[#EF4444]',
    };
    return styles[signal as keyof typeof styles] || styles.Strong;
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="System Health"
        subtitle="Real-time platform monitoring and diagnostics"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await loadData();
                toast.success('Refreshed');
              }}
              disabled={loading}
              className="border-[#E0E0E0] text-[#212121]"
            >
              <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleRunDiagnostics}
              disabled={runningDiagnostics}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white"
            >
              <Activity size={16} className={`mr-2 ${runningDiagnostics ? "animate-pulse" : ""}`} />
              {runningDiagnostics ? 'Running...' : 'Run Full Diagnostics'}
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-700 rounded-lg">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[#757575] text-sm font-medium">System Uptime</p>
            <h3 className="text-2xl font-bold text-[#212121]">
              {loading ? '...' : `${summary?.systemUptime?.toFixed(2) || 0}%`}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
            <Smartphone size={24} />
          </div>
          <div>
            <p className="text-[#757575] text-sm font-medium">Active Devices</p>
            <h3 className="text-2xl font-bold text-[#212121]">
              {loading ? '...' : `${summary?.activeDevices || 0} / ${summary?.totalDevices || 0}`}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-700 rounded-lg">
            <Signal size={24} />
          </div>
          <div>
            <p className="text-[#757575] text-sm font-medium">Connectivity Issues</p>
            <h3 className="text-2xl font-bold text-[#212121]">
              {loading ? '...' : summary?.connectivityIssues || 0}
            </h3>
          </div>
        </div>
      </div>

      {/* Last Diagnostics Report - shown after Run Full Diagnostics */}
      {lastDiagnosticsReport && (
        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm p-6">
          <h3 className="font-bold text-[#212121] mb-4 flex items-center gap-2">
            <Activity size={20} />
            Latest Diagnostics Report
          </h3>
          {lastDiagnosticsReport.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                <p className="text-xs text-[#757575]">Passed</p>
                <p className="text-xl font-bold text-green-700">{lastDiagnosticsReport.summary.passed ?? 0}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-xs text-[#757575]">Failed</p>
                <p className="text-xl font-bold text-red-700">{lastDiagnosticsReport.summary.failed ?? 0}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs text-[#757575]">Warnings</p>
                <p className="text-xl font-bold text-amber-700">{lastDiagnosticsReport.summary.warnings ?? 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-[#757575]">Total Checks</p>
                <p className="text-xl font-bold text-[#212121]">{lastDiagnosticsReport.summary.totalChecks ?? 0}</p>
              </div>
            </div>
          )}
          {lastDiagnosticsReport.findings?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-[#757575] mb-2">Findings</p>
              <ul className="space-y-1 text-sm text-[#212121]">
                {lastDiagnosticsReport.findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                      f.type === 'error' ? 'bg-red-500' : f.type === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                    }`} />
                    {f.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Device Health Table */}
      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
          <h3 className="font-bold text-[#212121]">Device Health Logs</h3>
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3">Device ID</th>
                <th className="px-6 py-3">Rider</th>
                <th className="px-6 py-3">App Version</th>
                <th className="px-6 py-3">Battery</th>
                <th className="px-6 py-3">Signal</th>
                <th className="px-6 py-3">Last Sync</th>
                <th className="px-6 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-6 py-4">
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ))
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No devices
                  </td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr key={device.deviceId} className="hover:bg-[#FAFAFA]">
                    <td className="px-6 py-4 font-mono text-[#616161]">{device.deviceId}</td>
                    <td className="px-6 py-4 font-medium text-[#212121]">{device.riderName}</td>
                    <td className="px-6 py-4 text-[#616161]">
                      {device.appVersion}
                      {!device.isLatestVersion && (
                        <span className="text-xs text-red-500 ml-1">(Old)</span>
                      )}
                    </td>
                    <td
                      className={`px-6 py-4 font-bold ${
                        device.batteryLevel < 20
                          ? 'text-red-600'
                          : device.batteryLevel < 50
                          ? 'text-yellow-600'
                          : 'text-[#16A34A]'
                      }`}
                    >
                      {device.batteryLevel}%
                    </td>
                    <td className={`px-6 py-4 font-bold ${getSignalBadge(device.signalStrength)}`}>
                      {device.signalStrength}
                    </td>
                    <td className="px-6 py-4 text-[#616161]">
                      {new Date(device.lastSync).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(
                          device.status
                        )}`}
                      >
                        <div className={`w-1 h-1 rounded-full ${
                          device.status === 'Healthy' ? 'bg-[#166534]' :
                          device.status === 'Attention' ? 'bg-[#854D0E]' :
                          device.status === 'Critical' ? 'bg-[#991B1B]' :
                          'bg-[#1F2937]'
                        }`} />
                        {device.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
