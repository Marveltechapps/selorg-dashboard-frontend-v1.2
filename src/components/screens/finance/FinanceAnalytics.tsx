import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, 
    BarChart3, 
    PieChart, 
    Download, 
    BarChart 
} from 'lucide-react';
import { Button } from "../../ui/button";
import { toast } from 'sonner';

import { 
    ReportType, 
    Granularity,
    RevenueGrowthPoint,
    CashFlowPoint,
    ExpenseBreakdownPoint,
    fetchRevenueGrowth,
    fetchCashFlow,
    fetchExpenseBreakdown
} from './financeAnalyticsApi';

import { AnalyticsToolbar } from './AnalyticsToolbar';
import { ExportPnLModal } from './ExportPnLModal';
import { RevenueGrowthCharts } from './RevenueGrowthCharts';
import { CashFlowCharts } from './CashFlowCharts';
import { ExpenseBreakdownCharts } from './ExpenseBreakdownCharts';

interface FinanceAnalyticsProps {
  initialView?: string | null;
}

export function FinanceAnalytics({ initialView }: FinanceAnalyticsProps) {
  // --- State ---
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [dateRange, setDateRange] = useState("last_12_months");
  const [granularity, setGranularity] = useState<Granularity>("month");
  
  // Data
  const [revenueData, setRevenueData] = useState<RevenueGrowthPoint[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowPoint[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseBreakdownPoint[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // --- Effects ---

  // Handle initial view from navigation
  useEffect(() => {
    if (initialView === 'cash_flow' || initialView === 'cash-flow') {
      setActiveReport('cash_flow');
    }
  }, [initialView]);

  // Fetch data when report type or filters change
  useEffect(() => {
      if (!activeReport) return;

      const loadData = async () => {
          setIsLoading(true);
          try {
              if (activeReport === 'revenue_growth') {
                  const data = await fetchRevenueGrowth(dateRange, undefined, granularity);
                  setRevenueData(data);
              } else if (activeReport === 'cash_flow') {
                  const data = await fetchCashFlow(dateRange, undefined, granularity);
                  setCashFlowData(data);
              } else if (activeReport === 'expense_breakdown') {
                  const data = await fetchExpenseBreakdown(dateRange, undefined, granularity);
                  setExpenseData(data);
              }
          } catch (e) {
              toast.error("Failed to load analytics data");
          } finally {
              setIsLoading(false);
          }
      };

      loadData();
  }, [activeReport, dateRange, granularity]);

  // --- Render Helpers ---

  const renderActiveReport = () => {
      if (!activeReport) {
          return (
            <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm p-8 flex items-center justify-center min-h-[400px] text-[#9E9E9E]">
                <div className="text-center">
                    <BarChart size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Select a report to view detailed charts</p>
                    <p className="text-sm mt-1">Click on one of the cards above to get started</p>
                </div>
            </div>
          );
      }

      return (
          <div>
              <AnalyticsToolbar 
                  dateRange={dateRange} 
                  setDateRange={setDateRange}
                  granularity={granularity}
                  setGranularity={setGranularity}
              />
              
              {activeReport === 'revenue_growth' && (
                  <RevenueGrowthCharts data={revenueData} isLoading={isLoading} />
              )}
              {activeReport === 'cash_flow' && (
                  <CashFlowCharts data={cashFlowData} isLoading={isLoading} />
              )}
              {activeReport === 'expense_breakdown' && (
                  <ExpenseBreakdownCharts data={expenseData} isLoading={isLoading} />
              )}
          </div>
      );
  };

  const getCardClasses = (report: ReportType) => {
      const base = "bg-white p-6 rounded-xl border shadow-sm transition-all cursor-pointer group hover:shadow-md";
      if (activeReport === report) {
          // Highlight active
          if (report === 'revenue_growth') return `${base} ring-2 ring-teal-500 border-teal-500 bg-teal-50/20`;
          if (report === 'cash_flow') return `${base} ring-2 ring-blue-500 border-blue-500 bg-blue-50/20`;
          if (report === 'expense_breakdown') return `${base} ring-2 ring-purple-500 border-purple-500 bg-purple-50/20`;
      }
      return `${base} border-[#E0E0E0] hover:border-gray-300`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Reports & Analytics</h1>
          <p className="text-[#757575] text-sm">Financial KPIs, payment success rates, and cash flow analysis</p>
        </div>
        <Button 
            className="bg-[#212121] text-white hover:bg-black"
            onClick={() => setIsExportModalOpen(true)}
        >
          <Download className="mr-2 h-4 w-4" />
          Export P&L
        </Button>
      </div>

      {/* Report Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Revenue Growth */}
          <div 
            className={getCardClasses('revenue_growth')}
            onClick={() => setActiveReport('revenue_growth')}
          >
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center text-[#14B8A6] mb-4 group-hover:scale-110 transition-transform">
                  <TrendingUp size={24} />
              </div>
              <h3 className="font-bold text-[#212121] mb-2">Revenue Growth</h3>
              <p className="text-sm text-[#757575] mb-4">Month-over-month growth, recurring revenue, and churn.</p>
              <span className={`text-xs font-bold flex items-center gap-1 ${activeReport === 'revenue_growth' ? 'text-teal-700' : 'text-[#14B8A6]'}`}>
                  View Details →
              </span>
          </div>

          {/* Cash Flow */}
          <div 
            className={getCardClasses('cash_flow')}
            onClick={() => setActiveReport('cash_flow')}
          >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 size={24} />
              </div>
              <h3 className="font-bold text-[#212121] mb-2">Cash Flow Analysis</h3>
              <p className="text-sm text-[#757575] mb-4">Inflow vs outflow, liquidity forecast, and burn rate.</p>
              <span className={`text-xs font-bold flex items-center gap-1 ${activeReport === 'cash_flow' ? 'text-blue-800' : 'text-blue-600'}`}>
                  View Details →
              </span>
          </div>

          {/* Expense Breakdown */}
          <div 
            className={getCardClasses('expense_breakdown')}
            onClick={() => setActiveReport('expense_breakdown')}
          >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                  <PieChart size={24} />
              </div>
              <h3 className="font-bold text-[#212121] mb-2">Expense Breakdown</h3>
              <p className="text-sm text-[#757575] mb-4">Vendor spend, operational costs, and overheads.</p>
              <span className={`text-xs font-bold flex items-center gap-1 ${activeReport === 'expense_breakdown' ? 'text-purple-800' : 'text-purple-600'}`}>
                  View Details →
              </span>
          </div>
      </div>

      {/* Chart Area */}
      {renderActiveReport()}

      {/* Export Modal */}
      <ExportPnLModal 
          open={isExportModalOpen} 
          onClose={() => setIsExportModalOpen(false)} 
      />
    </div>
  );
}
