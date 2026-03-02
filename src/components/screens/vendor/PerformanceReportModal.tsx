import React from 'react';
import { X, TrendingUp, TrendingDown, Package, Clock, CheckCircle, XCircle, IndianRupee, Star } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  complianceStatus: 'Compliant' | 'Pending' | 'Non-Compliant';
  status: 'Active' | 'Inactive' | 'Suspended' | 'Under Review';
  statusColor: string;
}

interface PerformanceReportModalProps {
  vendor: Vendor;
  onClose: () => void;
}

export function PerformanceReportModal({ vendor, onClose }: PerformanceReportModalProps) {
  // Mock performance data - would come from API in production
  const performanceData = {
    overallScore: 87,
    deliveryTimeliness: 92,
    productQuality: 95,
    orderFulfillment: 89,
    compliance: 85,
    totalOrders: 248,
    completedOrders: 234,
    pendingOrders: 8,
    rejectedOrders: 6,
    averageDeliveryTime: '2.4 days',
    totalRevenue: '₹12,45,890',
    rating: 4.5
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-[#10B981]';
    if (score >= 75) return 'text-[#F59E0B]';
    return 'text-[#EF4444]';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-[#D1FAE5]';
    if (score >= 75) return 'bg-[#FEF3C7]';
    return 'bg-[#FEE2E2]';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#4F46E5] to-[#7C3AED]">
          <div className="flex justify-between items-start">
            <div className="text-white">
              <h2 className="text-xl font-bold">Performance Report</h2>
              <p className="text-sm opacity-90 mt-1">{vendor.name}</p>
              <p className="text-xs opacity-75 mt-0.5">Vendor ID: {vendor.id}</p>
            </div>
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overall Score */}
          <div className="mb-6 text-center">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreBgColor(performanceData.overallScore)} mb-3`}>
              <span className={`text-3xl font-bold ${getScoreColor(performanceData.overallScore)}`}>
                {performanceData.overallScore}
              </span>
            </div>
            <h3 className="font-bold text-[#1F2937] mb-1">Overall Performance Score</h3>
            <p className="text-sm text-[#6B7280]">Based on last 90 days of activity</p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB]">
              <div className="flex items-center gap-2 mb-2">
                <Package size={18} className="text-[#4F46E5]" />
                <span className="text-xs text-[#6B7280] font-medium">Total Orders</span>
              </div>
              <p className="text-2xl font-bold text-[#1F2937]">{performanceData.totalOrders}</p>
            </div>

            <div className="bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB]">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-[#10B981]" />
                <span className="text-xs text-[#6B7280] font-medium">Completed</span>
              </div>
              <p className="text-2xl font-bold text-[#10B981]">{performanceData.completedOrders}</p>
            </div>

            <div className="bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB]">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={18} className="text-[#F59E0B]" />
                <span className="text-xs text-[#6B7280] font-medium">Pending</span>
              </div>
              <p className="text-2xl font-bold text-[#F59E0B]">{performanceData.pendingOrders}</p>
            </div>

            <div className="bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB]">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={18} className="text-[#EF4444]" />
                <span className="text-xs text-[#6B7280] font-medium">Rejected</span>
              </div>
              <p className="text-2xl font-bold text-[#EF4444]">{performanceData.rejectedOrders}</p>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="space-y-4 mb-6">
            <h4 className="font-bold text-[#1F2937]">Performance Breakdown</h4>
            
            {/* Delivery Timeliness */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[#6B7280]" />
                  <span className="text-sm font-medium text-[#1F2937]">Delivery Timeliness</span>
                </div>
                <span className={`font-bold ${getScoreColor(performanceData.deliveryTimeliness)}`}>
                  {performanceData.deliveryTimeliness}%
                </span>
              </div>
              <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#10B981] transition-all duration-500"
                  style={{ width: `${performanceData.deliveryTimeliness}%` }}
                />
              </div>
            </div>

            {/* Product Quality */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-[#6B7280]" />
                  <span className="text-sm font-medium text-[#1F2937]">Product Quality</span>
                </div>
                <span className={`font-bold ${getScoreColor(performanceData.productQuality)}`}>
                  {performanceData.productQuality}%
                </span>
              </div>
              <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#10B981] transition-all duration-500"
                  style={{ width: `${performanceData.productQuality}%` }}
                />
              </div>
            </div>

            {/* Order Fulfillment */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-[#6B7280]" />
                  <span className="text-sm font-medium text-[#1F2937]">Order Fulfillment Rate</span>
                </div>
                <span className={`font-bold ${getScoreColor(performanceData.orderFulfillment)}`}>
                  {performanceData.orderFulfillment}%
                </span>
              </div>
              <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#F59E0B] transition-all duration-500"
                  style={{ width: `${performanceData.orderFulfillment}%` }}
                />
              </div>
            </div>

            {/* Compliance */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-[#6B7280]" />
                  <span className="text-sm font-medium text-[#1F2937]">Compliance Score</span>
                </div>
                <span className={`font-bold ${getScoreColor(performanceData.compliance)}`}>
                  {performanceData.compliance}%
                </span>
              </div>
              <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#F59E0B] transition-all duration-500"
                  style={{ width: `${performanceData.compliance}%` }}
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#F0F7FF] to-[#E0E7FF] p-4 rounded-lg border border-[#C7D2FE]">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={18} className="text-[#4F46E5]" />
                <span className="text-xs text-[#4338CA] font-medium">Avg. Delivery Time</span>
              </div>
              <p className="text-xl font-bold text-[#4338CA]">{performanceData.averageDeliveryTime}</p>
            </div>

            <div className="bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] p-4 rounded-lg border border-[#BBF7D0]">
              <div className="flex items-center gap-2 mb-2">
                <IndianRupee size={18} className="text-[#10B981]" />
                <span className="text-xs text-[#065F46] font-medium">Total Revenue</span>
              </div>
              <p className="text-xl font-bold text-[#065F46]">{performanceData.totalRevenue}</p>
            </div>

            <div className="bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] p-4 rounded-lg border border-[#FDE68A]">
              <div className="flex items-center gap-2 mb-2">
                <Star size={18} className="text-[#F59E0B]" />
                <span className="text-xs text-[#92400E] font-medium">Vendor Rating</span>
              </div>
              <p className="text-xl font-bold text-[#92400E]">{performanceData.rating}/5.0</p>
            </div>
          </div>

          {/* Performance Trend */}
          <div className="bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB]">
            <h4 className="font-bold text-[#1F2937] mb-3">Performance Trend</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6B7280]">Compared to last quarter</span>
                <div className="flex items-center gap-1 text-[#10B981]">
                  <TrendingUp size={16} />
                  <span className="text-sm font-bold">+12%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6B7280]">Delivery performance</span>
                <div className="flex items-center gap-1 text-[#10B981]">
                  <TrendingUp size={16} />
                  <span className="text-sm font-bold">+5%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6B7280]">Quality rating</span>
                <div className="flex items-center gap-1 text-[#EF4444]">
                  <TrendingDown size={16} />
                  <span className="text-sm font-bold">-2%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-between items-center">
          <p className="text-xs text-[#6B7280]">Report generated on {new Date().toLocaleDateString()}</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:bg-[#4338CA] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}