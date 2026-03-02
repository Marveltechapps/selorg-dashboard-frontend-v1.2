import React, { useEffect, useState } from 'react';
import { 
  fetchFinanceSummary, 
  fetchPaymentMethodSplit, 
  FinanceSummary, 
  PaymentMethodSplitItem,
  LiveTransaction 
} from './financeApi';
import { FinanceSummaryCards } from './FinanceSummaryCards';
import { PaymentMethodSplitCard } from './PaymentMethodSplitCard';
import { LiveTransactionsTable } from './LiveTransactionsTable';
import { TransactionDetailsDrawer } from './TransactionDetailsDrawer';
import { ExportFinanceReportModal } from './ExportFinanceReportModal';
import { Download, TrendingUp, RefreshCcw, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiRequest } from '@/api/apiClient';
import websocketService from '@/utils/websocket';

export function FinanceOverview() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [split, setSplit] = useState<PaymentMethodSplitItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Interaction State
  const [selectedTxn, setSelectedTxn] = useState<LiveTransaction | null>(null);
  const [filterMethod, setFilterMethod] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const [walletLiability, setWalletLiability] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLoading(true);
    setError(null);
    try {
      const dateStr = new Date().toISOString();
      const [summaryData, splitData] = await Promise.all([
        fetchFinanceSummary("default", dateStr),
        fetchPaymentMethodSplit("default", dateStr)
      ]);
      setSummary(summaryData);
      setSplit(splitData ?? []);
      try {
        const wRes = await apiRequest<{ success: boolean; data: { totalBalance: number } }>('/finance/wallet-liability');
        setWalletLiability(wRes.data?.totalBalance ?? 0);
      } catch { /* wallet liability is optional */ }
      if (e) toast.success("Data refreshed successfully");
    } catch (err) {
      setSummary(null);
      setSplit([]);
      const msg = err instanceof Error ? err.message : "Failed to load finance data";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    websocketService.connect();

    const handlePaymentCreated = (data: any) => {
      if (!data || !data.amount) return;

      setSummary((prev) => {
        if (!prev) return prev;
        const amount = data.amount || 0;
        const isFailed = data.status === 'failed';
        return {
          ...prev,
          totalReceivedToday: isFailed ? prev.totalReceivedToday : prev.totalReceivedToday + amount,
          failedPaymentsCount: isFailed ? prev.failedPaymentsCount + 1 : prev.failedPaymentsCount,
        };
      });

      setSplit((prev) => {
        if (!prev.length) return prev;
        const methodMap: Record<string, string> = {
          card: 'cards',
          upi: 'digital_wallets',
          wallet: 'digital_wallets',
          cash: 'cod',
        };
        const key = methodMap[data.methodType] || 'cod';
        return prev.map((item) => {
          if (item.method !== key) return item;
          return {
            ...item,
            amount: item.amount + (data.amount || 0),
            txnCount: item.txnCount + 1,
          };
        });
      });
    };

    websocketService.on('payment:created', handlePaymentCreated);
    return () => {
      websocketService.off('payment:created', handlePaymentCreated);
    };
  }, []);

  const handleMethodClick = (method: string) => {
    setFilterMethod(prev => prev === method ? null : method);
  };

  const handleCashFlowNav = () => {
    // Navigate to analytics tab with cash flow view
    const event = new CustomEvent('navigateToTab', { 
      detail: { tab: 'analytics', view: 'cash_flow' } 
    });
    window.dispatchEvent(event);
    
    toast.success("Opening Cash Flow Analysis");
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#212121] flex items-center gap-3">
            Finance Overview 
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded border border-gray-200 uppercase tracking-wider font-semibold">
               SECURE
            </span>
          </h1>
          <p className="text-[#757575] text-sm">Real-time payment flows, gateway status, and daily liquidity</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={(e) => loadData(e)} 
            disabled={loading}
            type="button"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button 
            variant="outline" 
            className="bg-white" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExportOpen(true);
            }}
            type="button"
          >
            <Download size={16} className="mr-2" />
            Download Report
          </Button>
          <Button 
            className="bg-[#14B8A6] hover:bg-[#0D9488] text-white" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCashFlowNav();
            }}
            type="button"
          >
            <TrendingUp size={16} className="mr-2" />
            View Cash Flow
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <FinanceSummaryCards data={summary} loading={loading} error={!!error} />

      {/* Wallet Liability Card */}
      <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Wallet size={20} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-[#757575]">Wallet Liability</p>
            <p className="text-xl font-bold text-[#212121]">₹{walletLiability.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <p className="text-xs text-[#9E9E9E]">Total outstanding wallet balance across all customers</p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
         {/* Payment Methods */}
         <div className="lg:col-span-1 h-full">
            <PaymentMethodSplitCard 
              data={split} 
              loading={loading} 
              onMethodClick={handleMethodClick} 
            />
         </div>

         {/* Live Transactions */}
         <div className="lg:col-span-2 h-full">
            <LiveTransactionsTable 
               entityId="default" 
               onTransactionClick={setSelectedTxn}
               filterMethod={filterMethod}
            />
         </div>
      </div>

      {/* Modals & Drawers */}
      <ExportFinanceReportModal 
        isOpen={isExportOpen} 
        onClose={() => setIsExportOpen(false)} 
      />

      <TransactionDetailsDrawer 
        transaction={selectedTxn} 
        onClose={() => setSelectedTxn(null)} 
      />
    </div>
  );
}
