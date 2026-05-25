import React, { useState } from 'react';
import { stopModalPointerPropagation } from "@/components/ui/modalOverlayGuards";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  AlertTriangle, 
  Bell, 
  X, 
  CheckCircle, 
  Info,
  AlertCircle,
  Search,
  Loader2
} from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import {
  fetchProductionAlerts,
  updateProductionAlertStatus,
  deleteProductionAlert,
  fetchProductionIncidents,
  createProductionIncident,
  updateProductionIncidentStatus,
  type ProductionAlert,
  type ProductionIncident,
} from '../../../api/productionApi';
import { useProductionFactory } from '../../../contexts/ProductionFactoryContext';

function resolveIncidentId(incident: ProductionIncident): string {
  return (incident.id || '').trim();
}

function formatLoadError(err: unknown): string {
  if (err instanceof Error) {
    if (/failed to fetch|network|load failed/i.test(err.message)) {
      return 'Cannot reach the API. Start the backend (port 3333) and refresh this page.';
    }
    return err.message;
  }
  return 'Failed to load alerts';
}

function formatStatusLabel(status: string | undefined): string {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function ProductionAlerts() {
  const queryClient = useQueryClient();
  const { selectedFactoryId, loading: factoriesLoading, error: factoriesError, refreshFactories } =
    useProductionFactory();
  const [activeTab, setActiveTab] = useState<'alerts' | 'incidents' | 'history'>('alerts');
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<ProductionAlert | null>(null);
  const [alertToDelete, setAlertToDelete] = useState<ProductionAlert | null>(null);
  const [assigneeModal, setAssigneeModal] = useState<{
    alertId: string;
    action: 'acknowledge' | 'dispatch';
    name: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const alertStatus = activeTab === 'alerts' ? 'active' : activeTab === 'history' ? 'history' : undefined;

  const {
    data: alertsData,
    isLoading: loadingAlerts,
    isFetching: fetchingAlerts,
    error: alertsError,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: [
      'production',
      'alerts',
      selectedFactoryId,
      alertStatus,
      filterSeverity,
      filterCategory,
      searchTerm,
    ],
    queryFn: () =>
      fetchProductionAlerts({
        status: alertStatus,
        severity: filterSeverity === 'all' ? undefined : filterSeverity,
        category: filterCategory === 'all' ? undefined : filterCategory,
        search: searchTerm || undefined,
        factoryId: selectedFactoryId || undefined,
      }),
    enabled: !!selectedFactoryId,
  });

  const {
    data: incidentsData,
    isLoading: loadingIncidents,
    isFetching: fetchingIncidents,
    error: incidentsError,
    refetch: refetchIncidents,
  } = useQuery({
    queryKey: ['production', 'incidents', selectedFactoryId],
    queryFn: () => fetchProductionIncidents({ factoryId: selectedFactoryId || undefined }),
    enabled: !!selectedFactoryId,
  });

  const alerts = alertsData?.alerts ?? [];
  const incidents = incidentsData?.incidents ?? [];
  const summary = {
    criticalCount: alertsData?.summary?.criticalCount ?? 0,
    warningCount: alertsData?.summary?.warningCount ?? 0,
    activeAlertsCount: alertsData?.summary?.activeAlertsCount ?? 0,
    openIncidentsCount: incidentsData?.openIncidentsCount ?? 0,
  };
  const loading =
    factoriesLoading ||
    (activeTab === 'incidents'
      ? loadingIncidents || fetchingIncidents
      : loadingAlerts || fetchingAlerts);
  const alertsLoadError = alertsError ? formatLoadError(alertsError) : null;
  const incidentsLoadError = incidentsError ? formatLoadError(incidentsError) : null;
  const displayError =
    factoriesError || (activeTab === 'incidents' ? incidentsLoadError : alertsLoadError);

  const invalidateAlerts = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['production', 'alerts', selectedFactoryId] }),
      queryClient.invalidateQueries({ queryKey: ['production', 'incidents', selectedFactoryId] }),
    ]);
  };

  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium' as const,
    category: '',
    location: '',
    reportedBy: '',
  });

  const createIncidentMutation = useMutation({
    mutationFn: () => {
      if (!selectedFactoryId) throw new Error('Select a factory first');
      if (!newIncident.title || !newIncident.description || !newIncident.reportedBy) {
        throw new Error('Title, description, and reported by are required');
      }
      return createProductionIncident(
        {
          title: newIncident.title,
          description: newIncident.description,
          severity: newIncident.severity,
          category: newIncident.category || undefined,
          reportedBy: newIncident.reportedBy,
          location: newIncident.location || undefined,
        },
        selectedFactoryId
      );
    },
    onSuccess: async () => {
      await invalidateAlerts();
      setNewIncident({ title: '', description: '', severity: 'medium', category: '', location: '', reportedBy: '' });
      setShowIncidentModal(false);
      toast.success('Incident reported successfully');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to report incident'),
  });

  const updateAlertMutation = useMutation({
    mutationFn: ({
      alertId,
      actionType,
      assignee,
    }: {
      alertId: string;
      actionType: 'acknowledge' | 'resolved' | 'dismissed' | 'dispatch';
      assignee?: string;
    }) => {
      if (!selectedFactoryId) throw new Error('Select a factory first');
      if (!alertId) throw new Error('Invalid alert id');
      return updateProductionAlertStatus(alertId, actionType, assignee, selectedFactoryId);
    },
    onSuccess: async (_, vars) => {
      await invalidateAlerts();
      setAssigneeModal(null);
      if (vars.actionType === 'resolved') toast.success('Alert resolved');
      else if (vars.actionType === 'dismissed') toast.success('Alert dismissed');
      else if (vars.actionType === 'dispatch') toast.success('Maintenance dispatched');
      else toast.success('Alert acknowledged');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update alert'),
  });

  const updateIncidentMutation = useMutation({
    mutationFn: ({
      incidentId,
      status,
    }: {
      incidentId: string;
      status: ProductionIncident['status'];
    }) => {
      if (!selectedFactoryId) throw new Error('Select a factory first');
      if (!incidentId) throw new Error('Invalid incident id');
      return updateProductionIncidentStatus(incidentId, status, selectedFactoryId);
    },
    onSuccess: async (_, vars) => {
      await invalidateAlerts();
      if (vars.status === 'investigating') toast.success('Incident marked as investigating');
      else if (vars.status === 'resolved') toast.success('Incident resolved');
      else toast.success('Incident updated');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update incident'),
  });

  const deleteAlertMutation = useMutation({
    mutationFn: (alertId: string) => {
      if (!selectedFactoryId) throw new Error('Select a factory first');
      if (!alertId) throw new Error('Invalid alert id');
      return deleteProductionAlert(alertId, selectedFactoryId);
    },
    onSuccess: async (_data, alertId) => {
      await invalidateAlerts();
      setAlertToDelete(null);
      setShowDetailsModal((prev) => (prev?.id === alertId ? null : prev));
      toast.success('Alert deleted');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to delete alert'),
  });

  const handleUpdateAlertStatus = (alert: ProductionAlert, newStatus: ProductionAlert['status']) => {
    if (!selectedFactoryId) {
      toast.error('Select a factory first');
      return;
    }
    const alertId = alert.id?.trim();
    if (!alertId) {
      toast.error('Invalid alert id');
      return;
    }
    if (newStatus === 'acknowledged') {
      setAssigneeModal({ alertId, action: 'acknowledge', name: alert.assignedTo || '' });
      return;
    }
    const actionType =
      newStatus === 'resolved' ? 'resolved' : newStatus === 'dismissed' ? 'dismissed' : 'acknowledge';
    updateAlertMutation.mutate({ alertId, actionType });
  };

  const submitAssignee = () => {
    if (!assigneeModal) return;
    const name = assigneeModal.name.trim();
    if (!name) {
      toast.error('Enter assignee name');
      return;
    }
    updateAlertMutation.mutate({
      alertId: assigneeModal.alertId,
      actionType: assigneeModal.action,
      assignee: name,
    });
  };

  const handleDispatchMaintenance = (alert: ProductionAlert) => {
    if (!selectedFactoryId) {
      toast.error('Select a factory first');
      return;
    }
    const alertId = alert.id?.trim();
    if (!alertId) {
      toast.error('Invalid alert id');
      return;
    }
    setAssigneeModal({ alertId, action: 'dispatch', name: alert.assignedTo || '' });
  };

  const handleUpdateIncidentStatus = (incident: ProductionIncident, status: ProductionIncident['status']) => {
    const incidentId = resolveIncidentId(incident);
    if (!selectedFactoryId) {
      toast.error('Select a factory first');
      return;
    }
    if (!incidentId) {
      toast.error('Invalid incident id');
      return;
    }
    updateIncidentMutation.mutate({ incidentId, status });
  };

  const exportData = () => {
    const today = new Date().toISOString().split('T')[0];
    let csvData: any[] = [];

    if (activeTab === 'alerts') {
      csvData = [
        ['Production Alerts Report', `Date: ${today}`],
        [''],
        ['Title', 'Severity', 'Category', 'Status', 'Location', 'Timestamp', 'Assigned To', 'Resolved By'],
        ...filteredAlerts.map(a => [
          a.title,
          a.severity,
          a.category,
          a.status,
          a.location || 'N/A',
          new Date(a.timestamp).toLocaleString(),
          a.assignedTo || 'N/A',
          a.resolvedBy || 'N/A'
        ]),
      ];
    } else if (activeTab === 'incidents') {
      csvData = [
        ['Incidents Report', `Date: ${today}`],
        [''],
        ['Title', 'Severity', 'Category', 'Status', 'Location', 'Reported By', 'Timestamp'],
        ...incidents.map(i => [
          i.title,
          i.severity,
          i.category,
          i.status,
          i.location,
          i.reportedBy,
          new Date(i.timestamp).toLocaleString()
        ]),
      ];
    } else {
      const resolvedAlerts = alerts.filter(a => a.status === 'resolved' || a.status === 'dismissed');
      csvData = [
        ['Alert History Report', `Date: ${today}`],
        [''],
        ['Title', 'Severity', 'Category', 'Status', 'Resolved By', 'Resolved At'],
        ...resolvedAlerts.map(a => [
          a.title,
          a.severity,
          a.category,
          a.status,
          a.resolvedBy || 'N/A',
          a.resolvedAt ? new Date(a.resolvedAt).toLocaleString() : 'N/A'
        ]),
      ];
    }
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-${activeTab}-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = now - then;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const filteredAlerts = alerts.filter(a => {
    const q = searchTerm.toLowerCase();
    const title = (a.title ?? '').toLowerCase();
    const description = (a.description ?? '').toLowerCase();
    const matchesSearch = !q || title.includes(q) || description.includes(q);
    const matchesSeverity = filterSeverity === 'all' || a.severity === filterSeverity;
    const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
    
    if (activeTab === 'alerts') {
      return matchesSearch && matchesSeverity && matchesCategory && (a.status === 'active' || a.status === 'acknowledged');
    } else if (activeTab === 'history') {
      return matchesSearch && matchesSeverity && matchesCategory && (a.status === 'resolved' || a.status === 'dismissed');
    }
    return matchesSearch && matchesSeverity && matchesCategory;
  });

  const criticalCount = summary.criticalCount;
  const warningCount = summary.warningCount;
  const activeAlertsCount = summary.activeAlertsCount;
  const openIncidentsCount = summary.openIncidentsCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Alerts"
        subtitle="Real-time notifications and critical issues"
      />
      {factoriesLoading && (
        <div className="flex items-center gap-2 text-sm text-[#757575] py-2">
          <Loader2 className="animate-spin text-[#16A34A]" size={18} />
          Loading factories…
        </div>
      )}
      {!factoriesLoading && !selectedFactoryId && !factoriesError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900 text-sm">
          Select a factory to view and manage alerts and incidents.
        </div>
      )}
      {displayError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm flex flex-wrap items-center justify-between gap-3">
          <span>{displayError}</span>
          <button
            type="button"
            onClick={() => {
              if (factoriesError) {
                void refreshFactories();
                return;
              }
              if (activeTab === 'incidents') void refetchIncidents();
              else void refetchAlerts();
            }}
            className="px-3 py-1.5 bg-white border border-red-200 text-red-800 text-xs font-bold rounded hover:bg-red-50 shrink-0"
          >
            Retry
          </button>
        </div>
      )}
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-[#EF4444]" />
            <span className="text-xs text-[#757575] uppercase font-bold">Critical Alerts</span>
          </div>
          <p className="text-2xl font-bold text-[#EF4444]">{criticalCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-[#F59E0B]" />
            <span className="text-xs text-[#757575] uppercase font-bold">Warnings</span>
          </div>
          <p className="text-2xl font-bold text-[#F59E0B]">{warningCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={16} className="text-[#3B82F6]" />
            <span className="text-xs text-[#757575] uppercase font-bold">Active Alerts</span>
          </div>
          <p className="text-2xl font-bold text-[#3B82F6]">{activeAlertsCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Info size={16} className="text-[#EF4444]" />
            <span className="text-xs text-[#757575] uppercase font-bold">Open Incidents</span>
          </div>
          <p className="text-2xl font-bold text-[#212121]">{openIncidentsCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E0E0E0] items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'alerts'
                ? 'border-[#16A34A] text-[#16A34A]'
                : 'border-transparent text-[#757575] hover:text-[#212121]'
            }`}
          >
            Active Alerts ({alerts.filter(a => a.status === 'active' || a.status === 'acknowledged').length})
          </button>
          <button
            onClick={() => setActiveTab('incidents')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'incidents'
                ? 'border-[#16A34A] text-[#16A34A]'
                : 'border-transparent text-[#757575] hover:text-[#212121]'
            }`}
          >
            Incidents ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-[#16A34A] text-[#16A34A]'
                : 'border-transparent text-[#757575] hover:text-[#212121]'
            }`}
          >
            History
          </button>
        </div>
        <div className="flex gap-2 items-center pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 pr-4 rounded-lg bg-[#F5F5F5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#16A34A] focus:border-transparent transition-all w-48"
            />
          </div>
          {activeTab !== 'incidents' && (
            <>
              <select 
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="h-9 px-3 rounded-lg bg-[#F5F5F5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#16A34A]"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-9 px-3 rounded-lg bg-[#F5F5F5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#16A34A]"
              >
                <option value="all">All Categories</option>
                <option value="equipment">Equipment</option>
                <option value="material">Material</option>
                <option value="quality">Quality</option>
                <option value="safety">Safety</option>
                <option value="shift">Shift</option>
                <option value="production">Production</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Active Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-[#16A34A]" size={32} />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-[#E0E0E0] text-center">
              <CheckCircle size={48} className="text-[#16A34A] mx-auto mb-4" />
              <h3 className="font-bold text-lg text-[#212121] mb-2">No Active Alerts</h3>
              <p className="text-[#757575] text-sm">All systems operating normally</p>
            </div>
          ) : (
            filteredAlerts.map(alert => (
              <div 
                key={alert.id}
                className={`p-4 rounded-xl flex gap-4 items-start border ${
                  alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                  alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}
              >
                <div className={`p-2 bg-white rounded-full shadow-sm ${
                  alert.severity === 'critical' ? 'text-[#EF4444]' :
                  alert.severity === 'warning' ? 'text-[#F59E0B]' :
                  'text-[#3B82F6]'
                }`}>
                  {alert.severity === 'critical' ? <AlertTriangle size={24} /> :
                   alert.severity === 'warning' ? <AlertCircle size={24} /> :
                   <Info size={24} />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-bold ${
                      alert.severity === 'critical' ? 'text-[#991B1B]' :
                      alert.severity === 'warning' ? 'text-[#92400E]' :
                      'text-[#1E40AF]'
                    }`}>
                      {alert.title}
                    </h3>
                    <span className={`text-xs font-bold ${
                      alert.severity === 'critical' ? 'text-[#991B1B]' :
                      alert.severity === 'warning' ? 'text-[#92400E]' :
                      'text-[#1E40AF]'
                    }`}>
                      {getTimeAgo(alert.timestamp)}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${
                    alert.severity === 'critical' ? 'text-[#7F1D1D]' :
                    alert.severity === 'warning' ? 'text-[#92400E]' :
                    'text-[#1E3A8A]'
                  }`}>
                    {alert.description}
                  </p>
                  {alert.location && (
                    <p className="text-xs mt-1 font-medium text-[#757575]">📍 {alert.location}</p>
                  )}
                  {alert.status === 'acknowledged' && alert.assignedTo && (
                    <p className="text-xs mt-1 font-medium text-[#16A34A]">✓ Assigned to {alert.assignedTo}</p>
                  )}
                  <div className="flex gap-3 mt-3">
                    {alert.status === 'active' && alert.severity === 'critical' && alert.id && (
                      <button
                        type="button"
                        onClick={() => handleDispatchMaintenance(alert)}
                        disabled={updateAlertMutation.isPending || !selectedFactoryId}
                        className={`px-3 py-1.5 text-white text-xs font-bold rounded disabled:opacity-50 ${
                          alert.severity === 'critical' ? 'bg-[#EF4444] hover:bg-[#DC2626]' :
                          'bg-[#F59E0B] hover:bg-[#D97706]'
                        }`}
                      >
                        Dispatch Maintenance
                      </button>
                    )}
                    {alert.status === 'active' && alert.id && (
                      <button
                        type="button"
                        onClick={() => handleUpdateAlertStatus(alert, 'acknowledged')}
                        disabled={updateAlertMutation.isPending || !selectedFactoryId}
                        className={`px-3 py-1.5 bg-white border text-xs font-bold rounded disabled:opacity-50 ${
                          alert.severity === 'critical' ? 'border-red-200 text-[#991B1B] hover:bg-red-50' :
                          alert.severity === 'warning' ? 'border-yellow-200 text-[#92400E] hover:bg-yellow-50' :
                          'border-blue-200 text-[#1E40AF] hover:bg-blue-50'
                        }`}
                      >
                        Acknowledge
                      </button>
                    )}
                    {alert.status === 'acknowledged' && alert.id && (
                      <button
                        type="button"
                        onClick={() => handleUpdateAlertStatus(alert, 'resolved')}
                        disabled={updateAlertMutation.isPending || !selectedFactoryId}
                        className="px-3 py-1.5 bg-[#16A34A] text-white text-xs font-bold rounded hover:bg-[#15803D] disabled:opacity-50"
                      >
                        Mark Resolved
                      </button>
                    )}
                    <button 
                      onClick={() => setShowDetailsModal(alert)}
                      className={`px-3 py-1.5 bg-white border text-xs font-bold rounded ${
                        alert.severity === 'critical' ? 'border-red-200 text-[#991B1B] hover:bg-red-50' :
                        alert.severity === 'warning' ? 'border-yellow-200 text-[#92400E] hover:bg-yellow-50' :
                        'border-blue-200 text-[#1E40AF] hover:bg-blue-50'
                      }`}
                    >
                      View Details
                    </button>
                    {alert.id && (
                      <button
                        type="button"
                        onClick={() => handleUpdateAlertStatus(alert, 'dismissed')}
                        disabled={updateAlertMutation.isPending || !selectedFactoryId}
                        className="px-3 py-1.5 bg-white border border-[#E0E0E0] text-[#757575] text-xs font-bold rounded hover:bg-[#F5F5F5] disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Incidents Tab */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowIncidentModal(true)}
              disabled={!selectedFactoryId || createIncidentMutation.isPending}
              className="px-4 py-2 bg-[#EF4444] text-white font-medium rounded-lg hover:bg-[#DC2626] disabled:opacity-50"
            >
              Report Incident
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-[#16A34A]" size={32} />
            </div>
          ) : (
        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3">Incident</th>
                <th className="px-6 py-3">Severity</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Reported By</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#757575]">
                    No incidents yet.
                  </td>
                </tr>
              ) : (
              incidents.map(incident => {
                const incidentId = resolveIncidentId(incident);
                return (
                <tr key={incidentId || incident.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-[#212121]">{incident.title}</p>
                      <p className="text-xs text-[#757575] mt-1">{incident.description}</p>
                      <p className="text-xs text-[#9CA3AF] mt-1">{getTimeAgo(incident.timestamp)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-bold text-xs uppercase ${
                      incident.severity === 'critical' ? 'text-[#DC2626]' :
                      incident.severity === 'high' ? 'text-[#EF4444]' :
                      incident.severity === 'medium' ? 'text-[#F59E0B]' :
                      'text-[#6B7280]'
                    }`}>
                      {incident.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#616161]">{incident.category}</td>
                  <td className="px-6 py-4 text-[#616161]">{incident.location}</td>
                  <td className="px-6 py-4 text-[#616161]">{incident.reportedBy}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      incident.status === 'resolved' ? 'bg-[#DCFCE7] text-[#166534]' :
                      incident.status === 'investigating' ? 'bg-[#FEF9C3] text-[#854D0E]' :
                      'bg-[#FEE2E2] text-[#991B1B]'
                    }`}>
                      {formatStatusLabel(incident.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {incident.status === 'open' && incidentId && (
                        <button
                          type="button"
                          onClick={() => handleUpdateIncidentStatus(incident, 'investigating')}
                          disabled={updateIncidentMutation.isPending || !selectedFactoryId}
                          className="text-[#F59E0B] hover:text-[#D97706] font-medium text-xs disabled:opacity-50"
                        >
                          Investigate
                        </button>
                      )}
                      {incident.status === 'investigating' && incidentId && (
                        <button
                          type="button"
                          onClick={() => handleUpdateIncidentStatus(incident, 'resolved')}
                          disabled={updateIncidentMutation.isPending || !selectedFactoryId}
                          className="text-[#16A34A] hover:text-[#15803D] font-medium text-xs disabled:opacity-50"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
              })
              )}
            </tbody>
          </table>
        </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-[#16A34A]" size={32} />
            </div>
          ) : (
        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3">Alert</th>
                <th className="px-6 py-3">Severity</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Resolved By</th>
                <th className="px-6 py-3">Resolved At</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#757575]">
                    No records
                  </td>
                </tr>
              ) : (
              filteredAlerts.map(alert => (
                <tr key={alert.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-[#212121]">{alert.title}</p>
                      <p className="text-xs text-[#757575] mt-1">{alert.description}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-bold text-xs uppercase ${
                      alert.severity === 'critical' ? 'text-[#DC2626]' :
                      alert.severity === 'warning' ? 'text-[#F59E0B]' :
                      'text-[#6B7280]'
                    }`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#616161] capitalize">{alert.category}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      alert.status === 'resolved' ? 'bg-[#DCFCE7] text-[#166534]' :
                      'bg-[#F3F4F6] text-[#6B7280]'
                    }`}>
                      {formatStatusLabel(alert.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#616161]">{alert.resolvedBy || 'N/A'}</td>
                  <td className="px-6 py-4 text-[#616161]">
                    {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {alert.id && (
                      <button
                        type="button"
                        onClick={() => setAlertToDelete(alert)}
                        disabled={!selectedFactoryId}
                        className="text-[#EF4444] hover:text-[#DC2626] font-medium text-xs disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
          )}
        </div>
      )}

      {/* Report Incident Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" {...stopModalPointerPropagation}>
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Report Incident</h3>
              <button onClick={() => setShowIncidentModal(false)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Incident Title</label>
                <input 
                  type="text"
                  placeholder="Brief description of the incident"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({...newIncident, title: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Description</label>
                <textarea 
                  placeholder="Detailed description of what happened..."
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({...newIncident, description: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] resize-none"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Severity</label>
                  <select 
                    value={newIncident.severity}
                    onChange={(e) => setNewIncident({...newIncident, severity: e.target.value as any})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Category</label>
                  <input 
                    type="text"
                    placeholder="e.g., Safety, Equipment"
                    value={newIncident.category}
                    onChange={(e) => setNewIncident({...newIncident, category: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Location</label>
                  <input 
                    type="text"
                    placeholder="Where did this occur?"
                    value={newIncident.location}
                    onChange={(e) => setNewIncident({...newIncident, location: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Reported By</label>
                  <input 
                    type="text"
                    placeholder="Your name"
                    value={newIncident.reportedBy}
                    onChange={(e) => setNewIncident({...newIncident, reportedBy: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowIncidentModal(false)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createIncidentMutation.mutate()}
                disabled={createIncidentMutation.isPending || !selectedFactoryId}
                className="px-4 py-2 bg-[#EF4444] text-white font-medium rounded-lg hover:bg-[#DC2626] disabled:opacity-50"
              >
                Report Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Alert Confirmation */}
      {alertToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" {...stopModalPointerPropagation}>
            <h3 className="font-bold text-lg text-[#212121] mb-2">Delete alert?</h3>
            <p className="text-sm text-[#757575] mb-6">
              Permanently remove{' '}
              <span className="font-medium text-[#212121]">{alertToDelete.title}</span> from alert
              history? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setAlertToDelete(null)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteAlertMutation.mutate(alertToDelete.id)}
                disabled={deleteAlertMutation.isPending}
                className="px-4 py-2 bg-[#EF4444] text-white font-medium rounded-lg hover:bg-[#DC2626] disabled:opacity-50 flex items-center gap-2"
              >
                {deleteAlertMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignee Modal */}
      {assigneeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" {...stopModalPointerPropagation}>
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">
                {assigneeModal.action === 'dispatch' ? 'Dispatch Maintenance' : 'Assign Alert'}
              </h3>
              <button
                type="button"
                onClick={() => setAssigneeModal(null)}
                className="text-[#757575] hover:text-[#212121]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-[#212121] mb-2">Assignee name</label>
              <input
                type="text"
                value={assigneeModal.name}
                onChange={(e) => setAssigneeModal({ ...assigneeModal, name: e.target.value })}
                placeholder="Technician or team member"
                className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
              />
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setAssigneeModal(null)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAssignee}
                disabled={updateAlertMutation.isPending}
                className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" {...stopModalPointerPropagation}>
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Alert Details</h3>
              <button onClick={() => setShowDetailsModal(null)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <span className="text-xs text-[#757575]">Title</span>
                <p className="font-bold text-[#212121]">{showDetailsModal.title}</p>
              </div>
              <div>
                <span className="text-xs text-[#757575]">Description</span>
                <p className="text-sm text-[#212121]">{showDetailsModal.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-[#757575]">Severity</span>
                  <p className="font-bold text-[#212121] capitalize">{showDetailsModal.severity}</p>
                </div>
                <div>
                  <span className="text-xs text-[#757575]">Category</span>
                  <p className="font-bold text-[#212121] capitalize">{showDetailsModal.category}</p>
                </div>
                <div>
                  <span className="text-xs text-[#757575]">Status</span>
                  <p className="font-bold text-[#212121] capitalize">{showDetailsModal.status}</p>
                </div>
                <div>
                  <span className="text-xs text-[#757575]">Time</span>
                  <p className="font-bold text-[#212121]">{getTimeAgo(showDetailsModal.timestamp)}</p>
                </div>
              </div>
              {showDetailsModal.location && (
                <div>
                  <span className="text-xs text-[#757575]">Location</span>
                  <p className="font-bold text-[#212121]">{showDetailsModal.location}</p>
                </div>
              )}
              {showDetailsModal.assignedTo && (
                <div>
                  <span className="text-xs text-[#757575]">Assigned To</span>
                  <p className="font-bold text-[#16A34A]">{showDetailsModal.assignedTo}</p>
                </div>
              )}
              {showDetailsModal.resolvedBy && (
                <div>
                  <span className="text-xs text-[#757575]">Resolved By</span>
                  <p className="font-bold text-[#16A34A]">{showDetailsModal.resolvedBy}</p>
                </div>
              )}
              {showDetailsModal.resolvedAt && (
                <div>
                  <span className="text-xs text-[#757575]">Resolved At</span>
                  <p className="font-bold text-[#212121]">{new Date(showDetailsModal.resolvedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}