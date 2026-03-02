import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  fetchAuditLogs,
  fetchAuditStats,
  exportAuditLogs,
  fetchLogDetails,
  AuditLog,
  AuditStats,
} from './auditLogsApi';
import { toast } from 'sonner';
import {
  History,
  RefreshCw,
  Download,
  Search,
  Filter,
  Eye,
  Copy,
  AlertCircle,
  Github,
  Calendar,
  User,
  Activity,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Plus,
  FileText,
  Shield,
  Code,
  TrendingUp,
} from 'lucide-react';

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    module: '',
    action: '',
    severity: '',
    user: '',
    search: '',
    timeframe: '' as '' | '24h' | '7d' | '30d',
  });
  const [meta, setMeta] = useState<{ total: number; page: number; limit: number; pages: number } | null>(null);

  const getDateRange = () => {
    if (!filters.timeframe) return {};
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    let from: string;
    if (filters.timeframe === '24h') {
      const d = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      from = d.toISOString().split('T')[0];
    } else if (filters.timeframe === '7d') {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      from = d.toISOString().split('T')[0];
    } else {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      from = d.toISOString().split('T')[0];
    }
    return { dateFrom: from, dateTo: to };
  };

  const buildFilters = (page = 1) => {
    const { dateFrom, dateTo } = getDateRange();
    return {
      module: filters.module || undefined,
      action: filters.action || undefined,
      severity: filters.severity || undefined,
      user: filters.user?.trim() || undefined,
      search: filters.search?.trim() || undefined,
      dateFrom,
      dateTo,
      page,
      limit: 50,
    };
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (page = 1) => {
    setLoading(true);
    try {
      const f = buildFilters(page);
      const [logsResult, statsData] = await Promise.all([
        fetchAuditLogs(f),
        fetchAuditStats(),
      ]);

      setLogs(logsResult.logs);
      setMeta(logsResult.meta);
      setStats(statsData);
    } catch (error) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    setLoading(true);
    try {
      const f = buildFilters(1);
      const logsResult = await fetchAuditLogs(f);
      setLogs(logsResult.logs);
      setMeta(logsResult.meta);
      toast.success('Filters applied');
    } catch (error) {
      toast.error('Failed to apply filters');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilters({ module: '', action: '', severity: '', user: '', search: '', timeframe: '' });
    loadData(1);
  };

  const handleLoadMore = async () => {
    if (!meta || meta.page >= meta.pages) return;
    setLoading(true);
    try {
      const f = buildFilters(meta.page + 1);
      const logsResult = await fetchAuditLogs(f);
      setLogs((prev) => [...prev, ...logsResult.logs]);
      setMeta(logsResult.meta);
    } catch (error) {
      toast.error('Failed to load more logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const result = await exportAuditLogs(format, logs);
      toast.success(`Audit logs exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export logs');
    }
  };

  const handleViewDetails = async (logId: string) => {
    try {
      const logData = await fetchLogDetails(logId);
      if (logData) {
        setSelectedLog(logData);
        setShowDetailsModal(true);
      }
    } catch (error) {
      toast.error('Failed to load log details');
    }
  };

  const handleCopyStack = (log: AuditLog) => {
    const stack = [
      `Event ID: ${log.id}`,
      `Timestamp: ${log.timestamp}`,
      `Module: ${log.module} | Action: ${log.action} | Severity: ${log.severity}`,
      `User: ${log.user} (${log.userEmail})`,
      `Description: ${log.description}`,
      log.metadata ? `Metadata:\n${JSON.stringify(log.metadata, null, 2)}` : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(stack).then(() => toast.success('Copied to clipboard')).catch(() => toast.error('Failed to copy'));
  };

  const handleOpenIncident = (log: AuditLog) => {
    const context = `[Audit Log ${log.id}] ${log.module}/${log.action} - ${log.description}`;
    navigator.clipboard.writeText(context).then(() => {
      toast.success('Incident context copied. Create ticket in Support Center.');
    }).catch(() => toast.error('Failed to copy'));
  };

  const handleCreateGitIssue = (log: AuditLog) => {
    const body = [
      `## Audit log reference`,
      `- **Event ID:** ${log.id}`,
      `- **Timestamp:** ${log.timestamp}`,
      `- **Module:** ${log.module} | **Action:** ${log.action} | **Severity:** ${log.severity}`,
      `- **User:** ${log.user} (${log.userEmail})`,
      ``,
      `### Description`,
      log.description,
      log.metadata ? `\n### Metadata\n\`\`\`json\n${JSON.stringify(log.metadata, null, 2)}\n\`\`\`` : '',
    ].filter(Boolean).join('\n');
    const issueUrl = import.meta.env.VITE_GIT_ISSUE_URL || 'https://github.com';
    const encoded = encodeURIComponent(body);
    const url = issueUrl.includes('?') ? `${issueUrl}&body=${encoded}` : `${issueUrl}?body=${encoded}`;
    window.open(url, '_blank');
    toast.success('Opening Git issue...');
  };

  const getActionIcon = (action: string) => {
    const iconMap: Record<string, any> = {
      create: Plus,
      update: Edit,
      delete: Trash2,
      login: LogIn,
      login_success: LogIn,
      login_failure: XCircle,
      logout: LogOut,
      view: Eye,
      export: Download,
      approve: CheckCircle,
      reject: XCircle,
      user_create: Plus,
      user_update: Edit,
      user_delete: Trash2,
      role_assign: Shield,
    };
    const Icon = iconMap[action] || Activity;
    return <Icon size={14} />;
  };

  const getActionBadge = (action: string) => {
    const actionMap: Record<string, string> = {
      create: 'bg-emerald-500',
      update: 'bg-blue-500',
      delete: 'bg-rose-500',
      login: 'bg-purple-500',
      login_success: 'bg-purple-500',
      login_failure: 'bg-rose-600',
      logout: 'bg-gray-400',
      view: 'bg-cyan-500',
      export: 'bg-indigo-500',
      approve: 'bg-emerald-600',
      reject: 'bg-rose-600',
      user_create: 'bg-emerald-500',
      user_update: 'bg-blue-500',
      user_delete: 'bg-rose-500',
      role_assign: 'bg-indigo-500',
    };
    return (
      <Badge className={`${actionMap[action] || 'bg-gray-500'} text-xs`}>
        {getActionIcon(action)}
        <span className="ml-1">{action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
      </Badge>
    );
  };

  const getModuleIcon = (module: string) => {
    const iconMap: Record<string, any> = {
      users: User,
      orders: FileText,
      products: FileText,
      payments: FileText,
      config: Code,
      auth: Shield,
      compliance: Shield,
      integrations: Activity,
      support: Activity,
    };
    const Icon = iconMap[module] || Activity;
    return <Icon size={14} className="text-[#71717a]" />;
  };

  const getSeverityBadge = (severity: string) => {
    const severityMap: Record<string, { icon: any; className: string }> = {
      critical: { icon: AlertTriangle, className: 'bg-rose-600' },
      warning: { icon: AlertTriangle, className: 'bg-amber-500' },
      success: { icon: CheckCircle, className: 'bg-emerald-500' },
      info: { icon: Info, className: 'bg-blue-500' },
    };
    const config = severityMap[severity] || severityMap.info;
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon size={12} className="mr-1" />
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-[#71717a]">Loading audit logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Audit Logs</h1>
          <p className="text-[#71717a] text-sm">Complete system activity timeline and user actions</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={loadData} variant="outline">
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport('csv')}>
            <Download size={14} className="mr-1.5" /> Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport('json')}>
            <Download size={14} className="mr-1.5" /> Export JSON
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-6 gap-4">
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Total Events</p>
            <Activity className="text-blue-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{stats?.totalEvents}</p>
          <p className="text-xs text-[#71717a] mt-2">All time</p>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Today's Events</p>
            <Calendar className="text-emerald-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats?.todayEvents}</p>
          <p className="text-xs text-[#71717a] mt-2">Last 24 hours</p>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Critical Events</p>
            <AlertTriangle className="text-rose-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-rose-600">{stats?.criticalEvents}</p>
          <p className="text-xs text-[#71717a] mt-2">Requires attention</p>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Active Users</p>
            <User className="text-purple-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats?.uniqueUsers}</p>
          <p className="text-xs text-[#71717a] mt-2">Unique users</p>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Top Action</p>
            <TrendingUp className="text-amber-600" size={16} />
          </div>
          <p className="text-lg font-bold text-amber-600 capitalize">{stats?.topAction}</p>
          <p className="text-xs text-[#71717a] mt-2">Most frequent</p>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Top Module</p>
            <Code className="text-indigo-600" size={16} />
          </div>
          <p className="text-lg font-bold text-indigo-600 capitalize">{stats?.topModule}</p>
          <p className="text-xs text-[#71717a] mt-2">Most active</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#71717a]" />
            <h3 className="font-bold text-[#18181b]">Filters</h3>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-4">
              <label className="text-xs font-medium text-[#18181b] mb-1 block">Search</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
                <Input
                  placeholder="Search message, module, resource..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#18181b] mb-1 block">Timeframe</label>
              <Select value={filters.timeframe} onValueChange={(v) => setFilters({ ...filters, timeframe: v as typeof filters.timeframe })}>
                <SelectTrigger>
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All time</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#18181b] mb-1 block">Module</label>
              <Select value={filters.module} onValueChange={(value) => setFilters({ ...filters, module: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All modules</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="orders">Orders</SelectItem>
                  <SelectItem value="products">Products</SelectItem>
                  <SelectItem value="payments">Payments</SelectItem>
                  <SelectItem value="config">Config</SelectItem>
                  <SelectItem value="auth">Auth</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="integrations">Integrations</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-[#18181b] mb-1 block">Action</label>
              <Select value={filters.action} onValueChange={(value) => setFilters({ ...filters, action: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-[#18181b] mb-1 block">Severity</label>
              <Select value={filters.severity} onValueChange={(value) => setFilters({ ...filters, severity: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-[#18181b] mb-1 block">User Email</label>
              <Input
                placeholder="Search by email..."
                value={filters.user}
                onChange={(e) => setFilters({ ...filters, user: e.target.value })}
              />
            </div>

            <div className="col-span-4 flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
              <Button size="sm" onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
          <h3 className="font-bold text-[#18181b]">Activity Timeline</h3>
          <p className="text-xs text-[#71717a] mt-1">Real-time log of all system events and user actions</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="text-xs">
                    <div className="font-medium text-[#18181b]">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div className="text-[#71717a]">{formatTimeAgo(log.timestamp)}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                      {log.user ? log.user.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-[#18181b]">{log.user || 'Unknown User'}</div>
                      <div className="text-xs text-[#71717a]">{log.userEmail || 'N/A'}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getActionBadge(log.action)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getModuleIcon(log.module)}
                    <span className="text-sm capitalize">{log.module}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-[#18181b] max-w-xs truncate">
                    {log.resource}
                  </div>
                  {log.resourceId && (
                    <div className="text-xs text-[#71717a] font-mono">{log.resourceId}</div>
                  )}
                </TableCell>
                <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                <TableCell className="font-mono text-xs text-[#52525b]">{log.ipAddress}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewDetails(log.id)}
                  >
                    <Eye size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {logs.length === 0 && (
          <div className="p-12 text-center">
            <History size={48} className="mx-auto mb-4 text-[#a1a1aa]" />
            <h3 className="font-bold text-[#18181b] mb-2">No Logs Found</h3>
            <p className="text-sm text-[#71717a]">Try adjusting your filters or clearing them to see more results</p>
          </div>
        )}

        {logs.length > 0 && (
          <div className="p-3 border-t border-[#e4e4e7] bg-[#fafafa] flex justify-between items-center">
            <p className="text-xs text-[#71717a]">
              Showing {logs.length} of {meta?.total ?? logs.length} events
            </p>
            {meta && meta.page < meta.pages && (
              <Button size="sm" variant="outline" onClick={handleLoadMore} disabled={loading}>
                Load More
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History size={20} />
              Event Details
            </DialogTitle>
            <DialogDescription>Complete information about this audit log entry</DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Event Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#f4f4f5] rounded-lg p-3">
                  <p className="text-xs text-[#71717a] mb-1">Event ID</p>
                  <p className="font-mono text-sm text-[#18181b]">{selectedLog.id}</p>
                </div>
                <div className="bg-[#f4f4f5] rounded-lg p-3">
                  <p className="text-xs text-[#71717a] mb-1">Timestamp</p>
                  <p className="text-sm text-[#18181b]">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div className="bg-[#f4f4f5] rounded-lg p-3">
                  <p className="text-xs text-[#71717a] mb-1">Severity</p>
                  {getSeverityBadge(selectedLog.severity)}
                </div>
                <div className="bg-[#f4f4f5] rounded-lg p-3">
                  <p className="text-xs text-[#71717a] mb-1">Action</p>
                  {getActionBadge(selectedLog.action)}
                </div>
              </div>

              {/* User Information */}
              <div>
                <h4 className="text-sm font-bold text-[#18181b] mb-2">User Information</h4>
                <div className="bg-[#f4f4f5] rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#71717a]">Name:</span>
                    <span className="font-medium text-[#18181b]">{selectedLog.user}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71717a]">Email:</span>
                    <span className="font-medium text-[#18181b]">{selectedLog.userEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71717a]">IP Address:</span>
                    <span className="font-mono text-[#18181b]">{selectedLog.ipAddress}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-[#71717a]">User Agent:</span>
                    <span className="font-mono text-xs text-[#18181b] text-right max-w-md">
                      {selectedLog.userAgent}
                    </span>
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div>
                <h4 className="text-sm font-bold text-[#18181b] mb-2">Event Details</h4>
                <div className="bg-[#f4f4f5] rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#71717a]">Module:</span>
                    <span className="font-medium text-[#18181b] capitalize">{selectedLog.module}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71717a]">Resource:</span>
                    <span className="font-medium text-[#18181b]">{selectedLog.resource}</span>
                  </div>
                  {selectedLog.resourceId && (
                    <div className="flex justify-between">
                      <span className="text-[#71717a]">Resource ID:</span>
                      <span className="font-mono text-[#18181b]">{selectedLog.resourceId}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[#e4e4e7]">
                    <p className="text-[#71717a] text-xs mb-1">Description:</p>
                    <p className="text-[#18181b]">{selectedLog.description}</p>
                  </div>
                </div>
              </div>

              {/* Changes */}
              {selectedLog.changes && selectedLog.changes.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-[#18181b] mb-2">Changes Made</h4>
                  <div className="space-y-2">
                    {selectedLog.changes.map((change, idx) => (
                      <div key={idx} className="bg-[#f4f4f5] rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs font-mono">
                            {change.field}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-[#71717a] mb-1">Old Value</p>
                            <p className="font-mono text-rose-600 bg-rose-50 px-2 py-1 rounded">
                              {String(change.oldValue) || '(empty)'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#71717a] mb-1">New Value</p>
                            <p className="font-mono text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                              {String(change.newValue)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-[#18181b] mb-2">Additional Metadata</h4>
                  <div className="bg-[#f4f4f5] rounded-lg p-3">
                    <pre className="text-xs font-mono text-[#52525b] overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-wrap gap-2">
            {selectedLog && (
              <>
                <Button size="sm" variant="outline" onClick={() => handleCopyStack(selectedLog)}>
                  <Copy size={14} className="mr-1.5" /> Copy stack
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleOpenIncident(selectedLog)}>
                  <AlertCircle size={14} className="mr-1.5" /> Open incident
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleCreateGitIssue(selectedLog)}>
                  <Github size={14} className="mr-1.5" /> Create Git issue
                </Button>
              </>
            )}
            <Button onClick={() => setShowDetailsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
