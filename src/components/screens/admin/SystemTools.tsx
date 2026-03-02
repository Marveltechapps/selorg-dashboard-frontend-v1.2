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
import { Textarea } from '@/components/ui/textarea';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  fetchSystemHealth,
  fetchInstances,
  restartInstance,
  fetchCacheStats,
  clearCache,
  fetchDatabaseInfo,
  createDatabaseBackup,
  optimizeDatabase,
  fetchLogs,
  fetchCronJobs,
  triggerCronJob,
  toggleCronJob,
  fetchEnvVariables,
  updateEnvVariable,
  fetchMaintenanceMode,
  toggleMaintenanceMode,
  fetchApiEndpoints,
  testApiEndpoint,
  fetchPerformanceMetrics,
  fetchMigrations,
  runMigrations,
  rollbackMigration,
  SystemHealth,
  CacheStats,
  DatabaseInfo,
  LogEntry,
  CronJob,
  EnvVariable,
  ApiEndpoint,
  PerformanceMetric,
  Migration,
  ServerInstance,
} from './systemToolsApi';
import { toast } from 'sonner';
import {
  Cpu,
  RefreshCw,
  Server,
  Activity,
  Download,
  Database,
  Trash2,
  Play,
  Pause,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Terminal,
  Settings,
  Power,
  TrendingUp,
  Zap,
  HardDrive,
  MemoryStick,
  Wifi,
  FileText,
  Code,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
} from 'lucide-react';

export function SystemTools() {
  const [activeTab, setActiveTab] = useState('health');
  const [loading, setLoading] = useState(false);

  // State management
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [instances, setInstances] = useState<ServerInstance[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [envVariables, setEnvVariables] = useState<EnvVariable[]>([]);
  const [maintenanceMode, setMaintenanceMode] = useState({ enabled: false, message: '' });
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [migrations, setMigrations] = useState<Migration[]>([]);

  // Modals
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [selectedEnvVar, setSelectedEnvVar] = useState<EnvVariable | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [showMasked, setShowMasked] = useState<Record<string, boolean>>({});

  // Filter
  const [logFilter, setLogFilter] = useState('');

  // Data Retention settings (local state)
  const [retentionSettings, setRetentionSettings] = useState({
    archiveOrdersMonths: 12,
    archiveChatsMonths: 6,
    archiveCallLogsMonths: 3,
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  // When Logs or Performance tab is opened, ensure data is loaded (e.g. if initial load failed)
  useEffect(() => {
    if (activeTab === 'logs' && logs.length === 0) {
      fetchLogs().then((data) => {
        setLogs(data);
        setFilteredLogs(data);
      }).catch(() => {});
    }
    if (activeTab === 'performance' && performanceMetrics.length === 0) {
      fetchPerformanceMetrics().then((data) => {
        if (data?.length) setPerformanceMetrics(data);
      }).catch(() => {});
    }
  }, [activeTab]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        fetchSystemHealth(),
        fetchInstances(),
        fetchCacheStats(),
        fetchDatabaseInfo(),
        fetchLogs(),
        fetchCronJobs(),
        fetchEnvVariables(),
        fetchMaintenanceMode(),
        fetchApiEndpoints(),
        fetchPerformanceMetrics(),
        fetchMigrations(),
      ]);
      const [health, insts, cache, db, logsData, jobs, env, maintenance, endpoints, metrics, migs] = results;

      if (health.status === 'fulfilled' && health.value) setSystemHealth(health.value);
      if (insts.status === 'fulfilled' && insts.value) setInstances(insts.value);
      if (cache.status === 'fulfilled' && cache.value) setCacheStats(cache.value);
      if (db.status === 'fulfilled' && db.value) setDatabaseInfo(db.value);
      if (logsData.status === 'fulfilled' && Array.isArray(logsData.value)) {
        setLogs(logsData.value);
        setFilteredLogs(logsData.value);
      }
      if (jobs.status === 'fulfilled' && jobs.value) setCronJobs(jobs.value);
      if (env.status === 'fulfilled' && env.value) setEnvVariables(env.value);
      if (maintenance.status === 'fulfilled' && maintenance.value) {
        setMaintenanceMode(maintenance.value);
        setMaintenanceMessage(maintenance.value.message ?? '');
      }
      if (endpoints.status === 'fulfilled' && endpoints.value) setApiEndpoints(endpoints.value);
      if (metrics.status === 'fulfilled' && metrics.value?.length) setPerformanceMetrics(metrics.value);
      if (migs.status === 'fulfilled' && migs.value) setMigrations(migs.value);

      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) toast.error(`Failed to load ${failed} system data source(s)`);
    } catch (error) {
      toast.error('Failed to load system data');
    } finally {
      setLoading(false);
    }
  };

  const handleRestartInstance = async (instanceId: string) => {
    try {
      await restartInstance(instanceId);
      toast.success('Restart initiated. Server will restart shortly.');
    } catch (error) {
      toast.error((error as Error)?.message ?? 'Failed to restart instance');
    }
  };

  const handleClearCache = async (pattern?: string) => {
    try {
      const result = await clearCache(pattern);
      toast.success(`Cache cleared: ${result.cleared} keys removed`);
      const cache = await fetchCacheStats();
      setCacheStats(cache);
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  };

  const handleDatabaseBackup = async () => {
    try {
      const result = await createDatabaseBackup();
      toast.success(`Backup created: ${result.filename} (${result.size})`);
      const db = await fetchDatabaseInfo();
      setDatabaseInfo(db);
    } catch (error) {
      toast.error('Failed to create backup');
    }
  };

  const handleOptimizeDatabase = async () => {
    try {
      const result = await optimizeDatabase();
      toast.success(`Database optimized: ${result.optimized} tables`);
    } catch (error) {
      toast.error('Failed to optimize database');
    }
  };

  const handleTriggerJob = async (jobId: string) => {
    try {
      await triggerCronJob(jobId);
      toast.success('Job triggered successfully');
      const jobs = await fetchCronJobs();
      setCronJobs(jobs);
    } catch (error) {
      toast.error('Failed to trigger job');
    }
  };

  const handleToggleJob = async (jobId: string, enabled: boolean) => {
    try {
      await toggleCronJob(jobId, enabled);
      toast.success(`Job ${enabled ? 'enabled' : 'paused'}`);
      const jobs = await fetchCronJobs();
      setCronJobs(jobs);
    } catch (error) {
      toast.error('Failed to toggle job');
    }
  };

  const handleUpdateEnvVar = async (key: string, value: string) => {
    try {
      await updateEnvVariable(key, value);
      toast.success('Environment variable updated');
      setShowEnvModal(false);
      const env = await fetchEnvVariables();
      setEnvVariables(env);
    } catch (error) {
      toast.error('Failed to update variable');
    }
  };

  const handleToggleMaintenance = async (enabled: boolean) => {
    try {
      await toggleMaintenanceMode(enabled, maintenanceMessage);
      toast.success(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
      setShowMaintenanceModal(false);
      const maintenance = await fetchMaintenanceMode();
      setMaintenanceMode(maintenance);
    } catch (error) {
      toast.error('Failed to toggle maintenance mode');
    }
  };

  const handleTestApi = async (path: string) => {
    try {
      const result = await testApiEndpoint(path);
      toast.success(`API Test: ${result.status} (${result.responseTime}ms)`);
    } catch (error) {
      toast.error('API test failed');
    }
  };

  const handleRunMigrations = async () => {
    try {
      const result = await runMigrations();
      toast.success(`Executed ${result.executed} migration(s)`);
      const migs = await fetchMigrations();
      setMigrations(migs);
    } catch (error) {
      toast.error('Failed to run migrations');
    }
  };

  const handleRollback = async () => {
    try {
      await rollbackMigration();
      toast.success('Migration rolled back');
      const migs = await fetchMigrations();
      setMigrations(migs);
    } catch (error) {
      toast.error('Failed to rollback migration');
    }
  };

  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (logFilter && logFilter !== 'all') {
      setFilteredLogs(logs.filter(log => log.level === logFilter));
    } else {
      setFilteredLogs(logs);
    }
  }, [logs, logFilter]);

  useEffect(() => {
    if (logs.length > 0 && filteredLogs.length === 0 && !logFilter) {
      setFilteredLogs(logs);
    }
  }, [logs]);

  const handleFilterLogs = (level: string) => {
    setLogFilter(level === 'all' ? '' : level);
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      running: 'bg-emerald-500',
      healthy: 'bg-emerald-500',
      active: 'bg-emerald-500',
      completed: 'bg-emerald-500',
      stopped: 'bg-gray-400',
      slow: 'bg-amber-500',
      paused: 'bg-amber-500',
      pending: 'bg-blue-500',
      error: 'bg-rose-500',
      down: 'bg-rose-500',
      failed: 'bg-rose-500',
    };
    return map[status] || 'bg-gray-400';
  };

  const getLogIcon = (level: string) => {
    const map: Record<string, any> = {
      error: XCircle,
      warn: AlertTriangle,
      info: Info,
      debug: Terminal,
    };
    const Icon = map[level] || Info;
    return <Icon size={16} />;
  };

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">System Tools</h1>
          <p className="text-[#71717a] text-sm">Developer utilities, monitoring, and maintenance tools</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && (
            <span className="text-xs text-[#71717a]">Loading...</span>
          )}
          {!loading && systemHealth && (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-emerald-700">All Systems Operational</span>
              </div>
              <Button size="sm" onClick={loadInitialData} variant="outline" disabled={loading}>
                <RefreshCw size={14} className="mr-1.5" /> Refresh
              </Button>
            </>
          )}
          {!loading && !systemHealth && (
            <Button size="sm" onClick={loadInitialData} variant="outline">
              <RefreshCw size={14} className="mr-1.5" /> Retry
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {systemHealth && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#71717a]">CPU Usage</p>
              <Cpu className="text-blue-600" size={16} />
            </div>
            <p className="text-2xl font-bold text-[#18181b]">{systemHealth.cpu}%</p>
            <div className="w-full bg-[#e4e4e7] h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${systemHealth.cpu}%` }}></div>
            </div>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#71717a]">Memory Usage</p>
              <MemoryStick className="text-purple-600" size={16} />
            </div>
            <p className="text-2xl font-bold text-[#18181b]">{systemHealth.memory}%</p>
            <div className="w-full bg-[#e4e4e7] h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-purple-600 h-full rounded-full" style={{ width: `${systemHealth.memory}%` }}></div>
            </div>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#71717a]">Disk Usage</p>
              <HardDrive className="text-amber-600" size={16} />
            </div>
            <p className="text-2xl font-bold text-[#18181b]">{systemHealth.disk}%</p>
            <div className="w-full bg-[#e4e4e7] h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-amber-600 h-full rounded-full" style={{ width: `${systemHealth.disk}%` }}></div>
            </div>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#71717a]">Uptime</p>
              <Activity className="text-emerald-600" size={16} />
            </div>
            <p className="text-lg font-bold text-emerald-600">{systemHealth.uptime}</p>
            <p className="text-xs text-[#71717a] mt-2">Since last restart</p>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b border-[#e4e4e7] bg-transparent rounded-none h-auto p-0">
          <TabsTrigger value="health" className="data-[state=active]:border-b-2 data-[state=active]:border-[#e11d48] rounded-none">
            <Activity size={14} className="mr-1.5" /> System Health
          </TabsTrigger>
          <TabsTrigger value="cache" className="data-[state=active]:border-b-2 data-[state=active]:border-[#e11d48] rounded-none">
            <Zap size={14} className="mr-1.5" /> Cache
          </TabsTrigger>
          <TabsTrigger value="database" className="data-[state=active]:border-b-2 data-[state=active]:border-[#e11d48] rounded-none">
            <Database size={14} className="mr-1.5" /> Database
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:border-b-2 data-[state=active]:border-[#e11d48] rounded-none">
            <FileText size={14} className="mr-1.5" /> Logs
          </TabsTrigger>
          <TabsTrigger value="jobs" className="data-[state=active]:border-b-2 data-[state=active]:border-[#e11d48] rounded-none">
            <Clock size={14} className="mr-1.5" /> Cron Jobs
          </TabsTrigger>
          <TabsTrigger value="api" className="data-[state=active]:border-b-2 data-[state=active]:border-[#e11d48] rounded-none">
            <Wifi size={14} className="mr-1.5" /> APIs
          </TabsTrigger>
          <TabsTrigger value="env" className="data-[state=active]:border-b-2 data-[state=active]:border-[#e11d48] rounded-none">
            <Settings size={14} className="mr-1.5" /> Environment
          </TabsTrigger>
          <TabsTrigger value="migrations" className="data-[state=active]:border-b-2 data-[state=active]:border-[#e11d48] rounded-none">
            <Code size={14} className="mr-1.5" /> Migrations
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:border-b-2 data-[state=active]:border-[#e11d48] rounded-none">
            <TrendingUp size={14} className="mr-1.5" /> Performance
          </TabsTrigger>
          <TabsTrigger value="retention" className="data-[state=active]:border-b-2 data-[state=active]:border-[#e11d48] rounded-none">
            <HardDrive size={14} className="mr-1.5" /> Data Retention
          </TabsTrigger>
        </TabsList>

        {/* System Health Tab */}
        <TabsContent value="health" className="mt-6 space-y-4">
          {systemHealth && (
            <>
              <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-[#18181b]">Services Status</h3>
                  <Button size="sm" variant="outline" onClick={() => setShowMaintenanceModal(true)}>
                    <Power size={14} className="mr-1.5" /> Maintenance Mode
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {systemHealth.services.map((service, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#f4f4f5] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`}></div>
                        <div>
                          <p className="font-medium text-sm text-[#18181b]">{service.name}</p>
                          <p className="text-xs text-[#71717a]">Uptime: {service.uptime}</p>
                        </div>
                      </div>
                      {service.port && (
                        <Badge variant="outline" className="text-xs font-mono">:{service.port}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instance List */}
              {instances.length > 0 && (
                <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#18181b] mb-4">Server Instances</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Instance ID</TableHead>
                        <TableHead>PID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>CPU</TableHead>
                        <TableHead>Memory (MB)</TableHead>
                        <TableHead>Uptime</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {instances.map((inst) => (
                        <TableRow key={inst.id}>
                          <TableCell className="font-mono text-sm">{inst.id}</TableCell>
                          <TableCell>{inst.pid}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(inst.status)}>{inst.status}</Badge>
                          </TableCell>
                          <TableCell>{inst.cpu}</TableCell>
                          <TableCell>{inst.memory}</TableCell>
                          <TableCell>{inst.uptime}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRestartInstance(inst.id)}
                            >
                              <Power size={12} className="mr-1" /> Restart
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {maintenanceMode.enabled && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="text-amber-600" size={20} />
                    <h3 className="font-bold text-amber-900">Maintenance Mode Active</h3>
                  </div>
                  <p className="text-sm text-amber-800">{maintenanceMode.message}</p>
                  <Button size="sm" className="mt-3" onClick={() => handleToggleMaintenance(false)}>
                    Disable Maintenance Mode
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Cache Tab */}
        <TabsContent value="cache" className="mt-6 space-y-4">
          {cacheStats && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-[#71717a] mb-1">Total Keys</p>
                  <p className="text-2xl font-bold text-[#18181b]">{cacheStats.totalKeys.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-[#71717a] mb-1">Memory Used</p>
                  <p className="text-2xl font-bold text-[#18181b]">{cacheStats.memoryUsed}</p>
                </div>
                <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-[#71717a] mb-1">Hit Rate</p>
                  <p className="text-2xl font-bold text-emerald-600">{cacheStats.hitRate}%</p>
                </div>
              </div>

              <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-[#18181b] mb-4">Cache Operations</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => handleClearCache('product:*')} variant="outline">
                    <Trash2 size={14} className="mr-1.5" /> Clear Product Cache
                  </Button>
                  <Button onClick={() => handleClearCache('session:*')} variant="outline">
                    <Trash2 size={14} className="mr-1.5" /> Clear User Sessions
                  </Button>
                  <Button onClick={() => handleClearCache('order:*')} variant="outline">
                    <Trash2 size={14} className="mr-1.5" /> Clear Order Cache
                  </Button>
                  <Button onClick={() => handleClearCache()} variant="destructive">
                    <Trash2 size={14} className="mr-1.5" /> Clear All Cache
                  </Button>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="p-3 bg-[#f4f4f5] rounded-lg">
                    <p className="text-xs text-[#71717a]">Connections</p>
                    <p className="text-lg font-bold text-[#18181b]">{cacheStats.connections}</p>
                  </div>
                  <div className="p-3 bg-[#f4f4f5] rounded-lg">
                    <p className="text-xs text-[#71717a]">Evictions</p>
                    <p className="text-lg font-bold text-[#18181b]">{cacheStats.evictions}</p>
                  </div>
                  <div className="p-3 bg-[#f4f4f5] rounded-lg">
                    <p className="text-xs text-[#71717a]">Miss Rate</p>
                    <p className="text-lg font-bold text-amber-600">{cacheStats.missRate}%</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="mt-6 space-y-4">
          {databaseInfo && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-[#71717a] mb-1">Database Size</p>
                  <p className="text-2xl font-bold text-[#18181b]">{databaseInfo.size}</p>
                </div>
                <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-[#71717a] mb-1">Total Tables</p>
                  <p className="text-2xl font-bold text-[#18181b]">{databaseInfo.tables}</p>
                </div>
                <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-[#71717a] mb-1">Active Connections</p>
                  <p className="text-2xl font-bold text-[#18181b]">{databaseInfo.connections}</p>
                </div>
              </div>

              <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-[#18181b] mb-4">Database Operations</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleDatabaseBackup} variant="outline">
                    <Download size={14} className="mr-1.5" /> Create Backup
                  </Button>
                  <Button onClick={handleOptimizeDatabase} variant="outline">
                    <Zap size={14} className="mr-1.5" /> Optimize Tables
                  </Button>
                </div>

                <div className="mt-6">
                  <p className="text-xs text-[#71717a] mb-2">Last Backup</p>
                  <p className="text-sm font-medium text-[#18181b]">
                    {new Date(databaseInfo.lastBackup).toLocaleString()}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-[#f4f4f5] rounded-lg">
                    <p className="text-xs text-[#71717a]">Total Queries</p>
                    <p className="text-lg font-bold text-[#18181b]">{databaseInfo.queries.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-[#f4f4f5] rounded-lg">
                    <p className="text-xs text-[#71717a]">Slow Queries</p>
                    <p className="text-lg font-bold text-amber-600">{databaseInfo.slowQueries}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-6 space-y-4">
          <div className="bg-white border border-[#e4e4e7] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#e4e4e7] flex justify-between items-center">
              <h3 className="font-bold text-[#18181b]">System Logs</h3>
              <div className="flex gap-2">
                <Select value={logFilter || 'all'} onValueChange={handleFilterLogs}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    // Export logs as CSV
                    const csv = [
                      ['Timestamp', 'Level', 'Service', 'Message', 'Details'],
                      ...logs.map(log => [
                        new Date(log.timestamp).toLocaleString(),
                        log.level,
                        log.service,
                        log.message,
                        log.details || '',
                      ])
                    ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
                    
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    toast.success(`Exported ${logs.length} log entries`);
                  }}
                >
                  <Download size={14} className="mr-1.5" /> Export
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Timestamp</TableHead>
                  <TableHead className="w-20">Level</TableHead>
                  <TableHead className="w-32">Service</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-[#71717a]">
                      {logFilter && logFilter !== 'all' ? `No ${logFilter} logs found` : 'No logs available'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs text-[#71717a]">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${
                        log.level === 'error' ? 'bg-rose-500' :
                        log.level === 'warn' ? 'bg-amber-500' :
                        log.level === 'info' ? 'bg-blue-500' : 'bg-gray-500'
                      } text-xs`}>
                        {getLogIcon(log.level)}
                        <span className="ml-1">{log.level.toUpperCase()}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.service}</TableCell>
                    <TableCell>
                      <div className="text-sm text-[#18181b]">{log.message}</div>
                      {log.details && (
                        <div className="text-xs text-[#71717a] mt-1">{log.details}</div>
                      )}
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Cron Jobs Tab */}
        <TabsContent value="jobs" className="mt-6 space-y-4">
          <div className="bg-white border border-[#e4e4e7] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#e4e4e7]">
              <h3 className="font-bold text-[#18181b]">Scheduled Jobs</h3>
              <p className="text-xs text-[#71717a] mt-1">Automated tasks and background processes</p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Avg Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cronJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.name}</TableCell>
                    <TableCell className="font-mono text-xs text-[#71717a]">{job.schedule}</TableCell>
                    <TableCell className="text-xs text-[#71717a]">
                      {new Date(job.lastRun).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-[#71717a]">
                      {new Date(job.nextRun).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{job.avgDuration}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleTriggerJob(job.id)}>
                          <Play size={12} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleJob(job.id, job.status === 'paused')}
                        >
                          {job.status === 'paused' ? <Play size={12} /> : <Pause size={12} />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* API Testing Tab */}
        <TabsContent value="api" className="mt-6 space-y-4">
          <div className="bg-white border border-[#e4e4e7] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#e4e4e7]">
              <h3 className="font-bold text-[#18181b]">API Endpoints Monitor</h3>
              <p className="text-xs text-[#71717a] mt-1">Real-time endpoint health and performance</p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Avg Response</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Error Rate</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiEndpoints.map((endpoint, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-xs">{endpoint.path}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{endpoint.method}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(endpoint.status)}>
                        {endpoint.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{endpoint.avgResponseTime}ms</TableCell>
                    <TableCell>{endpoint.requestCount.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={endpoint.errorRate > 5 ? 'text-rose-600 font-bold' : 'text-[#71717a]'}>
                        {endpoint.errorRate}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleTestApi(endpoint.path)}>
                        <Play size={12} className="mr-1" /> Test
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Environment Tab */}
        <TabsContent value="env" className="mt-6 space-y-4">
          <div className="bg-white border border-[#e4e4e7] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#e4e4e7]">
              <h3 className="font-bold text-[#18181b]">Environment Variables</h3>
              <p className="text-xs text-[#71717a] mt-1">System configuration and credentials</p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variable</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {envVariables.map((env, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm font-bold">{env.key}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#71717a]">
                          {env.isSensitive && !showMasked[env.key] ? env.value : env.value}
                        </span>
                        {env.isSensitive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowMasked({ ...showMasked, [env.key]: !showMasked[env.key] })}
                          >
                            {showMasked[env.key] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{env.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedEnvVar(env);
                          setShowEnvModal(true);
                        }}
                      >
                        <Settings size={12} className="mr-1" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Migrations Tab */}
        <TabsContent value="migrations" className="mt-6 space-y-4">
          <div className="bg-white border border-[#e4e4e7] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#e4e4e7] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#18181b]">Database Migrations</h3>
                <p className="text-xs text-[#71717a] mt-1">Schema version control and updates</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleRollback}>
                  <RotateCcw size={14} className="mr-1.5" /> Rollback
                </Button>
                <Button size="sm" onClick={handleRunMigrations}>
                  <Play size={14} className="mr-1.5" /> Run Pending
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Migration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Executed At</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {migrations.map((migration) => (
                  <TableRow key={migration.id}>
                    <TableCell className="font-mono text-sm">{migration.name}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(migration.status)}>
                        {migration.status === 'completed' && <CheckCircle size={12} className="mr-1" />}
                        {migration.status === 'pending' && <Clock size={12} className="mr-1" />}
                        {migration.status === 'failed' && <XCircle size={12} className="mr-1" />}
                        {migration.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[#71717a]">
                      {migration.executedAt ? new Date(migration.executedAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{migration.duration || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="mt-6 space-y-4">
          <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-[#18181b] mb-4">Real-Time Performance Metrics</h3>

            {performanceMetrics.length === 0 ? (
              <div className="text-center py-12 text-[#71717a]">
                <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
                <p>No performance data available</p>
                <p className="text-xs mt-2">Loading metrics...</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-4"
                  onClick={async () => {
                    try {
                      const metrics = await fetchPerformanceMetrics();
                      setPerformanceMetrics(metrics && metrics.length > 0 ? metrics : []);
                      toast.success('Performance metrics loaded');
                    } catch (error) {
                      toast.error('Failed to load performance metrics');
                    }
                  }}
                >
                  <RefreshCw size={14} className="mr-1.5" /> Load Metrics
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {/* CPU & Memory Chart */}
                <div>
                  <p className="text-xs text-[#71717a] mb-3">CPU & Memory Usage (%)</p>
                  <div className="h-48 min-h-[160px] flex items-end gap-2 bg-[#f4f4f5] rounded-lg p-2">
                    {performanceMetrics.slice(-10).map((metric, idx) => (
                      <div key={idx} className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="relative flex-1 min-h-[40px] bg-white rounded-t">
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t transition-all"
                            style={{ height: `${Math.min(metric.cpu || 0, 100)}%`, minHeight: '4px' }}
                            title={`CPU: ${metric.cpu}%`}
                          />
                        </div>
                        <div className="relative flex-1 min-h-[40px] bg-white rounded-t">
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-purple-500 rounded-t transition-all"
                            style={{ height: `${Math.min(metric.memory || 0, 100)}%`, minHeight: '4px' }}
                            title={`Memory: ${metric.memory}%`}
                          />
                        </div>
                        <p className="text-[9px] text-[#71717a] text-center font-mono truncate">{metric.timestamp?.includes(' ') ? metric.timestamp.split(' ')[1] : (metric.timestamp || '')}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-3 justify-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-xs text-[#71717a]">CPU</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded"></div>
                      <span className="text-xs text-[#71717a]">Memory</span>
                    </div>
                  </div>
                </div>

                {/* Request & Response Time Chart */}
                <div>
                  <p className="text-xs text-[#71717a] mb-3">Requests & Response Time</p>
                  <div className="h-48 min-h-[160px] flex items-end gap-2 bg-[#f4f4f5] rounded-lg p-2">
                    {performanceMetrics.slice(-10).map((metric, idx) => (
                      <div key={idx} className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="relative flex-1 min-h-[40px] bg-white rounded-t">
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t transition-all"
                            style={{ height: `${Math.min(((metric.requests || 0) / 20) * 100, 100)}%`, minHeight: '4px' }}
                            title={`Requests: ${metric.requests}`}
                          />
                        </div>
                        <div className="relative flex-1 min-h-[40px] bg-white rounded-t">
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-amber-500 rounded-t transition-all"
                            style={{ height: `${Math.min(((metric.responseTime || 0) / 2) * 100, 100)}%`, minHeight: '4px' }}
                            title={`Response: ${metric.responseTime}ms`}
                          />
                        </div>
                        <p className="text-[9px] text-[#71717a] text-center font-mono truncate">{metric.timestamp?.includes(' ') ? metric.timestamp.split(' ')[1] : (metric.timestamp || '')}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-3 justify-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                      <span className="text-xs text-[#71717a]">Requests</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded"></div>
                      <span className="text-xs text-[#71717a]">Response Time</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Data Retention Tab */}
        <TabsContent value="retention">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Data Retention Policies</h3>
              <p className="text-xs text-[#71717a] mt-1">Configure how long data is retained before archival</p>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-[#e4e4e7] rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#18181b]">Orders</h4>
                    <p className="text-xs text-[#71717a]">Archive older orders</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#71717a] mb-1 block">Archive orders older than</label>
                  <select
                    value={retentionSettings.archiveOrdersMonths}
                    onChange={(e) => setRetentionSettings(prev => ({ ...prev, archiveOrdersMonths: parseInt(e.target.value) }))}
                    className="w-full border border-[#e4e4e7] rounded-md px-3 py-2 text-sm"
                  >
                    <option value={3}>3 months</option>
                    <option value={6}>6 months</option>
                    <option value={12}>12 months</option>
                    <option value={18}>18 months</option>
                    <option value={24}>24 months</option>
                    <option value={36}>36 months</option>
                  </select>
                </div>
              </div>

              <div className="border border-[#e4e4e7] rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <Terminal size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#18181b]">Chat Logs</h4>
                    <p className="text-xs text-[#71717a]">Archive old chat conversations</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#71717a] mb-1 block">Archive chats older than</label>
                  <select
                    value={retentionSettings.archiveChatsMonths}
                    onChange={(e) => setRetentionSettings(prev => ({ ...prev, archiveChatsMonths: parseInt(e.target.value) }))}
                    className="w-full border border-[#e4e4e7] rounded-md px-3 py-2 text-sm"
                  >
                    <option value={1}>1 month</option>
                    <option value={3}>3 months</option>
                    <option value={6}>6 months</option>
                    <option value={12}>12 months</option>
                    <option value={24}>24 months</option>
                  </select>
                </div>
              </div>

              <div className="border border-[#e4e4e7] rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Clock size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#18181b]">Call Logs</h4>
                    <p className="text-xs text-[#71717a]">Archive old call records</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#71717a] mb-1 block">Archive call logs older than</label>
                  <select
                    value={retentionSettings.archiveCallLogsMonths}
                    onChange={(e) => setRetentionSettings(prev => ({ ...prev, archiveCallLogsMonths: parseInt(e.target.value) }))}
                    className="w-full border border-[#e4e4e7] rounded-md px-3 py-2 text-sm"
                  >
                    <option value={1}>1 month</option>
                    <option value={3}>3 months</option>
                    <option value={6}>6 months</option>
                    <option value={12}>12 months</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <Button onClick={() => toast.success('Data retention settings saved')}>
                <Save size={14} className="mr-1.5" /> Save Retention Settings
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Environment Variable Edit Modal */}
      <Dialog open={showEnvModal} onOpenChange={setShowEnvModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Environment Variable</DialogTitle>
            <DialogDescription>Update the value for this environment variable</DialogDescription>
          </DialogHeader>

          {selectedEnvVar && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#18181b] mb-1 block">Variable Name</label>
                <Input value={selectedEnvVar.key} disabled className="font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#18181b] mb-1 block">Value</label>
                <Input
                  defaultValue={selectedEnvVar.value}
                  type={selectedEnvVar.isSensitive ? 'password' : 'text'}
                  className="font-mono"
                  id="env-value-input"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#18181b] mb-1 block">Category</label>
                <Input value={selectedEnvVar.category} disabled />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnvModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const input = document.getElementById('env-value-input') as HTMLInputElement;
                if (selectedEnvVar && input) {
                  handleUpdateEnvVar(selectedEnvVar.key, input.value);
                }
              }}
            >
              <Save size={14} className="mr-1.5" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance Mode Modal */}
      <Dialog open={showMaintenanceModal} onOpenChange={setShowMaintenanceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Maintenance Mode</DialogTitle>
            <DialogDescription>Enable maintenance mode to prevent user access during updates</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#18181b] mb-1 block">Maintenance Message</label>
              <Textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="Enter message to display to users..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMaintenanceModal(false)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => handleToggleMaintenance(true)}
            >
              <Power size={14} className="mr-1.5" /> Enable Maintenance Mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
