import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  Wifi,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Settings,
  Eye,
  Download,
  RefreshCw,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Filter,
  GitBranch
} from 'lucide-react';
import { toast } from 'sonner';
import { exportToPDF } from '../../../utils/pdfExport';
import { exportToCSV } from '../../../utils/csvExport';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Types
type ServiceStatus = 'operational' | 'slow' | 'down';
type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

interface Service {
  id: string;
  name: string;
  type: string;
  status: ServiceStatus;
  lastSync: string;
  latency: number;
  requests: number;
  trend: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
}

import { systemGatewayApi, SystemService, SystemLog } from '../../../api/vendor/systemGateway.api';

// Mock Data (fallback)
const mockServices: Service[] = [
  {
    id: '1',
    name: 'Vendor Portal',
    type: 'Web Interface',
    status: 'operational',
    lastSync: 'Real-time',
    latency: 23,
    requests: 1234,
    trend: 12,
  },
  {
    id: '2',
    name: 'EDI Connection',
    type: 'Data Exchange',
    status: 'operational',
    lastSync: '5 mins ago',
    latency: 156,
    requests: 847,
    trend: 5,
  },
  {
    id: '3',
    name: 'Email Notifications',
    type: 'SMTP Service',
    status: 'slow',
    lastSync: '1 min ago',
    latency: 345,
    requests: 523,
    trend: -8,
  },
  {
    id: '4',
    name: 'Payment Gateway',
    type: 'Financial API',
    status: 'operational',
    lastSync: 'Real-time',
    latency: 78,
    requests: 456,
    trend: 3,
  },
  {
    id: '5',
    name: 'Inventory Sync',
    type: 'Data Sync',
    status: 'operational',
    lastSync: '2 mins ago',
    latency: 124,
    requests: 789,
    trend: 7,
  },
];

const mockLogs: LogEntry[] = [
  {
    id: '1',
    timestamp: '2025-12-19 10:48:53',
    level: 'INFO',
    service: 'Email Notifications',
    message: 'Email queue processed - 245 emails sent',
  },
  {
    id: '2',
    timestamp: '2025-12-19 10:48:42',
    level: 'INFO',
    service: 'Email Notifications',
    message: 'Connection established - SMTP server 192.168.1.100:587',
  },
  {
    id: '3',
    timestamp: '2025-12-19 10:48:30',
    level: 'WARNING',
    service: 'Email Notifications',
    message: 'Slow response - Response time 345ms (threshold: 300ms)',
  },
  {
    id: '4',
    timestamp: '2025-12-19 10:48:15',
    level: 'DEBUG',
    service: 'Email Notifications',
    message: 'Retry attempt - Attempt 1/3 for message ID: msg_12345',
  },
];

export function SystemGatewayMonitoring() {
  const [services, setServices] = useState<Service[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Load data from API
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingServices(true);
        const servicesResp = await systemGatewayApi.getServices();
        if (!mounted) return;
        if (servicesResp.success && servicesResp.data) {
          setServices(servicesResp.data.map(s => ({
            id: s.id,
            name: s.name,
            type: s.type,
            status: s.status,
            endpoint: s.endpoint,
            responseTime: s.responseTime,
            lastChecked: s.lastChecked,
            uptime: s.uptime,
          })));
        }
      } catch (err) {
        console.error('Failed to load services', err);
        toast.error('Failed to load services');
        setServices(mockServices);
      } finally {
        setLoadingServices(false);
      }

      try {
        setLoadingLogs(true);
        const today = new Date().toISOString().split('T')[0];
        const logsResp = await systemGatewayApi.getLogs({ 
          startDate: today,
          limit: 100 
        });
        if (!mounted) return;
        if (logsResp.success && logsResp.data) {
          setLogs(logsResp.data.map(l => ({
            id: l.id,
            service: l.serviceName,
            level: l.level,
            message: l.message,
            timestamp: l.timestamp,
            time: l.time || new Date(l.timestamp).toLocaleTimeString('en-US', { hour12: true }),
            date: l.date || new Date(l.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          })));
        }
      } catch (err) {
        console.error('Failed to load logs', err);
        toast.error('Failed to load logs');
        setLogs(mockLogs);
      } finally {
        setLoadingLogs(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [filterStatus, setFilterStatus] = useState<ServiceStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showServiceDetailsModal, setShowServiceDetailsModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Log filters
  const [logLevel, setLogLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [selectedLogService, setSelectedLogService] = useState('All Services');

  // Export functions
  const downloadIncidentReport = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const htmlContent = `
        <h1>Incident Report</h1>
        <h2>System Gateway Monitoring</h2>
        <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <tr><th style="text-align:left;">Field</th><th style="text-align:left;">Value</th></tr>
          <tr><td>Severity</td><td>High</td></tr>
          <tr><td>Service</td><td>Email Notifications</td></tr>
          <tr><td>Status</td><td>Resolved</td></tr>
          <tr><td>Description</td><td>Third-party email provider experiencing temporary outage</td></tr>
          <tr><td>Resolution</td><td>Implemented retry logic and failover to backup provider</td></tr>
        </table>
        <p style="margin-top:20px; font-size:12px; color:#666;">
          Generated on ${new Date().toLocaleString()}
        </p>
      `;
      exportToPDF(htmlContent, `incident-report-${today}`);
      toast.success('Incident report downloaded');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const exportLogs = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      const filteredLogs = logs.filter(log => {
        if (logLevel !== 'ALL' && log.level !== logLevel) return false;
        if (selectedLogService !== 'All Services' && log.service !== selectedLogService) return false;
        return true;
      });
      
      const csvData: (string | number)[][] = [
        ['System Gateway Logs', `Date: ${today}`, `Time: ${timestamp}`],
        [''],
        ['Timestamp', 'Level', 'Service', 'Message'],
        ...filteredLogs.map(log => [
          log.timestamp,
          log.level,
          log.service,
          log.message
        ]),
      ];
      exportToCSV(csvData, `gateway-logs-${today}-${timestamp.replace(/:/g, '-')}`);
      toast.success('Logs exported successfully');
    } catch (error) {
      toast.error('Failed to export logs');
    }
  };

  // Get status color
  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case 'operational':
        return { bg: '#10B981', text: '#FFFFFF', badge: '#DCFCE7', badgeText: '#166534', icon: '🟢' };
      case 'slow':
        return { bg: '#F59E0B', text: '#FFFFFF', badge: '#FEF3C7', badgeText: '#92400E', icon: '🟡' };
      case 'down':
        return { bg: '#EF4444', text: '#FFFFFF', badge: '#FEE2E2', badgeText: '#991B1B', icon: '🔴' };
      default:
        return { bg: '#6B7280', text: '#FFFFFF', badge: '#F3F4F6', badgeText: '#1F2937', icon: '⚪' };
    }
  };

  // Get log level color
  const getLogLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'DEBUG':
        return '#9CA3AF';
      case 'INFO':
        return '#3B82F6';
      case 'WARNING':
        return '#F59E0B';
      case 'ERROR':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  // Filter services
  const filteredServices = services.filter((service) => {
    const matchesStatus = filterStatus === 'all' || service.status === filterStatus;
    const matchesSearch =
      searchQuery === '' ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Overall system status
  const getOverallStatus = () => {
    const hasDown = services.some((s) => s.status === 'down');
    const hasSlow = services.some((s) => s.status === 'slow');
    if (hasDown) return { text: '🔴 Systems Down', color: '#EF4444' };
    if (hasSlow) return { text: '🟡 Degraded Performance', color: '#F59E0B' };
    return { text: '🟢 All Systems Operational', color: '#10B981' };
  };

  const systemStatus = getOverallStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start bg-white px-6 py-5 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-[32px] font-bold text-[#1F2937]">System & Gateway Monitoring</h1>
          <p className="text-sm text-[#6B7280] mt-1">Vendor portal uptime, API sync status, and integration health</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-4">
            <p className="text-sm font-bold" style={{ color: systemStatus.color }}>
              {systemStatus.text}
            </p>
            <p className="text-xs text-[#9CA3AF]">Last checked: 2 mins ago</p>
          </div>
          <button
            onClick={() => setShowLogsModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#D1D5DB] text-[#6B7280] font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
          >
            <FileText className="w-4 h-4" />
            View Logs
          </button>
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#D1D5DB] text-[#6B7280] font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
          >
            <Settings className="w-4 h-4" />
            Configuration
          </button>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-3 gap-4">
        {/* Portal Uptime */}
        <div className="bg-[#F0F9FF] border border-[#E5E7EB] rounded-lg p-6" style={{ borderLeft: '4px solid #0EA5E9' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#0EA5E9]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1F2937]">Portal Uptime</h3>
              <p className="text-xs text-[#6B7280]">Vendor portal availability</p>
            </div>
          </div>

          <div className="mb-2">
            <p className="text-2xl font-bold text-[#1F2937]">99.9%</p>
            <p className="text-xs font-bold text-[#10B981]">🟢 Operational</p>
          </div>

          <div className="text-xs text-[#6B7280] space-y-1">
            <div>Last downtime: Dec 15, 2:30 PM (5 mins)</div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#10B981]" />
              <span>Uptime trend improving</span>
            </div>
          </div>
        </div>

        {/* API Requests */}
        <div className="bg-[#F0F8FF] border border-[#E5E7EB] rounded-lg p-6" style={{ borderLeft: '4px solid #3B82F6' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DBEAFE] flex items-center justify-center">
              <Wifi className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1F2937]">API Requests</h3>
              <p className="text-xs text-[#6B7280]">Total API calls (today)</p>
            </div>
          </div>

          <div className="mb-2">
            <p className="text-2xl font-bold text-[#1F2937]">124k</p>
            <p className="text-xs font-bold text-[#10B981]">✓ Normal</p>
          </div>

          <div className="text-xs text-[#6B7280] space-y-1">
            <div>Success rate: 99.8%</div>
            <div>Requests/min: 86.4</div>
          </div>
        </div>

        {/* Sync Latency */}
        <div className="bg-[#F5F3FF] border border-[#E5E7EB] rounded-lg p-6" style={{ borderLeft: '4px solid #8B5CF6' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#EDE9FE] flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1F2937]">Sync Latency</h3>
              <p className="text-xs text-[#6B7280]">Average response time</p>
            </div>
          </div>

          <div className="mb-2">
            <p className="text-2xl font-bold text-[#1F2937]">45ms</p>
            <p className="text-xs font-bold text-[#10B981]">🟢 Good</p>
          </div>

          <div className="text-xs text-[#6B7280] space-y-1">
            <div>Target: &lt;100ms</div>
            <div>Peak: 67ms</div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3 bg-white p-4 border border-[#E5E7EB] rounded-lg">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
              filterStatus === 'all'
                ? 'bg-[#4F46E5] text-white'
                : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('operational')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
              filterStatus === 'operational'
                ? 'bg-[#10B981] text-white'
                : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
            }`}
          >
            Operational
          </button>
          <button
            onClick={() => setFilterStatus('slow')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
              filterStatus === 'slow'
                ? 'bg-[#F59E0B] text-white'
                : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
            }`}
          >
            Slow
          </button>
          <button
            onClick={() => setFilterStatus('down')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
              filterStatus === 'down'
                ? 'bg-[#EF4444] text-white'
                : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
            }`}
          >
            Down
          </button>
        </div>

        <button
          onClick={() => setShowDependencyModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#D1D5DB] text-[#6B7280] text-xs font-medium rounded-md hover:bg-[#F3F4F6]"
        >
          <GitBranch className="w-4 h-4" />
          Dependencies
        </button>
      </div>

      {/* Integration Status Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-base font-bold text-[#1F2937]">Integration Status</h2>
          <p className="text-xs text-[#6B7280]">Real-time service health and connectivity</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F9FAFB] text-[#6B7280] font-medium border-b border-[#E5E7EB]">
              <tr>
                <th className="px-6 py-3 text-xs font-bold uppercase" style={{ width: '25%' }}>Service</th>
                <th className="px-6 py-3 text-xs font-bold uppercase" style={{ width: '15%' }}>Type</th>
                <th className="px-6 py-3 text-xs font-bold uppercase" style={{ width: '12%' }}>Status</th>
                <th className="px-6 py-3 text-xs font-bold uppercase" style={{ width: '15%' }}>Last Sync</th>
                <th className="px-6 py-3 text-xs font-bold uppercase" style={{ width: '12%' }}>Latency</th>
                <th className="px-6 py-3 text-xs font-bold uppercase" style={{ width: '12%' }}>Requests</th>
                <th className="px-6 py-3 text-xs font-bold uppercase" style={{ width: '9%' }}>Logs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredServices.map((service) => {
                const colors = getStatusColor(service.status);
                return (
                  <tr
                    key={service.id}
                    className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedService(service);
                      setShowServiceDetailsModal(true);
                    }}
                  >
                    <td className="px-6 py-4 font-medium text-[#212121]">{service.name}</td>
                    <td className="px-6 py-4 text-[#616161]">{service.type}</td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {colors.icon}
                        {service.status === 'operational' && 'Operational'}
                        {service.status === 'slow' && 'Slow'}
                        {service.status === 'down' && 'Down'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#616161]">{service.lastSync}</td>
                    <td className="px-6 py-4">
                      <div>
                        <span
                          className={`font-bold ${
                            service.latency < 100 ? 'text-[#10B981]' : service.latency < 300 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                          }`}
                        >
                          {service.latency}ms
                        </span>
                        <p className="text-xs text-[#6B7280]">
                          {service.latency < 100 ? '✓ Good' : service.latency < 300 ? '⚠ Normal' : '✗ Slow'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-[#1F2937]">{service.requests.toLocaleString()}</span>
                        <div className="flex items-center gap-1 mt-1">
                          {service.trend > 0 ? (
                            <TrendingUp className="w-3 h-3 text-[#10B981]" />
                          ) : service.trend < 0 ? (
                            <TrendingDown className="w-3 h-3 text-[#EF4444]" />
                          ) : (
                            <Minus className="w-3 h-3 text-[#6B7280]" />
                          )}
                          <span
                            className={`text-xs ${
                              service.trend > 0 ? 'text-[#10B981]' : service.trend < 0 ? 'text-[#EF4444]' : 'text-[#6B7280]'
                            }`}
                          >
                            {service.trend > 0 ? '+' : ''}{service.trend}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLogService(service.name);
                          setShowLogsModal(true);
                        }}
                        className="text-xs font-medium text-[#4F46E5] hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredServices.length === 0 && (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-[#D1D5DB] mx-auto mb-4" />
            <p className="text-sm text-[#6B7280]">No services found matching your filters</p>
          </div>
        )}
      </div>

      {/* Recent Activity Timeline */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
        <h3 className="text-base font-bold text-[#1F2937] mb-4">Recent Activity</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3 text-[#6B7280]">
            <span className="text-xs font-mono">2:48 PM</span>
            <span>•</span>
            <span>Vendor Portal: 1.2k requests processed</span>
          </div>
          <div className="flex items-center gap-3 text-[#6B7280]">
            <span className="text-xs font-mono">2:47 PM</span>
            <span>•</span>
            <span>EDI Connection: Data sync completed (847 records)</span>
          </div>
          <div className="flex items-center gap-3 text-[#F59E0B]">
            <span className="text-xs font-mono">2:46 PM</span>
            <span>•</span>
            <span>Email Notifications: Warning - Response time 345ms (&gt;300ms threshold)</span>
          </div>
          <div className="flex items-center gap-3 text-[#6B7280]">
            <span className="text-xs font-mono">2:45 PM</span>
            <span>•</span>
            <span>Payment Gateway: API health check passed</span>
          </div>
        </div>
      </div>

      {/* Modal 1: Service Details */}
      <Dialog open={showServiceDetailsModal} onOpenChange={setShowServiceDetailsModal}>
        <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="service-details-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              {selectedService?.name}
            </DialogTitle>
            <DialogDescription id="service-details-description" className="text-sm text-[#6B7280]">
              Service ID: SVC-{selectedService?.id?.toUpperCase()}-001
            </DialogDescription>
          </DialogHeader>

          {selectedService && (
            <div className="px-6 py-6 space-y-6">
              {/* Overview */}
              <div className="grid grid-cols-2 gap-4 bg-[#F9FAFB] p-4 rounded-lg">
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Service Type</p>
                  <p className="text-sm font-medium text-[#1F2937]">{selectedService.type}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Status</p>
                  <span
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: getStatusColor(selectedService.status).bg,
                      color: getStatusColor(selectedService.status).text,
                    }}
                  >
                    {getStatusColor(selectedService.status).icon}
                    {selectedService.status === 'operational' && 'Operational'}
                    {selectedService.status === 'slow' && 'Slow'}
                    {selectedService.status === 'down' && 'Down'}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Last Sync</p>
                  <p className="text-sm font-medium text-[#1F2937]">{selectedService.lastSync}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Uptime (24h)</p>
                  <p className="text-sm font-bold text-[#10B981]">99.95%</p>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h3 className="text-sm font-bold text-[#1F2937] mb-3">Performance Metrics</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#6B7280]">Response Time</span>
                      <span className="font-bold text-[#1F2937]">{selectedService.latency}ms</span>
                    </div>
                    <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((selectedService.latency / 500) * 100, 100)}%`,
                          backgroundColor: selectedService.latency < 100 ? '#10B981' : selectedService.latency < 300 ? '#F59E0B' : '#EF4444',
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 bg-[#F9FAFB] p-3 rounded-lg text-xs">
                    <div>
                      <p className="text-[#6B7280]">P50 Latency</p>
                      <p className="font-bold text-[#1F2937]">{selectedService.latency - 10}ms</p>
                    </div>
                    <div>
                      <p className="text-[#6B7280]">P95 Latency</p>
                      <p className="font-bold text-[#1F2937]">{selectedService.latency + 50}ms</p>
                    </div>
                    <div>
                      <p className="text-[#6B7280]">P99 Latency</p>
                      <p className="font-bold text-[#1F2937]">{selectedService.latency + 100}ms</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Incidents & Alerts */}
              <div>
                <h3 className="text-sm font-bold text-[#1F2937] mb-3">Recent Incidents</h3>
                <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                  <div className="divide-y divide-[#E5E7EB]">
                    <div className="p-3 hover:bg-[#F9FAFB] cursor-pointer" onClick={() => setShowIncidentModal(true)}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-[#1F2937]">Slow Response Time</p>
                        <span className="text-xs text-[#10B981]">Resolved</span>
                      </div>
                      <p className="text-xs text-[#6B7280]">Dec 18, 3:45 PM - 3:55 PM (10 mins)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => {
                setSelectedLogService(selectedService?.name || 'All Services');
                setShowLogsModal(true);
              }}
              className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              View Logs
            </button>
            <button
              onClick={() => setShowServiceDetailsModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Incident Details */}
      <Dialog open={showIncidentModal} onOpenChange={setShowIncidentModal}>
        <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="incident-details-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">Incident Details</DialogTitle>
            <DialogDescription id="incident-details-description" className="text-sm text-[#6B7280]">INC-2024-0847</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Summary */}
            <div className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] p-4 rounded-lg">
              <h3 className="text-sm font-bold text-[#92400E] mb-2">🟡 High Severity Incident</h3>
              <p className="text-sm text-[#713F12]">Email notifications delayed by average 5 minutes</p>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 bg-[#F9FAFB] p-4 rounded-lg text-sm">
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Service</p>
                <p className="font-medium text-[#1F2937]">Email Notifications</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Status</p>
                <span className="text-[#10B981] font-bold">Resolved</span>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Start Time</p>
                <p className="text-[#1F2937]">Dec 18, 3:45 PM</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">End Time</p>
                <p className="text-[#1F2937]">Dec 18, 3:55 PM</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Duration</p>
                <p className="font-bold text-[#1F2937]">10 minutes</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Impact</p>
                <p className="text-[#EF4444]">1,247 notifications delayed</p>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Incident Timeline</h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                    </div>
                    <div className="w-0.5 h-full bg-[#E5E7EB]" />
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-bold text-[#1F2937]">Detection</p>
                    <p className="text-xs text-[#6B7280]">Dec 18, 3:45 PM</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">Automated monitoring detected slow response times</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#FEF3C7] flex items-center justify-center">
                      <Clock className="w-4 h-4 text-[#F59E0B]" />
                    </div>
                    <div className="w-0.5 h-full bg-[#E5E7EB]" />
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-bold text-[#1F2937]">Investigation</p>
                    <p className="text-xs text-[#6B7280]">Dec 18, 3:47 PM</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">Team identified third-party SMTP provider issues</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-[#10B981]" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#1F2937]">Resolution</p>
                    <p className="text-xs text-[#6B7280]">Dec 18, 3:55 PM</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">Service restored, queue processed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Root Cause */}
            <div className="bg-[#EEF2FF] p-4 rounded-lg">
              <h3 className="text-sm font-bold text-[#1E40AF] mb-2">Root Cause Analysis</h3>
              <p className="text-sm text-[#1E3A8A]">Third-party email provider experiencing temporary outage. Implemented retry logic and failover to backup provider.</p>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={downloadIncidentReport}
              className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
            <button
              onClick={() => setShowIncidentModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Logs Viewer */}
      <Dialog open={showLogsModal} onOpenChange={setShowLogsModal}>
        <DialogContent className="max-w-[1000px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="system-logs-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">System Logs</DialogTitle>
            <DialogDescription id="system-logs-description" className="text-sm text-[#6B7280]">{selectedLogService}</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center gap-3">
            <select
              value={selectedLogService}
              onChange={(e) => setSelectedLogService(e.target.value)}
              className="h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5]"
            >
              <option>All Services</option>
              {services.map((service) => (
                <option key={service.id} value={service.name}>
                  {service.name}
                </option>
              ))}
            </select>

            <select
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value as any)}
              className="h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="ALL">All Levels</option>
              <option value="DEBUG">Debug</option>
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="ERROR">Error</option>
            </select>

            <button
              onClick={() => toast.success('Logs refreshed')}
              className="ml-auto p-2 text-[#6B7280] hover:bg-[#F3F4F6] rounded-md"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-4">
            <div className="font-mono text-xs space-y-1 bg-[#1F2937] text-white p-4 rounded-lg max-h-[500px] overflow-y-auto">
              {logs
                .filter((log) => logLevel === 'ALL' || log.level === logLevel)
                .filter((log) => selectedLogService === 'All Services' || log.service === selectedLogService)
                .map((log) => (
                  <div key={log.id} className="py-1 hover:bg-[#374151] px-2 rounded">
                    <span className="text-[#9CA3AF]">{log.timestamp}</span>
                    {' | '}
                    <span style={{ color: getLogLevelColor(log.level) }}>{log.level}</span>
                    {' | '}
                    <span className="text-[#60A5FA]">{log.service}</span>
                    {' | '}
                    <span className="text-[#E5E7EB]">{log.message}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={exportLogs}
              className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Logs
            </button>
            <button
              onClick={() => setShowLogsModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Service Dependencies */}
      <Dialog open={showDependencyModal} onOpenChange={setShowDependencyModal}>
        <DialogContent className="max-w-[1000px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="service-dependencies-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">Service Dependencies</DialogTitle>
            <DialogDescription id="service-dependencies-description" className="text-sm text-[#6B7280]">Visual dependency graph</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6">
            <div className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-12 text-center">
              <GitBranch className="w-16 h-16 text-[#D1D5DB] mx-auto mb-4" />
              <p className="text-base font-bold text-[#6B7280] mb-2">Dependency Graph Visualization</p>
              <p className="text-sm text-[#9CA3AF]">Interactive node-based graph showing service relationships</p>
              <div className="mt-6 grid grid-cols-3 gap-4 text-left">
                <div className="bg-[#F0FDF4] p-4 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-[#10B981] mx-auto mb-2" />
                  <p className="text-xs text-center text-[#166534]">Vendor Portal</p>
                </div>
                <div className="bg-[#EEF2FF] p-4 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-[#3B82F6] mx-auto mb-2" />
                  <p className="text-xs text-center text-[#1E40AF]">EDI Connection</p>
                </div>
                <div className="bg-[#FEF3C7] p-4 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-[#F59E0B] mx-auto mb-2" />
                  <p className="text-xs text-center text-[#92400E]">Email Service</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end">
            <button
              onClick={() => setShowDependencyModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Health Check Configuration */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="health-check-config-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">Health Check Configuration</DialogTitle>
            <DialogDescription id="health-check-config-description" className="text-sm text-[#6B7280]">Configure monitoring settings</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Service Selection */}
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Select Service</label>
              <select className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5]">
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Health Check Settings */}
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-3">Health Check Settings</label>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-[#4F46E5] rounded" />
                    <span className="text-sm text-[#1F2937]">Enable Health Checks</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs text-[#6B7280] mb-2">Check Interval</label>
                  <select className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm">
                    <option>1 minute</option>
                    <option selected>5 minutes</option>
                    <option>10 minutes</option>
                    <option>30 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#6B7280] mb-2">Timeout (seconds)</label>
                  <input
                    type="number"
                    defaultValue={5}
                    className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Alert Thresholds */}
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-3">Alert Thresholds</label>
              <div className="space-y-3">
                <label className="flex items-start gap-2">
                  <input type="checkbox" defaultChecked className="mt-0.5 w-4 h-4 text-[#4F46E5] rounded" />
                  <div className="flex-1">
                    <span className="text-sm text-[#1F2937]">Alert if response time &gt;</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        defaultValue={300}
                        className="w-24 h-8 px-2 bg-white border border-[#D1D5DB] rounded-md text-sm"
                      />
                      <span className="text-xs text-[#6B7280]">ms</span>
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2">
                  <input type="checkbox" defaultChecked className="mt-0.5 w-4 h-4 text-[#4F46E5] rounded" />
                  <div className="flex-1">
                    <span className="text-sm text-[#1F2937]">Alert after consecutive failures</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        defaultValue={3}
                        className="w-24 h-8 px-2 bg-white border border-[#D1D5DB] rounded-md text-sm"
                      />
                      <span className="text-xs text-[#6B7280]">attempts</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Notifications */}
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-3">Notification Channels</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-[#4F46E5] rounded" />
                  <span className="text-sm text-[#1F2937]">Email</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4 text-[#4F46E5] rounded" />
                  <span className="text-sm text-[#1F2937]">SMS (critical only)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-[#4F46E5] rounded" />
                  <span className="text-sm text-[#1F2937]">Slack</span>
                </label>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => setShowConfigModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.success('Configuration saved');
                setShowConfigModal(false);
              }}
              className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA]"
            >
              Save Configuration
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
