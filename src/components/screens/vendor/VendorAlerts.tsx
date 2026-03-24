import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock, Truck, Download, FileText, Send } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { CardSkeleton, EmptyState, ErrorState } from '../../ui/ux-components';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { vendorInventoryApi } from '../../../api/vendor/vendorInventory.api';
import { API_CONFIG } from '../../../config/api';
import { getAuthToken } from '../../../contexts/AuthContext';

type VendorAlertItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  priority?: string;
  status?: string;
  createdAt?: string;
  lastUpdatedAt?: string;
  timeline?: Array<{
    at: string;
    status: string;
    note?: string;
    actor?: string;
  }>;
  source?: Record<string, unknown>;
};

function timeAgo(dateLike?: string): string {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(0, mins)} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs} hrs ago`;
  const days = Math.floor(hrs / 24);
  return `${days} days ago`;
}

export function VendorAlerts() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [alerts, setAlerts] = useState<VendorAlertItem[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<VendorAlertItem | null>(null);

  const topAlerts = useMemo(() => alerts.slice(0, 3), [alerts]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await vendorInventoryApi.getGlobalAlerts({ status: 'all', page: 1, limit: 30 });
      const items = (resp?.items ?? resp?.alerts ?? []) as VendorAlertItem[];
      setAlerts(Array.isArray(items) ? items : []);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load alerts';
      setError(message);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const handleViewReport = (alert: VendorAlertItem) => {
    setSelectedAlert(alert);
    setShowReportModal(true);
  };

  const performAlertAction = async (alertId: string, actionType: string) => {
    const authToken = getAuthToken() || '';
    const res = await fetch(`${API_CONFIG.baseURL}/shared/alerts/${alertId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        actionType,
        metadata: {},
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || `Failed to perform action: ${actionType}`);
    }
  };

  const handleNotifyVendor = async (alert: VendorAlertItem | null) => {
    if (!alert) return;
    try {
      await performAlertAction(alert.id, 'notify_customer');
      toast.success('Notification sent');
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to notify vendor');
    }
  };

  const handleTrack = (alert: VendorAlertItem | null) => {
    if (!alert) return;
    setSelectedAlert(alert);
    setShowTrackingModal(true);
  };

  const handleResend = async (alert: VendorAlertItem | null) => {
    // Treat "Resend" as re-notifying the customer for this alert.
    await handleNotifyVendor(alert);
  };

  const handleDownloadReport = () => {
    if (!selectedAlert) {
      toast.error('Select an alert first');
      return;
    }

    const blob = new Blob([JSON.stringify(selectedAlert, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alert-${selectedAlert.id}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report downloaded successfully');
  };

  const handleClearResolved = async () => {
    if (!window.confirm('Clear all resolved alerts?')) return;
    try {
      const authToken = getAuthToken() || '';
      const res = await fetch(`${API_CONFIG.baseURL}/shared/alerts`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!res.ok) throw new Error('Failed to clear resolved alerts');
      toast.success('Resolved alerts cleared');
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to clear alerts');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Alerts"
        subtitle="Monitor real-time alerts, notifications, and critical vendor issues"
        actions={
          <button 
            onClick={handleClearResolved}
            className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
          >
            Clear Resolved
          </button>
        }
      />

      {loading ? (
        <div className="p-6">
          <CardSkeleton count={3} columns={1} />
        </div>
      ) : error ? (
        <div className="p-6">
          <ErrorState
            title="Could not load alerts"
            description={error}
            retryText="Retry"
            onRetry={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      ) : alerts.length === 0 ? (
        <div className="p-6">
          <EmptyState title="No alerts" description="There are currently no alerts to review." />
        </div>
      ) : (
      <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex gap-4 items-start">
              <div className="p-2 bg-white rounded-full text-[#EF4444] shadow-sm">
                  <AlertCircle size={24} />
              </div>
              <div className="flex-1">
                  <div className="flex justify-between items-start">
                      <h3 className="font-bold text-[#991B1B]">
                        {topAlerts[0]?.title || '—'}
                      </h3>
                      <span className="text-xs font-bold text-[#991B1B]">
                        {timeAgo(topAlerts[0]?.lastUpdatedAt || topAlerts[0]?.createdAt) || '—'}
                      </span>
                  </div>
                  <p className="text-sm text-[#7F1D1D] mt-1">{topAlerts[0]?.description || '—'}</p>
                  <div className="flex gap-3 mt-3">
                      <button 
                        onClick={() => topAlerts[0] && handleViewReport(topAlerts[0])}
                        disabled={!topAlerts[0]}
                        className="px-3 py-1.5 bg-[#EF4444] text-white text-xs font-bold rounded hover:bg-[#DC2626] transition-colors"
                      >
                        View Report
                      </button>
                      <button 
                        onClick={() => handleNotifyVendor(topAlerts[0] || null)}
                        disabled={!topAlerts[0]}
                        className="px-3 py-1.5 bg-white border border-red-200 text-[#991B1B] text-xs font-bold rounded hover:bg-red-50 transition-colors"
                      >
                        Notify Vendor
                      </button>
                  </div>
              </div>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex gap-4 items-start">
              <div className="p-2 bg-white rounded-full text-[#F59E0B] shadow-sm">
                  <Truck size={24} />
              </div>
              <div className="flex-1">
                  <div className="flex justify-between items-start">
                      <h3 className="font-bold text-[#92400E]">{topAlerts[1]?.title || '—'}</h3>
                      <span className="text-xs font-bold text-[#92400E]">
                        {timeAgo(topAlerts[1]?.lastUpdatedAt || topAlerts[1]?.createdAt) || '—'}
                      </span>
                  </div>
                  <p className="text-sm text-[#92400E] mt-1">{topAlerts[1]?.description || '—'}</p>
                  <div className="flex gap-3 mt-3">
                      <button 
                        onClick={() => handleTrack(topAlerts[1] || null)}
                        disabled={!topAlerts[1]}
                        className="px-3 py-1.5 bg-[#F59E0B] text-white text-xs font-bold rounded hover:bg-[#D97706] transition-colors"
                      >
                        Track
                      </button>
                  </div>
              </div>
          </div>

          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex gap-4 items-start">
              <div className="p-2 bg-white rounded-full text-[#F97316] shadow-sm">
                  <Clock size={24} />
              </div>
              <div className="flex-1">
                  <div className="flex justify-between items-start">
                      <h3 className="font-bold text-[#9A3412]">{topAlerts[2]?.title || '—'}</h3>
                      <span className="text-xs font-bold text-[#9A3412]">
                        {timeAgo(topAlerts[2]?.lastUpdatedAt || topAlerts[2]?.createdAt) || '—'}
                      </span>
                  </div>
                  <p className="text-sm text-[#9A3412] mt-1">{topAlerts[2]?.description || '—'}</p>
                  <div className="flex gap-3 mt-3">
                      <button 
                        onClick={() => handleResend(topAlerts[2] || null)}
                        disabled={!topAlerts[2]}
                        className="px-3 py-1.5 bg-white border border-orange-200 text-[#9A3412] text-xs font-bold rounded hover:bg-orange-50 transition-colors"
                      >
                        Resend
                      </button>
                  </div>
              </div>
          </div>
      </div>
      )}

      {/* Modal: View Report */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="report-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#991B1B]">
              QC Failure Report
            </DialogTitle>
            <DialogDescription id="report-description" className="text-sm text-[#6B7280]">
              {selectedAlert?.title || 'Alert Details'}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Alert Summary */}
            <div className="p-4 rounded-lg border-l-4 border-[#EF4444] bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-[#EF4444]">
                  {selectedAlert?.priority || '—'}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-800">
                  {selectedAlert?.status || '—'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#1F2937] mb-2">{selectedAlert?.title || 'Alert Details'}</h3>
              <p className="text-sm text-[#6B7280] mb-2">{selectedAlert?.description || '—'}</p>
              <p className="text-xs text-[#9CA3AF]">
                {timeAgo(selectedAlert?.lastUpdatedAt || selectedAlert?.createdAt) || '—'}
              </p>
            </div>
            {/* Metadata */}
            <div className="bg-[#F9FAFB] p-4 rounded-lg">
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Metadata</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Alert Type:</span>
                  <span className="text-[#1F2937]">{selectedAlert?.type || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Status:</span>
                  <span className="text-[#1F2937]">{selectedAlert?.status || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Priority:</span>
                  <span className="text-[#1F2937]">{selectedAlert?.priority || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Alert ID:</span>
                  <span className="font-mono text-[#1F2937]">{selectedAlert?.id || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Source Order ID:</span>
                  <span className="text-[#1F2937]">{(selectedAlert?.source as any)?.orderId || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Rider Name:</span>
                  <span className="text-[#1F2937]">{(selectedAlert?.source as any)?.riderName || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={handleDownloadReport}
              className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA] transition-all duration-200 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
            <button
              onClick={() => setShowReportModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Track Shipment */}
      <Dialog open={showTrackingModal} onOpenChange={setShowTrackingModal}>
        <DialogContent className="max-w-[600px] p-0" aria-describedby="track-shipment-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">
              Track Shipment
            </DialogTitle>
            <DialogDescription id="track-shipment-description" className="text-sm text-[#6B7280]">
              {selectedAlert?.source ? (selectedAlert.source as any)?.orderId || selectedAlert.title : selectedAlert?.title || 'Tracking'}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Timeline */}
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <h3 className="text-base font-bold text-[#1F2937] mb-2">Tracking Updates</h3>
              <p className="text-xs text-[#6B7280] mb-4">
                {selectedAlert?.timeline?.length ? `${selectedAlert.timeline.length} timeline events` : 'No timeline data'}
              </p>
              <div className="space-y-3">
                {(selectedAlert?.timeline ?? []).length === 0 ? (
                  <EmptyState title="No tracking timeline" description="This alert does not include a tracking timeline yet." />
                ) : (
                  (selectedAlert?.timeline ?? []).map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-[#F59E0B] rounded-full mt-2" />
                      <div className="flex-1">
                        <div className="flex justify-between gap-4 text-sm">
                          <span className="font-medium text-[#1F2937]">
                            {entry.status || 'Update'}
                          </span>
                          <span className="text-xs text-[#6B7280]">
                            {timeAgo(entry.at) || entry.at}
                          </span>
                        </div>
                        {entry.note ? <p className="text-sm text-[#6B7280] mt-1">{entry.note}</p> : null}
                        {entry.actor ? <p className="text-xs text-[#9CA3AF] mt-1">By {entry.actor}</p> : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => setShowTrackingModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-all duration-200"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
