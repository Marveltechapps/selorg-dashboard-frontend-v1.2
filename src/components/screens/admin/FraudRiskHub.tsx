import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  fetchFraudAlerts,
  fetchRiskProfiles,
  fetchBlockedEntities,
  fetchFraudPatterns,
  fetchInvestigations,
  fetchFraudRules,
  fetchChargebacks,
  fetchFraudMetrics,
  updateFraudAlert,
  unblockEntity,
  toggleFraudRule,
  blockEntity,
  updateChargeback,
  FraudAlert,
  RiskProfile,
  BlockedEntity,
  FraudPattern,
  Investigation,
  FraudRule,
  Chargeback,
  FraudMetrics,
} from './fraudRiskApi';
import { fetchLoginSessions, revokeSession } from './userManagementApi';
import type { LoginSession } from './userManagementApi';
import { toast } from 'sonner';
import {
  ShieldAlert,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Ban,
  Unlock,
  TrendingUp,
  TrendingDown,
  Minus,
  FileSearch,
  Zap,
  IndianRupee,
  Users,
  Activity,
  Target,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

export function FraudRiskHub() {
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [riskProfiles, setRiskProfiles] = useState<RiskProfile[]>([]);
  const [blockedEntities, setBlockedEntities] = useState<BlockedEntity[]>([]);
  const [fraudPatterns, setFraudPatterns] = useState<FraudPattern[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [fraudRules, setFraudRules] = useState<FraudRule[]>([]);
  const [chargebacks, setChargebacks] = useState<Chargeback[]>([]);
  const [metrics, setMetrics] = useState<FraudMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Rate Limits (local state)
  const [rateLimits, setRateLimits] = useState({
    maxRefundRequestsPerDay: 3,
    maxCancellationsPerDay: 2,
    maxSupportTicketsPerHour: 5,
  });

  // Modal
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [viewAlertOpen, setViewAlertOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    if (activeTab === 'security') {
      setSessionsLoading(true);
      fetchLoginSessions()
        .then(setSessions)
        .catch(() => toast.error('Failed to load sessions'))
        .finally(() => setSessionsLoading(false));
    }
  }, [activeTab]);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
      toast.success('Session revoked');
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (error) {
      toast.error('Failed to revoke session');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (severityFilter !== 'all') filters.severity = severityFilter;

      const [alerts, profiles, blocked, patterns, invs, rules, cbs, metricsData] = await Promise.all([
        fetchFraudAlerts(filters),
        fetchRiskProfiles(),
        fetchBlockedEntities(),
        fetchFraudPatterns(),
        fetchInvestigations(),
        fetchFraudRules(),
        fetchChargebacks(),
        fetchFraudMetrics(),
      ]);

      setFraudAlerts(alerts);
      setRiskProfiles(profiles);
      setBlockedEntities(blocked);
      setFraudPatterns(patterns);
      setInvestigations(invs);
      setFraudRules(rules);
      setChargebacks(cbs);
      setMetrics(metricsData);
    } catch (error) {
      toast.error('Failed to load fraud data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAlert = (alert: FraudAlert) => {
    setSelectedAlert(alert);
    setViewAlertOpen(true);
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await updateFraudAlert(alertId, { status: 'resolved', resolvedAt: new Date().toISOString() });
      toast.success('Alert resolved');
      loadData();
      setViewAlertOpen(false);
    } catch (error) {
      toast.error('Failed to resolve alert');
    }
  };

  const handleUnblockEntity = async (id: string, value: string) => {
    try {
      await unblockEntity(id);
      toast.success(`${value} unblocked successfully`);
      loadData();
    } catch (error) {
      toast.error('Failed to unblock entity');
    }
  };

  const handleToggleRule = async (id: string, name: string) => {
    try {
      await toggleFraudRule(id);
      const rule = fraudRules.find(r => r.id === id);
      toast.success(`${name} ${rule?.isActive ? 'disabled' : 'enabled'}`);
      loadData();
    } catch (error) {
      toast.error('Failed to toggle rule');
    }
  };

  const handleBlockCustomer = async (alert: FraudAlert) => {
    try {
      await blockEntity({
        type: 'user',
        value: alert.customerId,
        reason: `Fraud alert ${alert.alertNumber}: ${alert.description}`,
        isPermanent: true,
        relatedAlerts: [alert.alertNumber],
      });
      toast.success(`${alert.customerName} blocked successfully`);
      loadData();
      setViewAlertOpen(false);
    } catch (error) {
      toast.error('Failed to block customer');
    }
  };

  const handleBlockDevice = async (alert: FraudAlert) => {
    if (!alert.deviceId) return;
    try {
      await blockEntity({
        type: 'device',
        value: alert.deviceId,
        reason: `Fraud alert ${alert.alertNumber}: ${alert.description}`,
        isPermanent: true,
        relatedAlerts: [alert.alertNumber],
      });
      toast.success(`Device ${alert.deviceId} blocked successfully`);
      loadData();
      setViewAlertOpen(false);
    } catch (error) {
      toast.error('Failed to block device');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-rose-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500';
      case 'investigating': return 'bg-purple-500';
      case 'resolved': return 'bg-emerald-500';
      case 'false_positive': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-rose-600 bg-rose-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      case 'low': return 'text-emerald-600 bg-emerald-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="text-rose-500" size={16} />;
      case 'decreasing': return <TrendingDown className="text-emerald-500" size={16} />;
      case 'stable': return <Minus className="text-blue-500" size={16} />;
      default: return null;
    }
  };

  const filteredAlerts = fraudAlerts.filter(alert => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      alert.alertNumber.toLowerCase().includes(query) ||
      alert.customerName.toLowerCase().includes(query) ||
      alert.customerEmail.toLowerCase().includes(query) ||
      alert.description.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-[#71717a]">Loading fraud monitoring...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Fraud & Risk Hub</h1>
          <p className="text-[#71717a] text-sm">Real-time fraud detection and risk monitoring</p>
        </div>
        <Button 
          size="sm" 
          onClick={async () => {
            await loadData();
            toast.success('Fraud & risk data refreshed');
          }} 
          variant="outline"
        >
          <RefreshCw size={14} className="mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Open Alerts</p>
            <AlertTriangle className="text-rose-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{metrics?.openAlerts}</p>
          <p className="text-xs text-[#71717a] mt-1">of {metrics?.totalAlerts} total</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Loss Prevented</p>
            <Target className="text-emerald-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-emerald-600">₹{(metrics?.totalLossPrevented || 0).toLocaleString()}</p>
          <p className="text-xs text-[#71717a] mt-1">YTD savings</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Avg Risk Score</p>
            <Activity className="text-amber-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{metrics?.averageRiskScore}</p>
          <p className="text-xs text-[#71717a] mt-1">out of 100</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Blocked Entities</p>
            <Ban className="text-[#e11d48]" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{metrics?.blockedEntities}</p>
          <p className="text-xs text-[#71717a] mt-1">active blocks</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Investigations</p>
            <FileSearch className="text-purple-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{metrics?.activeInvestigations}</p>
          <p className="text-xs text-[#71717a] mt-1">active cases</p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">
            <AlertTriangle size={14} className="mr-1.5" /> Active Alerts
          </TabsTrigger>
          <TabsTrigger value="risk">
            <Activity size={14} className="mr-1.5" /> Risk Profiles
          </TabsTrigger>
          <TabsTrigger value="blocked">
            <Ban size={14} className="mr-1.5" /> Blocked Entities
          </TabsTrigger>
          <TabsTrigger value="patterns">
            <TrendingUp size={14} className="mr-1.5" /> Fraud Patterns
          </TabsTrigger>
          <TabsTrigger value="investigations">
            <FileSearch size={14} className="mr-1.5" /> Investigations
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Zap size={14} className="mr-1.5" /> Rules Engine
          </TabsTrigger>
          <TabsTrigger value="chargebacks">
            <IndianRupee size={14} className="mr-1.5" /> Chargebacks
          </TabsTrigger>
          <TabsTrigger value="security">
            <KeyRound size={14} className="mr-1.5" /> Session Management
          </TabsTrigger>
          <TabsTrigger value="rate-limits">
            <Target size={14} className="mr-1.5" /> Rate Limits
          </TabsTrigger>
        </TabsList>

        {/* Active Alerts Tab */}
        <TabsContent value="alerts">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            {/* Filters */}
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" size={16} />
                  <Input
                    placeholder="Search alerts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="false_positive">False Positive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Alerts Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detected</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-[#71717a]">
                        No fraud alerts found. Data is loaded from the API.
                      </TableCell>
                    </TableRow>
                  ) : (
                  filteredAlerts.map((alert) => (
                    <TableRow key={alert.id} className="cursor-pointer hover:bg-[#f4f4f5]" onClick={() => handleViewAlert(alert)}>
                      <TableCell className="font-mono font-bold text-[#e11d48]">{alert.alertNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {alert.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#18181b]">{alert.customerName}</p>
                          <p className="text-xs text-[#71717a]">{alert.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-[#18181b] line-clamp-2">{alert.description}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-[#e4e4e7] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                alert.riskScore >= 80 ? 'bg-rose-500' :
                                alert.riskScore >= 60 ? 'bg-orange-500' :
                                alert.riskScore >= 40 ? 'bg-amber-500' :
                                'bg-emerald-500'
                              }`}
                              style={{ width: `${alert.riskScore}%` }}
                            />
                          </div>
                          <span className="font-bold text-sm">{alert.riskScore}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getSeverityColor(alert.severity)} capitalize`}>
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(alert.status)} capitalize`}>
                          {alert.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[#71717a]">
                        {new Date(alert.detectedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleViewAlert(alert); }}>
                          <Eye size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Risk Profiles Tab */}
        <TabsContent value="risk">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">High-Risk Customer Profiles</h3>
              <p className="text-xs text-[#71717a] mt-1">Customers with elevated fraud risk scores</p>
            </div>

            <div className="p-6 space-y-4">
              {riskProfiles.map((profile) => (
                <div key={profile.id} className="border border-[#e4e4e7] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-[#18181b]">{profile.entityName}</h4>
                        <Badge className={getRiskColor(profile.riskLevel)}>
                          {profile.riskLevel.toUpperCase()} RISK
                        </Badge>
                        <span className="text-sm text-[#71717a]">Score: <span className="font-bold text-[#18181b]">{profile.riskScore}</span></span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {profile.flags.map((flag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {flag.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-[#71717a]">Total Orders</p>
                      <p className="font-bold text-[#18181b]">{profile.totalOrders}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#71717a]">Total Spent</p>
                      <p className="font-bold text-[#18181b]">₹{profile.totalSpent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#71717a]">Refund Rate</p>
                      <p className="font-bold text-[#18181b]">{profile.refundRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#71717a]">Chargebacks</p>
                      <p className="font-bold text-[#18181b]">{profile.chargebackCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#71717a]">Account Age</p>
                      <p className="font-bold text-[#18181b]">{profile.accountAge} days</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-[#71717a] mb-2">Risk Factors:</p>
                    <div className="space-y-2">
                      {profile.factors.map((factor, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-sm w-48">{factor.name}</span>
                          <div className="flex-1 h-2 bg-[#e4e4e7] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                factor.score >= 80 ? 'bg-rose-500' :
                                factor.score >= 60 ? 'bg-orange-500' :
                                factor.score >= 40 ? 'bg-amber-500' :
                                'bg-emerald-500'
                              }`}
                              style={{ width: `${factor.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold w-12 text-right">{factor.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Blocked Entities Tab */}
        <TabsContent value="blocked">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Blacklist Management</h3>
              <p className="text-xs text-[#71717a] mt-1">{blockedEntities.length} entities currently blocked</p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Blocked By</TableHead>
                    <TableHead>Blocked At</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedEntities.map((entity) => (
                    <TableRow key={entity.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{entity.type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{entity.value}</TableCell>
                      <TableCell className="text-[#71717a]">{entity.reason}</TableCell>
                      <TableCell className="text-sm">{entity.blockedByName}</TableCell>
                      <TableCell className="text-xs text-[#71717a]">
                        {new Date(entity.blockedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {entity.isPermanent ? (
                          <Badge className="bg-rose-500">Permanent</Badge>
                        ) : (
                          <Badge className="bg-amber-500">
                            Until {entity.expiresAt ? new Date(entity.expiresAt).toLocaleDateString() : 'N/A'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnblockEntity(entity.id, entity.value)}
                        >
                          <Unlock size={14} className="mr-1" /> Unblock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Fraud Patterns Tab */}
        <TabsContent value="patterns">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Detected Fraud Patterns</h3>
              <p className="text-xs text-[#71717a] mt-1">Trending fraud behaviors and attack vectors</p>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4">
              {fraudPatterns.map((pattern) => (
                <div key={pattern.id} className="border border-[#e4e4e7] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-[#18181b]">{pattern.name}</h4>
                      <p className="text-xs text-[#71717a] mt-1">{pattern.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(pattern.trend)}
                      <Badge variant="outline" className="capitalize text-xs">{pattern.trend}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-[#71717a]">Occurrences</p>
                      <p className="text-xl font-bold text-[#18181b]">{pattern.occurrences}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#71717a]">Total Loss</p>
                      <p className="text-xl font-bold text-rose-600">₹{pattern.totalLoss.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#71717a]">Prevention Rate</p>
                      <p className="text-xl font-bold text-emerald-600">
                        {pattern.detectedCount ? Math.round((pattern.preventedCount / pattern.detectedCount) * 100) : 0}%
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-[#71717a]">
                    Last detected: {new Date(pattern.lastDetected).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Investigations Tab */}
        <TabsContent value="investigations">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Active Fraud Investigations</h3>
              <p className="text-xs text-[#71717a] mt-1">{investigations.filter(i => i.status !== 'closed').length} open cases</p>
            </div>

            <div className="p-6 space-y-4">
              {investigations.map((inv) => (
                <div key={inv.id} className="border border-[#e4e4e7] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-bold text-[#18181b]">{inv.caseNumber}</h4>
                        <Badge className={
                          inv.priority === 'critical' ? 'bg-rose-500' :
                          inv.priority === 'high' ? 'bg-orange-500' :
                          inv.priority === 'medium' ? 'bg-amber-500' :
                          'bg-blue-500'
                        }>
                          {inv.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="capitalize">{inv.status.replace('_', ' ')}</Badge>
                      </div>
                      <h5 className="text-sm font-medium text-[#18181b]">{inv.title}</h5>
                      <p className="text-xs text-[#71717a] mt-1">Customer: {inv.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#71717a]">Total Loss</p>
                      <p className="text-lg font-bold text-rose-600">₹{inv.totalLoss.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs font-bold text-[#71717a] mb-2">Investigation Timeline:</p>
                    <div className="space-y-2">
                      {(inv.timeline || []).slice(0, 3).map((event) => (
                        <div key={event.id} className="flex items-start gap-3 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#e11d48] mt-1.5" />
                          <div className="flex-1">
                            <p className="text-[#18181b]">
                              <span className="font-medium">{event.action}</span> by {event.performedByName}
                            </p>
                            <p className="text-[#71717a]">{new Date(event.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Eye size={14} className="mr-1" /> View Details
                    </Button>
                    {inv.investigator && (
                      <span className="text-xs text-[#71717a] flex items-center">
                        Assigned to: <span className="font-medium text-[#18181b] ml-1">{inv.investigatorName}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Rules Engine Tab */}
        <TabsContent value="rules">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Fraud Detection Rules</h3>
              <p className="text-xs text-[#71717a] mt-1">{fraudRules.filter(r => r.isActive).length} of {fraudRules.length} rules active</p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Triggered</TableHead>
                    <TableHead>False Positive</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Toggle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fraudRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{rule.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-[#71717a]">{rule.condition}</TableCell>
                      <TableCell className="font-mono font-bold">{rule.threshold}</TableCell>
                      <TableCell>
                        <Badge className={
                          rule.action === 'block' ? 'bg-rose-500' :
                          rule.action === 'alert' ? 'bg-amber-500' :
                          rule.action === 'review' ? 'bg-blue-500' :
                          'bg-emerald-500'
                        }>
                          {rule.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">{rule.triggeredCount}</TableCell>
                      <TableCell>
                        <span className={rule.falsePositiveRate > 20 ? 'text-rose-600 font-bold' : 'text-[#71717a]'}>
                          {rule.falsePositiveRate}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={rule.isActive ? 'bg-emerald-500' : 'bg-gray-500'}>
                          {rule.isActive ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => handleToggleRule(rule.id, rule.name)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Chargebacks Tab */}
        <TabsContent value="chargebacks">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Chargeback Management</h3>
              <p className="text-xs text-[#71717a] mt-1">{chargebacks.filter(c => c.status !== 'won' && c.status !== 'lost').length} pending disputes</p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chargeback ID</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chargebacks.map((cb) => (
                    <TableRow key={cb.id}>
                      <TableCell className="font-mono font-bold text-[#e11d48]">{cb.chargebackId}</TableCell>
                      <TableCell className="font-mono text-sm">{cb.orderId}</TableCell>
                      <TableCell className="text-sm">{cb.customerName}</TableCell>
                      <TableCell className="font-bold">₹{cb.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-[#71717a]">{cb.reason}</TableCell>
                      <TableCell>
                        <Badge className={
                          cb.status === 'won' ? 'bg-emerald-500' :
                          cb.status === 'lost' ? 'bg-rose-500' :
                          cb.status === 'disputed' ? 'bg-purple-500' :
                          cb.status === 'under_review' ? 'bg-blue-500' :
                          'bg-amber-500'
                        }>
                          {cb.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[#71717a]">
                        {new Date(cb.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline">
                          <Eye size={14} className="mr-1" /> Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Session Management Tab */}
        <TabsContent value="security">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Session Management</h3>
              <p className="text-xs text-[#71717a] mt-1">Active login sessions and device access</p>
            </div>
            {sessionsLoading ? (
              <div className="p-8 text-center text-[#71717a]">Loading sessions...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-[#71717a]">
                          No sessions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-[#18181b]">{session.userName}</p>
                              <p className="text-xs text-[#71717a]">{session.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{session.deviceType}</Badge>
                            <p className="text-xs text-[#71717a] mt-1 truncate max-w-[200px]" title={session.device}>
                              {session.device}
                            </p>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{session.ipAddress}</TableCell>
                          <TableCell className="text-xs text-[#71717a]">
                            {new Date(session.lastActivity).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={session.status === 'active' ? 'bg-emerald-500' : 'bg-gray-500'}>
                              {session.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevokeSession(session.id)}
                            >
                              <Unlock size={14} className="mr-1" /> Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Rate Limits Tab */}
        <TabsContent value="rate-limits">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Customer Action Rate Limits</h3>
              <p className="text-xs text-[#71717a] mt-1">Configure maximum allowed actions per customer to prevent abuse</p>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-[#e4e4e7] rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                    <IndianRupee size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#18181b]">Refund Requests</h4>
                    <p className="text-xs text-[#71717a]">Per day, per customer</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={rateLimits.maxRefundRequestsPerDay}
                    onChange={(e) => setRateLimits(prev => ({ ...prev, maxRefundRequestsPerDay: parseInt(e.target.value) || 0 }))}
                    className="w-20 border border-[#e4e4e7] rounded-md px-3 py-2 text-center text-lg font-bold"
                    min={0}
                  />
                  <span className="text-sm text-[#71717a]">max / day</span>
                </div>
              </div>

              <div className="border border-[#e4e4e7] rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                    <XCircle size={20} className="text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#18181b]">Cancellations</h4>
                    <p className="text-xs text-[#71717a]">Per day, per customer</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={rateLimits.maxCancellationsPerDay}
                    onChange={(e) => setRateLimits(prev => ({ ...prev, maxCancellationsPerDay: parseInt(e.target.value) || 0 }))}
                    className="w-20 border border-[#e4e4e7] rounded-md px-3 py-2 text-center text-lg font-bold"
                    min={0}
                  />
                  <span className="text-sm text-[#71717a]">max / day</span>
                </div>
              </div>

              <div className="border border-[#e4e4e7] rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <AlertCircle size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#18181b]">Support Tickets</h4>
                    <p className="text-xs text-[#71717a]">Per hour, per customer</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={rateLimits.maxSupportTicketsPerHour}
                    onChange={(e) => setRateLimits(prev => ({ ...prev, maxSupportTicketsPerHour: parseInt(e.target.value) || 0 }))}
                    className="w-20 border border-[#e4e4e7] rounded-md px-3 py-2 text-center text-lg font-bold"
                    min={0}
                  />
                  <span className="text-sm text-[#71717a]">max / hour</span>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <Button onClick={() => toast.success('Rate limits saved successfully')}>
                <CheckCircle size={14} className="mr-1.5" /> Save Rate Limits
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* View Alert Modal */}
      <Dialog open={viewAlertOpen} onOpenChange={setViewAlertOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Alert Details - {selectedAlert?.alertNumber}</span>
              <Badge className={selectedAlert ? getSeverityColor(selectedAlert.severity) : ''}>
                {selectedAlert?.severity.toUpperCase()}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Detected on {selectedAlert ? new Date(selectedAlert.detectedAt).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              {/* Alert Info */}
              <div className="p-4 bg-[#f4f4f5] rounded-lg">
                <h4 className="font-bold text-[#18181b] mb-2">Alert Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[#71717a]">Type</p>
                    <p className="font-medium capitalize">{selectedAlert.type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-[#71717a]">Risk Score</p>
                    <p className="font-bold text-rose-600">{selectedAlert.riskScore}/100</p>
                  </div>
                  <div>
                    <p className="text-[#71717a]">Customer</p>
                    <p className="font-medium">{selectedAlert.customerName}</p>
                  </div>
                  <div>
                    <p className="text-[#71717a]">Email</p>
                    <p className="font-medium">{selectedAlert.customerEmail}</p>
                  </div>
                  {selectedAlert.amountInvolved && (
                    <div>
                      <p className="text-[#71717a]">Amount Involved</p>
                      <p className="font-bold text-rose-600">₹{selectedAlert.amountInvolved.toLocaleString()}</p>
                    </div>
                  )}
                  {selectedAlert.deviceId && (
                    <div>
                      <p className="text-[#71717a]">Device ID</p>
                      <p className="font-mono text-xs">{selectedAlert.deviceId}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-bold text-[#18181b] mb-2">Description</h4>
                <p className="text-[#71717a]">{selectedAlert.description}</p>
              </div>

              {/* Evidence */}
              <div>
                <h4 className="font-bold text-[#18181b] mb-3">Evidence</h4>
                <div className="space-y-2">
                  {selectedAlert.evidence.map((ev) => (
                    <div key={ev.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="capitalize text-xs">{ev.type}</Badge>
                        <span className="text-xs text-[#71717a]">{new Date(ev.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-[#18181b]">{ev.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Actions */}
              {selectedAlert.actions.length > 0 && (
                <div>
                  <h4 className="font-bold text-[#18181b] mb-2">Suggested Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAlert.actions.map((action, idx) => (
                      <Badge key={idx} variant="outline">{action}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={() => handleResolveAlert(selectedAlert.id)} className="flex-1">
                  <CheckCircle size={14} className="mr-1.5" /> Resolve Alert
                </Button>
                <Button variant="outline" onClick={() => selectedAlert && handleBlockCustomer(selectedAlert)}>
                  <Ban size={14} className="mr-1.5" /> Block Customer
                </Button>
                {selectedAlert?.deviceId && (
                  <Button variant="outline" onClick={() => selectedAlert && handleBlockDevice(selectedAlert)}>
                    <Ban size={14} className="mr-1.5" /> Block Device
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
