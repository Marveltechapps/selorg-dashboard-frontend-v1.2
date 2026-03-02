import React, { useState, useEffect, useCallback } from 'react';
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

export function ProductionAlerts() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'incidents' | 'history'>('alerts');
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<ProductionAlert | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [alerts, setAlerts] = useState<ProductionAlert[]>([]);
  const [incidents, setIncidents] = useState<ProductionIncident[]>([]);
  const [summary, setSummary] = useState({ criticalCount: 0, warningCount: 0, activeAlertsCount: 0, openIncidentsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      setError(null);
      const status = activeTab === 'alerts' ? 'active' : activeTab === 'history' ? 'history' : undefined;
      const res = await fetchProductionAlerts({
        status,
        severity: filterSeverity === 'all' ? undefined : filterSeverity,
        category: filterCategory === 'all' ? undefined : filterCategory,
        search: searchTerm || undefined,
      });
      setAlerts(res.alerts ?? []);
      setSummary(prev => ({
        ...prev,
        criticalCount: res.summary?.criticalCount ?? 0,
        warningCount: res.summary?.warningCount ?? 0,
        activeAlertsCount: res.summary?.activeAlertsCount ?? 0,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterSeverity, filterCategory, searchTerm]);

  const loadIncidents = useCallback(async () => {
    try {
      const res = await fetchProductionIncidents();
      setIncidents(res.incidents ?? []);
      setSummary(prev => ({ ...prev, openIncidentsCount: res.openIncidentsCount ?? 0 }));
    } catch (e) {
      setIncidents([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      await loadAlerts(); // always load alerts for summary + alerts/history tabs
      if (activeTab === 'incidents') await loadIncidents();
    };
    load().finally(() => setLoading(false));
  }, [activeTab, loadAlerts, loadIncidents]);

  const refreshAll = useCallback(() => {
    setLoading(true);
    Promise.all([loadAlerts(), loadIncidents()]).finally(() => setLoading(false));
  }, [loadAlerts, loadIncidents]);

  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium' as const,
    category: '',
    location: '',
    reportedBy: '',
  });

  const reportIncident = async () => {
    if (!newIncident.title || !newIncident.description || !newIncident.reportedBy) return;
    try {
      await createProductionIncident({
        title: newIncident.title,
        description: newIncident.description,
        severity: newIncident.severity,
        category: newIncident.category || undefined,
        reportedBy: newIncident.reportedBy,
        location: newIncident.location || undefined,
      });
      setNewIncident({ title: '', description: '', severity: 'medium', category: '', location: '', reportedBy: '' });
      setShowIncidentModal(false);
      toast.success('Incident reported successfully');
      refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to report incident');
    }
  };

  const updateAlertStatus = async (id: string, newStatus: ProductionAlert['status'], assignee?: string) => {
    try {
      const actionType = newStatus === 'resolved' ? 'resolved' : newStatus === 'dismissed' ? 'dismissed' : 'acknowledge';
      const asn = assignee ?? (newStatus === 'acknowledged' ? prompt('Assign to (enter name):') : undefined);
      await updateProductionAlertStatus(id, actionType, asn || undefined);
      toast.success(`Alert ${newStatus}`);
      refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update alert');
    }
  };

  const updateIncidentStatus = async (id: string, newStatus: ProductionIncident['status']) => {
    try {
      await updateProductionIncidentStatus(id, newStatus);
      toast.success(`Incident ${newStatus}`);
      refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update incident');
    }
  };

  const deleteAlert = async (id: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;
    try {
      await deleteProductionAlert(id);
      toast.success('Alert deleted');
      refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete alert');
    }
  };

  const dispatchMaintenance = async (alertId: string) => {
    const assignee = prompt('Assign maintenance to (enter name):');
    if (!assignee) return;
    try {
      await updateProductionAlertStatus(alertId, 'dispatch', assignee);
      toast.success(`Maintenance dispatched to ${assignee}`);
      refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to dispatch');
    }
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
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         a.description.toLowerCase().includes(searchTerm.toLowerCase());
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
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          {error}
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
                    {alert.status === 'active' && alert.severity === 'critical' && (
                      <button 
                        onClick={() => dispatchMaintenance(alert.id)}
                        className={`px-3 py-1.5 text-white text-xs font-bold rounded ${
                          alert.severity === 'critical' ? 'bg-[#EF4444] hover:bg-[#DC2626]' :
                          'bg-[#F59E0B] hover:bg-[#D97706]'
                        }`}
                      >
                        Dispatch Maintenance
                      </button>
                    )}
                    {alert.status === 'active' && (
                      <button 
                        onClick={() => updateAlertStatus(alert.id, 'acknowledged')}
                        className={`px-3 py-1.5 bg-white border text-xs font-bold rounded ${
                          alert.severity === 'critical' ? 'border-red-200 text-[#991B1B] hover:bg-red-50' :
                          alert.severity === 'warning' ? 'border-yellow-200 text-[#92400E] hover:bg-yellow-50' :
                          'border-blue-200 text-[#1E40AF] hover:bg-blue-50'
                        }`}
                      >
                        Acknowledge
                      </button>
                    )}
                    {alert.status === 'acknowledged' && (
                      <button 
                        onClick={() => updateAlertStatus(alert.id, 'resolved')}
                        className="px-3 py-1.5 bg-[#16A34A] text-white text-xs font-bold rounded hover:bg-[#15803D]"
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
                    <button 
                      onClick={() => updateAlertStatus(alert.id, 'dismissed')}
                      className="px-3 py-1.5 bg-white border border-[#E0E0E0] text-[#757575] text-xs font-bold rounded hover:bg-[#F5F5F5]"
                    >
                      Dismiss
                    </button>
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
              onClick={() => setShowIncidentModal(true)}
              className="px-4 py-2 bg-[#EF4444] text-white font-medium rounded-lg hover:bg-[#DC2626]"
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
              incidents.map(incident => (
                <tr key={incident.id} className="hover:bg-[#FAFAFA]">
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
                      {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {incident.status === 'open' && (
                        <button 
                          onClick={() => updateIncidentStatus(incident.id, 'investigating')}
                          className="text-[#F59E0B] hover:text-[#D97706] font-medium text-xs"
                        >
                          Investigate
                        </button>
                      )}
                      {incident.status === 'investigating' && (
                        <button 
                          onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                          className="text-[#16A34A] hover:text-[#15803D] font-medium text-xs"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
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
                      {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#616161]">{alert.resolvedBy || 'N/A'}</td>
                  <td className="px-6 py-4 text-[#616161]">
                    {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => deleteAlert(alert.id)}
                      className="text-[#EF4444] hover:text-[#DC2626] font-medium text-xs"
                    >
                      Delete
                    </button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
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
                onClick={reportIncident}
                className="px-4 py-2 bg-[#EF4444] text-white font-medium rounded-lg hover:bg-[#DC2626]"
              >
                Report Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
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