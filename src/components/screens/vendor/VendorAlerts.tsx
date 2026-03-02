import React, { useState } from 'react';
import { AlertCircle, Clock, Truck, Download, FileText, Mail, Send } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { EmptyState } from '../../ui/ux-components';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';

export function VendorAlerts() {
  const [showReportModal, setShowReportModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  const handleViewReport = () => {
    setSelectedAlert('qc-failure-dairy-delights');
    setShowReportModal(true);
  };

  const handleNotifyVendor = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Notification sent to Dairy Delights vendor');
    } catch (error) {
      toast.error('Failed to notify vendor');
    }
  };

  const handleTrack = () => {
    setSelectedAlert('late-shipment-shp-9924');
    setShowTrackingModal(true);
  };

  const handleResend = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('PO acknowledgment request resent to Fresh Farms');
    } catch (error) {
      toast.error('Failed to resend notification');
    }
  };

  const handleDownloadReport = () => {
    // Generate and download report
    const reportData = {
      alertType: 'QC Failure',
      vendor: 'Dairy Delights',
      batchId: '#9922',
      issue: 'Temperature check failed',
      status: 'Rejected',
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QC-Report-Batch-9922-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report downloaded successfully');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Alerts"
        subtitle="Monitor real-time alerts, notifications, and critical vendor issues"
        actions={
          <button 
            onClick={() => toast.success('Resolved alerts cleared')}
            className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
          >
            Clear Resolved
          </button>
        }
      />

      <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex gap-4 items-start">
              <div className="p-2 bg-white rounded-full text-[#EF4444] shadow-sm">
                  <AlertCircle size={24} />
              </div>
              <div className="flex-1">
                  <div className="flex justify-between items-start">
                      <h3 className="font-bold text-[#991B1B]">QC Failure: Dairy Delights</h3>
                      <span className="text-xs font-bold text-[#991B1B]">10 mins ago</span>
                  </div>
                  <p className="text-sm text-[#7F1D1D] mt-1">Batch #9922 failed temperature check. Entire shipment rejected.</p>
                  <div className="flex gap-3 mt-3">
                      <button 
                        onClick={handleViewReport}
                        className="px-3 py-1.5 bg-[#EF4444] text-white text-xs font-bold rounded hover:bg-[#DC2626] transition-colors"
                      >
                        View Report
                      </button>
                      <button 
                        onClick={handleNotifyVendor}
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
                      <h3 className="font-bold text-[#92400E]">Late Shipment Warning</h3>
                      <span className="text-xs font-bold text-[#92400E]">30 mins ago</span>
                  </div>
                  <p className="text-sm text-[#92400E] mt-1">Shipment SHP-9924 from Tech Logistics is delayed by 2 hours.</p>
                  <div className="flex gap-3 mt-3">
                      <button 
                        onClick={handleTrack}
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
                      <h3 className="font-bold text-[#9A3412]">PO Acknowledgment Overdue</h3>
                      <span className="text-xs font-bold text-[#9A3412]">1 hour ago</span>
                  </div>
                  <p className="text-sm text-[#9A3412] mt-1">PO-2024-0012 to Fresh Farms has not been acknowledged for 24 hours.</p>
                  <div className="flex gap-3 mt-3">
                      <button 
                        onClick={handleResend}
                        className="px-3 py-1.5 bg-white border border-orange-200 text-[#9A3412] text-xs font-bold rounded hover:bg-orange-50 transition-colors"
                      >
                        Resend
                      </button>
                  </div>
              </div>
          </div>
      </div>

      {/* Modal: View Report */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="report-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#991B1B]">
              QC Failure Report
            </DialogTitle>
            <DialogDescription id="report-description" className="text-sm text-[#6B7280]">
              Batch #9922 - Dairy Delights
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Alert Summary */}
            <div className="p-4 rounded-lg border-l-4 border-[#EF4444] bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-[#EF4444]">
                  Critical Severity
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-800">
                  Rejected
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#1F2937] mb-2">QC Failure: Temperature Check</h3>
              <p className="text-sm text-[#6B7280] mb-2">Batch #9922 failed temperature check. Entire shipment rejected.</p>
              <p className="text-xs text-[#9CA3AF]">10 mins ago</p>
            </div>

            {/* Report Details */}
            <div className="bg-[#F9FAFB] p-4 rounded-lg">
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Report Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Vendor:</span>
                  <span className="text-[#1F2937] font-medium">Dairy Delights</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Batch ID:</span>
                  <span className="font-mono text-[#1F2937]">#9922</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Issue Type:</span>
                  <span className="text-[#1F2937]">Temperature Compliance Failure</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Required Temperature:</span>
                  <span className="text-[#1F2937]">2-8°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Actual Temperature:</span>
                  <span className="font-bold text-[#EF4444]">12°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Status:</span>
                  <span className="font-bold text-[#EF4444]">Rejected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Financial Impact:</span>
                  <span className="font-bold text-[#EF4444]">₹15,000</span>
                </div>
              </div>
            </div>

            {/* Impact Assessment */}
            <div className="bg-[#F9FAFB] p-4 rounded-lg">
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Impact Assessment</h3>
              <div className="space-y-2 text-sm">
                <p className="text-[#6B7280]">
                  <span className="font-medium text-[#1F2937]">Violation Duration:</span> 1.5 hours
                </p>
                <p className="text-[#6B7280]">
                  <span className="font-medium text-[#1F2937]">Peak Temperature:</span> 12°C
                </p>
                <p className="text-[#6B7280]">
                  <span className="font-medium text-[#1F2937]">Product Risk:</span> Medium to High
                </p>
                <p className="text-[#6B7280]">
                  <span className="font-medium text-[#1F2937]">Recommendation:</span> Reject batch and notify vendor immediately
                </p>
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
              SHP-9924 - Tech Logistics
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Current Status */}
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-[#1F2937]">Current Status</span>
                <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#92400E]">Delayed - 2 hours behind schedule</p>
                <p className="text-xs text-[#92400E]">Expected delivery: Today, 3:00 PM</p>
                <p className="text-xs text-[#92400E]">Current ETA: Today, 5:00 PM</p>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-base font-bold text-[#1F2937] mb-4">Tracking Updates:</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-[#F59E0B] rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm text-[#1F2937] font-medium">Today, 1:30 PM</p>
                    <p className="text-sm text-[#6B7280]">Shipment delayed - Driver reported traffic congestion</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-[#0EA5E9] rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm text-[#1F2937] font-medium">Today, 11:00 AM</p>
                    <p className="text-sm text-[#6B7280]">In transit - Departed from distribution center</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-[#10B981] rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm text-[#1F2937] font-medium">Today, 8:00 AM</p>
                    <p className="text-sm text-[#6B7280]">Picked up from vendor warehouse</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-[#6B7280] rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm text-[#1F2937] font-medium">Yesterday, 4:00 PM</p>
                    <p className="text-sm text-[#6B7280]">Shipment created and scheduled</p>
                  </div>
                </div>
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
