import React from 'react';
import { BarChart3, TrendingUp, PieChart, Download } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { EmptyState } from '../../ui/ux-components';

export function VendorAnalytics() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Vendor KPIs, order accuracy, and purchase analysis"
        actions={
          <button className="px-4 py-2 bg-[#212121] text-white font-medium rounded-lg hover:bg-[#000] flex items-center gap-2">
            <Download size={16} />
            Export Scorecard
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-[#4F46E5] mb-4 group-hover:scale-110 transition-transform">
                  <TrendingUp size={24} />
              </div>
              <h3 className="font-bold text-[#212121] mb-2">On-Time Delivery</h3>
              <p className="text-sm text-[#757575] mb-4">Delivery timeliness trends across all vendors.</p>
              <span className="text-xs font-bold text-[#4F46E5] flex items-center gap-1">View Details →</span>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 size={24} />
              </div>
              <h3 className="font-bold text-[#212121] mb-2">Order Accuracy</h3>
              <p className="text-sm text-[#757575] mb-4">Discrepancy rates, short shipments, and damage reports.</p>
              <span className="text-xs font-bold text-green-600 flex items-center gap-1">View Details →</span>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                  <PieChart size={24} />
              </div>
              <h3 className="font-bold text-[#212121] mb-2">Spend Analysis</h3>
              <p className="text-sm text-[#757575] mb-4">Total spend by category, vendor, and SKU.</p>
              <span className="text-xs font-bold text-orange-600 flex items-center gap-1">View Details →</span>
          </div>
      </div>

      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm p-8 flex items-center justify-center min-h-[300px] text-[#9E9E9E]">
          <div className="text-center">
              <BarChart3 size={48} className="mx-auto mb-4 opacity-20" />
              <p>Select a metric to view detailed charts</p>
          </div>
      </div>
    </div>
  );
}
