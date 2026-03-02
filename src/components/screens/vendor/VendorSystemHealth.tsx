import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wifi,
  RefreshCw,
  Search,
  Download,
  Settings,
  Eye,
  Zap,
  Globe,
  Shield,
  Smartphone,
  Signal,
} from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { EmptyState } from '../../ui/ux-components';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { exportToCSV } from '../../../utils/csvExport';
import { toast } from 'sonner';
import {
  getSystemHealthSummary,
  listDeviceHealth,
  runDiagnostics,
  SystemHealthSummary,
  DeviceHealth,
  DiagnosticsReport,
} from '../rider/systemHealthApi';

let _lastDiagnosticsReport: DiagnosticsReport | null = null;

function loadStoredDiagnostics(): DiagnosticsReport | null {
  return _lastDiagnosticsReport;
}

function saveStoredDiagnostics(report: DiagnosticsReport | null) {
  _lastDiagnosticsReport = report;
}

const defaultServiceConfig = { checkInterval: 30, responseTimeThreshold: 100, uptimeThreshold: 99 };

const loadServiceConfigFromStorage = () => defaultServiceConfig;

const saveServiceConfigToStorage = (_config: { checkInterval: number; responseTimeThreshold: number; uptimeThreshold: number }) => {};

export function VendorSystemHealth() {
  const [summary, setSummary] = useState<SystemHealthSummary | null>(null);
  const [devices, setDevices] = useState<DeviceHealth[]>([]);
  const [diagnosticsReport, setDiagnosticsReport] = useState<DiagnosticsReport | null>(() => loadStoredDiagnostics());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [selectedView, setSelectedView] = useState<'overview' | 'devices' | 'logs' | 'alerts'>('overview');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceConfig, setServiceConfig] = useState(loadServiceConfigFromStorage);

  const [showConfigureServicesModal, setShowConfigureServicesModal] = useState(false);
  const [showDeviceDetailsModal, setShowDeviceDetailsModal] = useState(false);
  const [showFindingDetailsModal, setShowFindingDetailsModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceHealth | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<DiagnosticsReport['findings'][0] | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryData, devicesData] = await Promise.all([
        getSystemHealthSummary(),
        listDeviceHealth({ limit: 100 }),
      ]);
      const summaryOk = summaryData && typeof summaryData.activeDevices === 'number';
      setSummary(
        summaryOk
          ? summaryData
          : {
              systemUptime: 0,
              activeDevices: 0,
              totalDevices: 0,
              connectivityIssues: 0,
              lastUpdated: new Date().toISOString(),
            }
      );
      setDevices(Array.isArray(devicesData) ? devicesData : []);
      setLastUpdated(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load system health';
      setError(msg);
      setSummary({
        systemUptime: 0,
        activeDevices: 0,
        totalDevices: 0,
        connectivityIssues: 0,
        lastUpdated: new Date().toISOString(),
      });
      setDevices([]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, loadData]);

  const handleRunDiagnostics = async () => {
    if (runningDiagnostics) return;
    setRunningDiagnostics(true);
    setDiagnosticsReport(null);
    try {
      const report = await runDiagnostics({ scope: 'full' });
      setDiagnosticsReport(report);
      saveStoredDiagnostics(report);
      toast.success('Diagnostics completed', {
        description: `Passed: ${report.summary?.passed ?? 0}, Failed: ${report.summary?.failed ?? 0}, Warnings: ${report.summary?.warnings ?? 0}`,
      });
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Diagnostics failed');
      await loadData();
    } finally {
      setRunningDiagnostics(false);
    }
  };

  const getDeviceStatusColor = (status: string) => {
    switch (status) {
      case 'Healthy':
        return { bg: 'bg-[#DCFCE7]', text: 'text-[#166534]', icon: CheckCircle2 };
      case 'Attention':
        return { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', icon: AlertTriangle };
      case 'Critical':
        return { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]', icon: XCircle };
      case 'Offline':
        return { bg: 'bg-[#F3F4F6]', text: 'text-[#374151]', icon: XCircle };
      default:
        return { bg: 'bg-[#E5E7EB]', text: 'text-[#374151]', icon: Activity };
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
      case 'critical':
        return { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' };
      case 'medium':
        return { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' };
      case 'low':
        return { bg: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]' };
      default:
        return { bg: 'bg-[#E5E7EB]', text: 'text-[#374151]' };
    }
  };

  const filteredDevices = devices.filter((d) => {
    const matchesStatus = deviceFilter === 'all' || d.status === deviceFilter;
    const matchesSearch =
      searchTerm === '' ||
      d.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.riderName ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const findings = diagnosticsReport?.findings ?? [];

  const handleExportReport = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      const csvData: (string | number)[][] = [
        ['System Health Report', `Date: ${today}`, `Time: ${timestamp}`],
        [''],
        ['=== SUMMARY ==='],
        ['System Uptime', `${summary?.systemUptime ?? 0}%`],
        ['Active Devices', summary?.activeDevices ?? 0],
        ['Total Devices', summary?.totalDevices ?? 0],
        ['Connectivity Issues', summary?.connectivityIssues ?? 0],
        [''],
        ['=== DEVICES ==='],
        ['Device ID', 'Rider', 'Status', 'Battery', 'Signal', 'App Version', 'Last Sync'],
        ...devices.map((d) => [
          d.deviceId,
          d.riderName ?? '-',
          d.status,
          `${d.batteryLevel}%`,
          d.signalStrength,
          d.appVersion,
          new Date(d.lastSync).toLocaleString(),
        ]),
        [''],
        ['=== DIAGNOSTICS FINDINGS ==='],
        ['Type', 'Severity', 'Message', 'Device ID', 'Recommendation'],
        ...findings.map((f) => [f.type, f.severity, f.message, f.deviceId ?? '-', f.recommendation ?? '-']),
      ];
      exportToCSV(csvData, `system-health-report-${today}-${timestamp.replace(/:/g, '-')}`);
      toast.success('Report exported successfully');
    } catch (err) {
      toast.error('Failed to export report');
    }
  };

  const handleSaveServiceConfig = () => {
    saveServiceConfigToStorage(serviceConfig);
    toast.success('Configuration saved');
    setShowConfigureServicesModal(false);
  };

  const activeFindingsCount = findings.filter((f) => f.type === 'error' || f.type === 'warning').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Monitoring"
        subtitle="Real-time health and device status monitoring"
        actions={
          <>
            {lastUpdated && (
              <div className="text-xs text-[#757575] flex items-center gap-2">
                <RefreshCw size={14} />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            <button
              onClick={() => {
                setAutoRefresh(!autoRefresh);
                if (!autoRefresh) loadData();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                autoRefresh ? 'bg-[#4F46E5] text-white' : 'bg-white text-[#616161] border border-[#E0E0E0]'
              }`}
            >
              <RefreshCw size={16} className={autoRefresh ? 'animate-spin' : ''} />
              Auto Refresh
            </button>
            <button
              onClick={handleRunDiagnostics}
              disabled={runningDiagnostics}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#16A34A] text-white hover:bg-[#15803D] disabled:opacity-60 flex items-center gap-2"
            >
              <Activity size={16} className={runningDiagnostics ? 'animate-pulse' : ''} />
              {runningDiagnostics ? 'Running...' : 'Run Diagnostics'}
            </button>
            <button
              onClick={handleExportReport}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-[#616161] border border-[#E0E0E0] hover:bg-[#F5F7FA] transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Export Report
            </button>
          </>
        }
      />

      {error && (
        <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-[#991B1B] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-[#991B1B] mb-1">Error loading system health</h3>
            <p className="text-sm text-[#991B1B]">{error}</p>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-[#991B1B] text-white rounded-lg text-xs font-medium hover:bg-[#7F1D1D]"
          >
            Retry
          </button>
        </div>
      )}

      {activeFindingsCount > 0 && selectedView !== 'alerts' && (
        <div className="bg-[#FEF3C7] border border-[#FDE047] rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-[#92400E] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-[#92400E] mb-1">{activeFindingsCount} diagnostics finding(s)</h3>
            <p className="text-sm text-[#92400E]">{findings[0]?.message}</p>
          </div>
          <button
            onClick={() => setSelectedView('alerts')}
            className="px-3 py-1.5 bg-[#92400E] text-white rounded-lg text-xs font-medium hover:bg-[#78350F]"
          >
            View All
          </button>
        </div>
      )}

      <div className="flex gap-2 border-b border-[#E0E0E0]">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'devices', label: 'Devices', icon: Server },
          { id: 'logs', label: 'Error Logs', icon: AlertTriangle },
          { id: 'alerts', label: 'Diagnostics', icon: Zap },
        ].map((view) => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              onClick={() => setSelectedView(view.id as typeof selectedView)}
              className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                selectedView === view.id
                  ? 'border-[#4F46E5] text-[#4F46E5]'
                  : 'border-transparent text-[#757575] hover:text-[#212121]'
              }`}
            >
              <Icon size={16} />
              {view.label}
              {view.id === 'alerts' && activeFindingsCount > 0 && (
                <span className="px-1.5 py-0.5 bg-[#FEE2E2] text-[#991B1B] rounded text-xs font-bold">
                  {activeFindingsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {selectedView === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-[#DCFCE7] text-[#166534] rounded-lg">
                  <Activity size={20} />
                </div>
              </div>
              <p className="text-xs text-[#757575] font-medium mb-1">System Uptime</p>
              <h3 className="text-2xl font-bold text-[#212121]">
                {loading ? '...' : `${(summary?.systemUptime ?? 0).toFixed(2)}%`}
              </h3>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-[#DBEAFE] text-[#1E40AF] rounded-lg">
                  <Smartphone size={20} />
                </div>
              </div>
              <p className="text-xs text-[#757575] font-medium mb-1">Active / Total Devices</p>
              <h3 className="text-2xl font-bold text-[#212121]">
                {loading ? '...' : `${summary?.activeDevices ?? 0} / ${summary?.totalDevices ?? 0}`}
              </h3>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-[#FEF3C7] text-[#92400E] rounded-lg">
                  <AlertTriangle size={20} />
                </div>
              </div>
              <p className="text-xs text-[#757575] font-medium mb-1">Connectivity Issues</p>
              <h3 className="text-2xl font-bold text-[#212121]">{loading ? '...' : summary?.connectivityIssues ?? 0}</h3>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-[#F3E8FF] text-[#7C3AED] rounded-lg">
                  <Wifi size={20} />
                </div>
                <span className="text-xs text-[#22C55E] font-medium">Live</span>
              </div>
              <p className="text-xs text-[#757575] font-medium mb-1">Devices Monitored</p>
              <h3 className="text-2xl font-bold text-[#212121]">{loading ? '...' : devices.length}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm">
            <h3 className="font-bold text-[#212121] mb-2">Performance and resource metrics</h3>
            <p className="text-sm text-[#757575]">
              CPU, memory, latency, and request-volume time-series data are not provided by the system health API. Run diagnostics to see device-level findings.
            </p>
          </div>
        </>
      )}

      {/* Devices Tab */}
      {selectedView === 'devices' && (
        <>
          <div className="flex justify-between items-center gap-4">
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'all', label: 'All', count: devices.length },
                { value: 'Healthy', label: 'Healthy', count: devices.filter((d) => d.status === 'Healthy').length },
                { value: 'Attention', label: 'Attention', count: devices.filter((d) => d.status === 'Attention').length },
                { value: 'Critical', label: 'Critical', count: devices.filter((d) => d.status === 'Critical').length },
                { value: 'Offline', label: 'Offline', count: devices.filter((d) => d.status === 'Offline').length },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setDeviceFilter(f.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    deviceFilter === f.value
                      ? 'bg-[#4F46E5] text-white'
                      : 'bg-white text-[#616161] border border-[#E0E0E0] hover:bg-[#F5F7FA]'
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setServiceConfig(loadServiceConfigFromStorage());
                setShowConfigureServicesModal(true);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-[#616161] border border-[#E0E0E0] hover:bg-[#F5F7FA] flex items-center gap-2"
            >
              <Settings size={16} />
              Configure
            </button>
          </div>

          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#757575]" />
            <input
              type="text"
              placeholder="Search by device ID or rider..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
            />
          </div>

          <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
                  <tr>
                    <th className="px-6 py-3 text-left">Device</th>
                    <th className="px-6 py-3 text-left">Rider</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Battery</th>
                    <th className="px-6 py-3 text-left">Signal</th>
                    <th className="px-6 py-3 text-left">Last Sync</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0E0E0]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-[#757575]">
                        Loading devices...
                      </td>
                    </tr>
                  ) : filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12">
                        <EmptyState
                          icon={Smartphone}
                          title="No devices"
                          description={devices.length === 0 ? 'No device health data available.' : 'No devices match your filters.'}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredDevices.map((device) => {
                      const statusConfig = getDeviceStatusColor(device.status);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <tr key={device.deviceId} className="hover:bg-[#FAFAFA]">
                          <td className="px-6 py-4 font-mono text-[#616161]">{device.deviceId}</td>
                          <td className="px-6 py-4 font-medium text-[#212121]">{device.riderName ?? '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                              <StatusIcon size={12} />
                              {device.status}
                            </span>
                          </td>
                          <td
                            className={`px-6 py-4 font-bold ${
                              device.batteryLevel < 20 ? 'text-[#991B1B]' : device.batteryLevel < 50 ? 'text-[#92400E]' : 'text-[#166534]'
                            }`}
                          >
                            {device.batteryLevel}%
                          </td>
                          <td className="px-6 py-4 text-[#616161]">{device.signalStrength}</td>
                          <td className="px-6 py-4 text-[#616161]">{new Date(device.lastSync).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedDevice(device);
                                setShowDeviceDetailsModal(true);
                              }}
                              className="text-[#4F46E5] hover:underline text-xs font-medium"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Logs Tab - No backend data */}
      {selectedView === 'logs' && (
        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm p-12">
          <EmptyState
            icon={AlertTriangle}
            title="No error logs"
            description="Error logs are not provided by the system health API. Run diagnostics to see device-level findings."
          />
        </div>
      )}

      {/* Alerts Tab = Diagnostics Findings */}
      {selectedView === 'alerts' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#DCFCE7] text-[#166534] rounded-lg">
                  <CheckCircle2 size={20} />
                </div>
                <span className="text-xs text-[#757575]">Passed</span>
              </div>
              <h3 className="text-3xl font-bold text-[#212121]">{diagnosticsReport?.summary?.passed ?? 0}</h3>
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#FEE2E2] text-[#991B1B] rounded-lg">
                  <XCircle size={20} />
                </div>
                <span className="text-xs text-[#757575]">Failed</span>
              </div>
              <h3 className="text-3xl font-bold text-[#212121]">{diagnosticsReport?.summary?.failed ?? 0}</h3>
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#FEF3C7] text-[#92400E] rounded-lg">
                  <AlertTriangle size={20} />
                </div>
                <span className="text-xs text-[#757575]">Warnings</span>
              </div>
              <h3 className="text-3xl font-bold text-[#212121]">{diagnosticsReport?.summary?.warnings ?? 0}</h3>
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E0E7FF] text-[#4F46E5] rounded-lg">
                  <Shield size={20} />
                </div>
                <span className="text-xs text-[#757575]">Total</span>
              </div>
              <h3 className="text-3xl font-bold text-[#212121]">{diagnosticsReport?.summary?.totalChecks ?? 0}</h3>
            </div>
          </div>

          {!diagnosticsReport ? (
            <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm p-12">
              <EmptyState
                icon={Zap}
                title="No diagnostics report"
                description="Run diagnostics to generate a report with findings."
                action={
                  <button
                    onClick={handleRunDiagnostics}
                    disabled={runningDiagnostics}
                    className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA] disabled:opacity-60"
                  >
                    {runningDiagnostics ? 'Running...' : 'Run Diagnostics'}
                  </button>
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {findings.length === 0 ? (
                <div className="bg-white border border-[#E0E0E0] rounded-xl p-8">
                  <p className="text-center text-[#757575]">No findings in the latest diagnostics report.</p>
                </div>
              ) : (
                findings.map((f, i) => {
                  const severityConfig = getSeverityColor(f.severity);
                  return (
                    <div
                      key={i}
                      className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${severityConfig.bg} ${severityConfig.text}`}
                            >
                              {f.severity}
                            </span>
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs ${
                                f.type === 'error' ? 'bg-[#FEE2E2] text-[#991B1B]' : f.type === 'warning' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#DBEAFE] text-[#1E40AF]'
                              }`}
                            >
                              {f.type}
                            </span>
                            {f.deviceId && (
                              <span className="text-xs text-[#757575] font-mono">{f.deviceId}</span>
                            )}
                          </div>
                          <p className="font-medium text-[#212121] mb-1">{f.message}</p>
                          {f.recommendation && (
                            <p className="text-sm text-[#616161]">{f.recommendation}</p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedFinding(f);
                            setShowFindingDetailsModal(true);
                          }}
                          className="px-3 py-1.5 bg-white text-[#616161] border border-[#E0E0E0] rounded-lg text-xs font-medium hover:bg-[#F5F7FA]"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* Device Details Modal */}
      <Dialog open={showDeviceDetailsModal} onOpenChange={setShowDeviceDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Device Details</DialogTitle>
            <DialogDescription>Details for {selectedDevice?.deviceId}</DialogDescription>
          </DialogHeader>
          {selectedDevice && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[#757575] mb-1">Device ID</p>
                <p className="font-medium font-mono">{selectedDevice.deviceId}</p>
              </div>
              <div>
                <p className="text-sm text-[#757575] mb-1">Rider</p>
                <p className="font-medium">{selectedDevice.riderName ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm text-[#757575] mb-1">Status</p>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getDeviceStatusColor(selectedDevice.status).bg} ${getDeviceStatusColor(selectedDevice.status).text}`}
                >
                  {selectedDevice.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-[#757575] mb-1">Battery</p>
                <p className="font-medium">{selectedDevice.batteryLevel}%</p>
              </div>
              <div>
                <p className="text-sm text-[#757575] mb-1">Signal</p>
                <p className="font-medium">{selectedDevice.signalStrength}</p>
              </div>
              <div>
                <p className="text-sm text-[#757575] mb-1">App Version</p>
                <p className="font-medium">
                  {selectedDevice.appVersion}
                  {!selectedDevice.isLatestVersion && <span className="text-xs text-[#991B1B] ml-1">(outdated)</span>}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#757575] mb-1">Last Sync</p>
                <p className="font-medium">{new Date(selectedDevice.lastSync).toLocaleString()}</p>
              </div>
              {selectedDevice.issues?.length ? (
                <div className="col-span-2">
                  <p className="text-sm text-[#757575] mb-1">Issues</p>
                  <ul className="list-disc list-inside text-sm text-[#616161]">{selectedDevice.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}</ul>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Configure Services Modal */}
      <Dialog open={showConfigureServicesModal} onOpenChange={setShowConfigureServicesModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Monitoring</DialogTitle>
            <DialogDescription>Local settings (not persisted to backend).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#212121] mb-2">Check Interval (seconds)</label>
              <input
                type="number"
                value={serviceConfig.checkInterval}
                onChange={(e) =>
                  setServiceConfig((prev) => ({ ...prev, checkInterval: parseInt(e.target.value, 10) || 30 }))
                }
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#212121] mb-2">Response Time Threshold (ms)</label>
              <input
                type="number"
                value={serviceConfig.responseTimeThreshold}
                onChange={(e) =>
                  setServiceConfig((prev) => ({
                    ...prev,
                    responseTimeThreshold: parseInt(e.target.value, 10) || 100,
                  }))
                }
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#212121] mb-2">Uptime Alert Threshold (%)</label>
              <input
                type="number"
                value={serviceConfig.uptimeThreshold}
                onChange={(e) =>
                  setServiceConfig((prev) => ({
                    ...prev,
                    uptimeThreshold: parseInt(e.target.value, 10) || 99,
                  }))
                }
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => {
                  setServiceConfig(loadServiceConfigFromStorage());
                  setShowConfigureServicesModal(false);
                }}
                className="px-4 py-2 bg-white text-[#616161] border border-[#E0E0E0] rounded-lg hover:bg-[#F5F7FA]"
              >
                Cancel
              </button>
              <button onClick={handleSaveServiceConfig} className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA]">
                Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Finding Details Modal */}
      <Dialog open={showFindingDetailsModal} onOpenChange={setShowFindingDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Finding Details</DialogTitle>
            <DialogDescription>Diagnostics finding</DialogDescription>
          </DialogHeader>
          {selectedFinding && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[#757575] mb-1">Severity</p>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getSeverityColor(selectedFinding.severity).bg} ${getSeverityColor(selectedFinding.severity).text}`}
                >
                  {selectedFinding.severity}
                </span>
              </div>
              <div>
                <p className="text-sm text-[#757575] mb-1">Message</p>
                <p className="font-medium text-[#212121]">{selectedFinding.message}</p>
              </div>
              {selectedFinding.deviceId && (
                <div>
                  <p className="text-sm text-[#757575] mb-1">Device ID</p>
                  <p className="font-mono text-[#212121]">{selectedFinding.deviceId}</p>
                </div>
              )}
              {selectedFinding.recommendation && (
                <div>
                  <p className="text-sm text-[#757575] mb-1">Recommendation</p>
                  <p className="font-medium text-[#212121] bg-[#F5F7FA] p-3 rounded-lg">{selectedFinding.recommendation}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
