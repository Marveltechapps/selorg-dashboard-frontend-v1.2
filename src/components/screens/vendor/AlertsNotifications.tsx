import React, { useState } from 'react';
import {
  Bell,
  AlertCircle,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  X,
  Eye,
  Download,
  Printer,
  Send,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Settings,
  Mail,
  MessageSquare,
  Smartphone,
  Volume2,
  Moon
} from 'lucide-react';
import { toast } from 'sonner';
import { exportToCSV } from '../../../utils/csvExport';
import { exportToPDF } from '../../../utils/pdfExport';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import * as vendorInventoryApi from '../../../api/vendor/vendorInventory.api';

// Types
type AlertSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Resolved';
type AlertStatus = 'Open' | 'Acknowledged' | 'Resolved';

interface Alert {
  id: string;
  severity: AlertSeverity;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  timeAgo: string;
  status: AlertStatus;
  isRead: boolean;
  vendor?: string;
  batchId?: string;
  shipmentId?: string;
  poId?: string;
  impact?: string;
}

export function AlertsNotifications() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingAlerts(true);
        const resp = await vendorInventoryApi.getGlobalAlerts();
        if (!mounted) return;
        const items = resp.items || resp;
        setAlerts(Array.isArray(items) ? items : (items.items || []));
      } catch (err) {
        console.error('Failed to load alerts', err);
        if (mounted) {
          setAlerts([]);
          toast.error('Failed to load alerts');
        }
      } finally {
        setLoadingAlerts(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const downloadAlertReport = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      const csvData: (string | number)[][] = [
        ['Alerts & Notifications Report', `Date: ${today}`, `Time: ${timestamp}`],
        [''],
        ['Alert ID', 'Type', 'Severity', 'Title', 'Message', 'Status', 'Created At'],
        ...alerts.map(alert => [
          alert.id,
          alert.type,
          alert.severity,
          alert.title,
          alert.message,
          alert.status,
          alert.createdAt
        ]),
      ];
      exportToCSV(csvData, `alerts-report-${today}-${timestamp.replace(/:/g, '-')}`);
      toast.success('Report downloaded successfully');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | 'All'>('All');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showAlertDetailsModal, setShowAlertDetailsModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [slackNotifications, setSlackNotifications] = useState(false);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);

  // Get severity color
  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'Critical':
        return { border: '#EF4444', bg: '#FEF2F2', text: '#991B1B', chip: '#FEE2E2', icon: '🔴' };
      case 'High':
        return { border: '#F59E0B', bg: '#FFFBEB', text: '#92400E', chip: '#FEF3C7', icon: '🟠' };
      case 'Medium':
        return { border: '#FBBF24', bg: '#FEFCE8', text: '#713F12', chip: '#FEF08A', icon: '🟡' };
      case 'Low':
        return { border: '#0EA5E9', bg: '#F0F9FF', text: '#1E40AF', chip: '#DBEAFE', icon: '🔵' };
      case 'Resolved':
        return { border: '#10B981', bg: '#F0FDF4', text: '#166534', chip: '#DCFCE7', icon: '✓' };
      default:
        return { border: '#6B7280', bg: '#F9FAFB', text: '#1F2937', chip: '#F3F4F6', icon: '📋' };
    }
  };

  // Get alert icon
  const getAlertIcon = (type: string, severity: AlertSeverity) => {
    const colors = getSeverityColor(severity);
    const iconColor = colors.border;

    switch (type) {
      case 'QC Failure':
        return <AlertCircle className="w-6 h-6" style={{ color: iconColor }} />;
      case 'Late Shipment':
        return <Truck className="w-6 h-6" style={{ color: iconColor }} />;
      case 'PO Acknowledgment':
        return <Clock className="w-6 h-6" style={{ color: iconColor }} />;
      case 'QC Passed':
        return <CheckCircle className="w-6 h-6" style={{ color: iconColor }} />;
      case 'Certification Expired':
        return <XCircle className="w-6 h-6" style={{ color: iconColor }} />;
      case 'Payment Overdue':
        return <AlertCircle className="w-6 h-6" style={{ color: iconColor }} />;
      default:
        return <Bell className="w-6 h-6" style={{ color: iconColor }} />;
    }
  };

  // Filter alerts
  const filteredAlerts = alerts.filter((alert) => {
    const matchesSeverity = selectedSeverity === 'All' || alert.severity === selectedSeverity;
    const matchesSearch = searchQuery === '' ||
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  // Count by severity
  const countBySeverity = (severity: AlertSeverity) => {
    return alerts.filter((a) => a.severity === severity).length;
  };

  // Clear resolved alerts
  const clearResolvedAlerts = () => {
    setAlerts(alerts.filter((a) => a.status !== 'Resolved'));
    toast.success('Resolved alerts cleared');
  };

  // Dismiss alert
  const dismissAlert = (alertId: string) => {
    setAlerts(alerts.filter((a) => a.id !== alertId));
    toast.success('Alert dismissed');
  };

  // Acknowledge alert
  const acknowledgeAlert = (alertId: string) => {
    setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, status: 'Acknowledged' as AlertStatus } : a)));
    toast.success('Alert acknowledged');
  };

  // Resolve alert
  const resolveAlert = (alertId: string) => {
    setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, status: 'Resolved' as AlertStatus, severity: 'Resolved' as AlertSeverity } : a)));
    toast.success('Alert resolved');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start bg-white px-6 py-5 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-[32px] font-bold text-[#1F2937]">Alerts & Notifications</h1>
          <p className="text-sm text-[#6B7280] mt-1">SLA breaches, late shipments, and quality failures</p>
        </div>
        <button
          onClick={clearResolvedAlerts}
          className="px-4 py-2 border border-[#D1D5DB] text-[#6B7280] text-xs font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
        >
          Clear Resolved ({countBySeverity('Resolved')})
        </button>
      </div>

      {/* Category Chips */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {/* Critical */}
        <button
          onClick={() => setSelectedSeverity('Critical')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 whitespace-nowrap ${
            selectedSeverity === 'Critical'
              ? 'bg-[#FEE2E2] border-[#FECACA] text-[#991B1B] ring-2 ring-[#EF4444]'
              : 'bg-[#FEE2E2] border-[#FECACA] text-[#991B1B] hover:ring-2 hover:ring-[#EF4444]'
          }`}
        >
          <span className="text-xs">🔴</span>
          <span className="font-bold">{countBySeverity('Critical')}</span>
          <span className="text-sm">Critical</span>
        </button>

        {/* High */}
        <button
          onClick={() => setSelectedSeverity('High')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 whitespace-nowrap ${
            selectedSeverity === 'High'
              ? 'bg-[#FEF3C7] border-[#FCD34D] text-[#92400E] ring-2 ring-[#F59E0B]'
              : 'bg-[#FEF3C7] border-[#FCD34D] text-[#92400E] hover:ring-2 hover:ring-[#F59E0B]'
          }`}
        >
          <span className="text-xs">🟠</span>
          <span className="font-bold">{countBySeverity('High')}</span>
          <span className="text-sm">High</span>
        </button>

        {/* Medium */}
        <button
          onClick={() => setSelectedSeverity('Medium')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 whitespace-nowrap ${
            selectedSeverity === 'Medium'
              ? 'bg-[#FEF08A] border-[#FEF08A] text-[#713F12] ring-2 ring-[#FBBF24]'
              : 'bg-[#FEF08A] border-[#FEF08A] text-[#713F12] hover:ring-2 hover:ring-[#FBBF24]'
          }`}
        >
          <span className="text-xs">🟡</span>
          <span className="font-bold">{countBySeverity('Medium')}</span>
          <span className="text-sm">Medium</span>
        </button>

        {/* Low */}
        <button
          onClick={() => setSelectedSeverity('Low')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 whitespace-nowrap ${
            selectedSeverity === 'Low'
              ? 'bg-[#DBEAFE] border-[#93C5FD] text-[#1E40AF] ring-2 ring-[#0EA5E9]'
              : 'bg-[#DBEAFE] border-[#93C5FD] text-[#1E40AF] hover:ring-2 hover:ring-[#0EA5E9]'
          }`}
        >
          <span className="text-xs">🔵</span>
          <span className="font-bold">{countBySeverity('Low')}</span>
          <span className="text-sm">Low</span>
        </button>

        {/* Resolved */}
        <button
          onClick={() => setSelectedSeverity('Resolved')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 whitespace-nowrap ${
            selectedSeverity === 'Resolved'
              ? 'bg-[#DCFCE7] border-[#BBF7D0] text-[#166534] ring-2 ring-[#10B981]'
              : 'bg-[#DCFCE7] border-[#BBF7D0] text-[#166534] hover:ring-2 hover:ring-[#10B981]'
          }`}
        >
          <span className="text-xs">✓</span>
          <span className="font-bold">{countBySeverity('Resolved')}</span>
          <span className="text-sm">Resolved</span>
        </button>

        {/* All */}
        <button
          onClick={() => setSelectedSeverity('All')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 whitespace-nowrap ${
            selectedSeverity === 'All'
              ? 'bg-[#F3F4F6] border-[#D1D5DB] text-[#1F2937] ring-2 ring-[#6B7280]'
              : 'bg-[#F3F4F6] border-[#D1D5DB] text-[#1F2937] hover:ring-2 hover:ring-[#6B7280]'
          }`}
        >
          <span className="text-xs">📋</span>
          <span className="font-bold">{alerts.length}</span>
          <span className="text-sm">All</span>
        </button>
      </div>

      {/* Search & Actions */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
          />
        </div>
        <button
          onClick={() => setShowPreferencesModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
        >
          <Settings className="w-4 h-4" />
          Preferences
        </button>
        <button
          onClick={() => setShowHistoryModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
        >
          <Clock className="w-4 h-4" />
          History
        </button>
      </div>

      {/* Alerts List */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {filteredAlerts.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
              <p className="text-lg font-bold text-[#1F2937] mb-2">No alerts</p>
              <p className="text-sm text-[#6B7280]">
                {selectedSeverity === 'All' ? 'No alerts to display' : `No ${selectedSeverity.toLowerCase()} priority alerts`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {filteredAlerts.map((alert) => {
                const colors = getSeverityColor(alert.severity);
                return (
                  <div
                    key={alert.id}
                    className="flex items-start gap-4 p-4 hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    style={{ borderLeft: `4px solid ${colors.border}`, backgroundColor: colors.bg }}
                    onClick={() => {
                      setSelectedAlert(alert);
                      setShowAlertDetailsModal(true);
                    }}
                  >
                    {/* Icon + Severity */}
                    <div className="flex flex-col items-center w-20">
                      <div className="mb-2">
                        {getAlertIcon(alert.type, alert.severity)}
                      </div>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold text-white"
                        style={{ backgroundColor: colors.border }}
                      >
                        {alert.severity}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <h3 className="text-sm font-bold text-[#1F2937]">{alert.title}</h3>
                        {!alert.isRead && (
                          <div className="w-2 h-2 rounded-full bg-[#3B82F6] flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-[#6B7280] mb-2">{alert.description}</p>
                      <div className="flex items-center gap-4 text-[11px] text-[#9CA3AF]">
                        <span>{alert.timeAgo}</span>
                        {alert.vendor && <span>• Vendor: {alert.vendor}</span>}
                        {alert.batchId && <span>• Batch: {alert.batchId}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {alert.status === 'Open' && (
                        <>
                          {alert.severity === 'Critical' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAlert(alert);
                                setShowAlertDetailsModal(true);
                              }}
                              className="px-3 py-1.5 bg-[#EF4444] text-white text-xs font-medium rounded-md hover:bg-[#DC2626]"
                            >
                              View Report
                            </button>
                          )}
                          {alert.severity === 'High' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.success('Tracking shipment...');
                              }}
                              className="px-3 py-1.5 bg-[#F59E0B] text-white text-xs font-medium rounded-md hover:bg-[#EA580C]"
                            >
                              Track
                            </button>
                          )}
                          {alert.severity === 'Medium' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.success('Resending notification...');
                              }}
                              className="px-3 py-1.5 bg-[#F59E0B] text-white text-xs font-medium rounded-md hover:bg-[#EA580C]"
                            >
                              Resend
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              acknowledgeAlert(alert.id);
                            }}
                            className="px-3 py-1.5 bg-[#6B7280] text-white text-xs font-medium rounded-md hover:bg-[#4B5563]"
                          >
                            Acknowledge
                          </button>
                        </>
                      )}
                      {alert.status === 'Acknowledged' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveAlert(alert.id);
                          }}
                          className="px-3 py-1.5 bg-[#10B981] text-white text-xs font-medium rounded-md hover:bg-[#059669]"
                        >
                          Resolve
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissAlert(alert.id);
                        }}
                        className="p-1.5 text-[#9CA3AF] hover:text-[#1F2937] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Alert Details */}
      <Dialog open={showAlertDetailsModal} onOpenChange={setShowAlertDetailsModal}>
        <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold" style={{ color: selectedAlert ? getSeverityColor(selectedAlert.severity).border : '#1F2937' }}>
              {selectedAlert?.type}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              Alert ID: {selectedAlert?.id} | {selectedAlert?.timestamp}
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="px-6 py-6 space-y-6">
              {/* Alert Summary */}
              <div
                className="p-4 rounded-lg border-l-4"
                style={{
                  backgroundColor: getSeverityColor(selectedAlert.severity).bg,
                  borderLeftColor: getSeverityColor(selectedAlert.severity).border,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: getSeverityColor(selectedAlert.severity).border }}
                  >
                    {selectedAlert.severity} Severity
                  </span>
                  <span
                    className="px-3 py-1 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: selectedAlert.status === 'Resolved' ? '#DCFCE7' : selectedAlert.status === 'Acknowledged' ? '#DBEAFE' : '#FEF3C7',
                      color: selectedAlert.status === 'Resolved' ? '#166534' : selectedAlert.status === 'Acknowledged' ? '#1E40AF' : '#92400E',
                    }}
                  >
                    {selectedAlert.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#1F2937] mb-2">{selectedAlert.title}</h3>
                <p className="text-sm text-[#6B7280] mb-2">{selectedAlert.description}</p>
                <p className="text-xs text-[#9CA3AF]">{selectedAlert.timestamp} • {selectedAlert.timeAgo}</p>
              </div>

              {/* Impact Assessment */}
              {selectedAlert.severity === 'Critical' && (
                <div className="bg-[#F9FAFB] p-4 rounded-lg">
                  <h3 className="text-sm font-bold text-[#1F2937] mb-3">Impact Assessment</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Type:</span>
                      <span className="text-[#1F2937]">Quality / Operational</span>
                    </div>
                    {selectedAlert.vendor && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Vendor:</span>
                        <span className="text-[#1F2937]">{selectedAlert.vendor}</span>
                      </div>
                    )}
                    {selectedAlert.batchId && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Batch:</span>
                        <span className="font-mono text-[#1F2937]">{selectedAlert.batchId}</span>
                      </div>
                    )}
                    {selectedAlert.impact && (
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Financial Impact:</span>
                        <span className="font-bold text-[#EF4444]">{selectedAlert.impact}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Affected Stakeholders:</span>
                      <span className="text-[#1F2937]">Category Manager, Warehouse</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Information */}
              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <h3 className="text-sm font-bold text-[#1F2937] mb-3">Alert Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Root Cause:</span>
                    <span className="text-[#1F2937]">
                      {selectedAlert.type === 'QC Failure' ? 'Temperature exceeded safe range' : 'Vendor delay'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Detection Method:</span>
                    <span className="text-[#1F2937]">Automated IoT sensor</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Severity Score:</span>
                    <span className="font-bold text-[#EF4444]">
                      {selectedAlert.severity === 'Critical' ? '9/10' : selectedAlert.severity === 'High' ? '7/10' : '5/10'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <h3 className="text-sm font-bold text-[#1F2937] mb-3">Recommended Actions</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-[#E5E7EB]">
                    <span className="text-sm text-[#1F2937]">Quarantine batch</span>
                    <span className="text-xs text-[#10B981]">✓ Completed</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-[#E5E7EB]">
                    <span className="text-sm text-[#1F2937]">Contact vendor</span>
                    <button className="text-xs text-[#4F46E5] hover:underline">Take Action</button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-[#E5E7EB]">
                    <span className="text-sm text-[#1F2937]">Schedule re-audit</span>
                    <button className="text-xs text-[#4F46E5] hover:underline">Schedule</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-between">
            <div className="flex gap-3">
              {selectedAlert?.status === 'Open' && (
                <button
                  onClick={() => {
                    acknowledgeAlert(selectedAlert.id);
                    setShowAlertDetailsModal(false);
                  }}
                  className="px-6 py-2.5 bg-[#0EA5E9] text-white text-sm font-medium rounded-md hover:bg-[#0284C7]"
                >
                  Acknowledge
                </button>
              )}
              {(selectedAlert?.status === 'Acknowledged' || selectedAlert?.status === 'Open') && (
                <button
                  onClick={() => {
                    resolveAlert(selectedAlert.id);
                    setShowAlertDetailsModal(false);
                  }}
                  className="px-6 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-md hover:bg-[#059669]"
                >
                  Resolve
                </button>
              )}
              <button
                onClick={() => toast.success('Escalated to manager')}
                className="px-6 py-2.5 bg-[#F59E0B] text-white text-sm font-medium rounded-md hover:bg-[#EA580C]"
              >
                Escalate
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => toast.success('Alert printed')}
                className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={() => setShowAlertDetailsModal(false)}
                className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
              >
                Close
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Notification Preferences */}
      <Dialog open={showPreferencesModal} onOpenChange={setShowPreferencesModal}>
        <DialogContent className="max-w-[750px] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Notification Preferences
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              Manage how you receive alerts
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Alert Categories */}
            <div>
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Alert Categories</h3>
              <div className="space-y-2">
                {['QC Failures', 'Late Shipments', 'SLA Breaches', 'Quality Issues', 'Payment/Invoice Alerts', 'Compliance Alerts'].map((category) => (
                  <label key={category} className="flex items-center gap-2 p-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-[#4F46E5] rounded" />
                    <span className="text-sm text-[#1F2937]">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Delivery Channels */}
            <div>
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Delivery Channels</h3>
              
              {/* In-App */}
              <div className="mb-4 p-4 border border-[#E5E7EB] rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[#4F46E5]" />
                    <span className="text-sm font-bold text-[#1F2937]">In-App Notifications</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-[#E5E7EB] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E5E7EB] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F46E5]"></div>
                  </label>
                </div>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-[#4F46E5] rounded" />
                    <span className="text-[#6B7280]">Show badge on alerts icon</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-[#4F46E5] rounded" />
                    <span className="text-[#6B7280]">Desktop notification</span>
                  </label>
                </div>
              </div>

              {/* Email */}
              <div className="mb-4 p-4 border border-[#E5E7EB] rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-[#4F46E5]" />
                    <span className="text-sm font-bold text-[#1F2937]">Email Notifications</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E5E7EB] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E5E7EB] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F46E5]"></div>
                  </label>
                </div>
                {emailNotifications && (
                  <div className="space-y-2">
                    <input
                      type="email"
                      placeholder="user@company.com"
                      className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm"
                    />
                    <select className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm">
                      <option>Instant</option>
                      <option>Hourly digest</option>
                      <option>Daily digest</option>
                    </select>
                  </div>
                )}
              </div>

              {/* SMS */}
              <div className="mb-4 p-4 border border-[#E5E7EB] rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-[#4F46E5]" />
                    <span className="text-sm font-bold text-[#1F2937]">SMS Notifications</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smsNotifications}
                      onChange={(e) => setSmsNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E5E7EB] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E5E7EB] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F46E5]"></div>
                  </label>
                </div>
                {smsNotifications && (
                  <div className="space-y-2">
                    <input
                      type="tel"
                      placeholder="+91-xxxxxxxxxx"
                      className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm"
                    />
                    <select className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm">
                      <option>Critical only</option>
                      <option>High & Critical</option>
                      <option>All</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Slack */}
              <div className="p-4 border border-[#E5E7EB] rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#4F46E5]" />
                    <span className="text-sm font-bold text-[#1F2937]">Slack Integration</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slackNotifications}
                      onChange={(e) => setSlackNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E5E7EB] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E5E7EB] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F46E5]"></div>
                  </label>
                </div>
                {slackNotifications && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="#procurement-alerts"
                      className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Quiet Hours */}
            <div>
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Quiet Hours</h3>
              <div className="p-4 border border-[#E5E7EB] rounded-lg">
                <label className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Moon className="w-5 h-5 text-[#4F46E5]" />
                    <span className="text-sm font-bold text-[#1F2937]">Enable quiet hours</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={quietHoursEnabled}
                      onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E5E7EB] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E5E7EB] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F46E5]"></div>
                  </label>
                </label>
                {quietHoursEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#6B7280] mb-1">From</label>
                      <input type="time" defaultValue="22:00" className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6B7280] mb-1">To</label>
                      <input type="time" defaultValue="06:00" className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => toast.success('Preferences reset to defaults')}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Reset to Default
            </button>
            <button
              onClick={() => toast.success('Test notification sent')}
              className="px-6 py-2.5 bg-[#0EA5E9] text-white text-sm font-medium rounded-md hover:bg-[#0284C7]"
            >
              Test Notification
            </button>
            <button
              onClick={() => {
                toast.success('Preferences saved');
                setShowPreferencesModal(false);
              }}
              className="px-6 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-md hover:bg-[#059669]"
            >
              Save Changes
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Alert History & Analytics */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Alert History & Analytics
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              Last 30 days
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <p className="text-xs text-[#6B7280] mb-1">Total Alerts</p>
                <p className="text-2xl font-bold text-[#1F2937] mb-1">142</p>
                <div className="flex items-center gap-1 text-xs text-[#10B981]">
                  <TrendingUp className="w-3 h-3" />
                  <span>+15 vs last month</span>
                </div>
                <div className="mt-2 text-xs text-[#6B7280]">
                  Critical: 8 | High: 34 | Medium: 62 | Low: 38
                </div>
              </div>

              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <p className="text-xs text-[#6B7280] mb-1">Avg Resolution Time</p>
                <p className="text-2xl font-bold text-[#1F2937] mb-1">4.5 hours</p>
                <div className="flex items-center gap-1 text-xs text-[#10B981]">
                  <TrendingDown className="w-3 h-3" />
                  <span>-30 min vs target</span>
                </div>
                <div className="mt-2 text-xs text-[#6B7280]">
                  Target: &lt;6 hours ✓
                </div>
              </div>

              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <p className="text-xs text-[#6B7280] mb-1">Unresolved Alerts</p>
                <p className="text-2xl font-bold text-[#EF4444] mb-1">12</p>
                <div className="flex items-center gap-1 text-xs text-[#6B7280]">
                  <Minus className="w-3 h-3" />
                  <span>Oldest: 5 days</span>
                </div>
                <div className="mt-2 text-xs text-[#6B7280]">
                  Critical: 3 | High: 5 | Medium: 4
                </div>
              </div>

              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <p className="text-xs text-[#6B7280] mb-1">Most Common</p>
                <p className="text-lg font-bold text-[#1F2937] mb-1">Late Shipments</p>
                <div className="flex items-center gap-1 text-xs text-[#6B7280]">
                  <span>32 alerts (23%)</span>
                </div>
                <div className="mt-2 text-xs text-[#6B7280]">
                  QC: 28 | SLA: 24 | Other: 58
                </div>
              </div>
            </div>

            {/* Top Offenders */}
            <div>
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Vendor Alert Frequency (Last 30 days)</h3>
              <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F7FA] border-b border-[#E5E7EB]">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Vendor</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Alerts (30d)</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Critical</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">High</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Trend</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-[#6B7280]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    <tr>
                      <td className="px-4 py-2 font-medium text-[#1F2937]">Dairy Delights</td>
                      <td className="px-4 py-2 text-[#1F2937]">8</td>
                      <td className="px-4 py-2 font-bold text-[#EF4444]">2</td>
                      <td className="px-4 py-2 font-bold text-[#F59E0B]">3</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1 text-[#EF4444]">
                          <TrendingUp className="w-3 h-3" />
                          <span className="text-xs">Worsening</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 bg-[#FEE2E2] text-[#991B1B] text-xs rounded">⚠️ At Risk</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-[#1F2937]">Tech Logistics</td>
                      <td className="px-4 py-2 text-[#1F2937]">6</td>
                      <td className="px-4 py-2 font-bold text-[#EF4444]">1</td>
                      <td className="px-4 py-2 font-bold text-[#F59E0B]">2</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1 text-[#6B7280]">
                          <Minus className="w-3 h-3" />
                          <span className="text-xs">Stable</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 bg-[#DCFCE7] text-[#166534] text-xs rounded">✓ Good</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-[#1F2937]">Global Spices</td>
                      <td className="px-4 py-2 text-[#1F2937]">5</td>
                      <td className="px-4 py-2 font-bold text-[#EF4444]">0</td>
                      <td className="px-4 py-2 font-bold text-[#F59E0B]">2</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1 text-[#10B981]">
                          <TrendingDown className="w-3 h-3" />
                          <span className="text-xs">Improving</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 bg-[#DCFCE7] text-[#166534] text-xs rounded">✓ Good</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={downloadAlertReport}
              className="px-6 py-2.5 bg-[#6B7280] text-white text-sm font-medium rounded-md hover:bg-[#4B5563] flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
