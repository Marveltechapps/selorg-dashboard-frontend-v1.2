import React from 'react';
import { FinanceSummary } from './financeApi';
import {
  ArrowUpRight,
  ArrowDownLeft,
  IndianRupee,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Banknote,
  CheckCircle2,
  ShoppingCart,
  RotateCcw,
  Wallet,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  data: FinanceSummary | null;
  loading: boolean;
  error?: boolean;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

function formatPct(val: number) {
  return `${Number(val ?? 0).toFixed(1)}%`;
}

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  subtitle: React.ReactNode;
  icon: React.ReactNode;
  iconClass: string;
  subtitleClass?: string;
}

function MetricCard({ label, value, subtitle, icon, iconClass, subtitleClass = 'text-[#757575]' }: MetricCardProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[#757575] font-medium text-xs uppercase tracking-wider">{label}</span>
        <div className={cn('p-1.5 rounded-lg', iconClass)}>{icon}</div>
      </div>
      <div className="flex items-end gap-2 flex-wrap">{value}</div>
      <div className={cn('text-xs font-medium mt-2 flex items-center gap-1', subtitleClass)}>{subtitle}</div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={`op-${i}`} className="bg-white h-32 rounded-xl border border-gray-100 shadow-sm animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={`kpi-${i}`} className="bg-white h-32 rounded-xl border border-gray-100 shadow-sm animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2].map((i) => (
          <div key={`mix-${i}`} className="bg-white h-32 rounded-xl border border-gray-100 shadow-sm animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function FinanceSummaryCards({ data, loading, error }: Props) {
  if (loading || !data) {
    return <SummarySkeleton />;
  }

  if (error) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Row 1 — operational summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow cursor-default">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[#757575] font-medium text-xs uppercase tracking-wider">
                    Total Received (Today)
                  </span>
                  <div className="text-teal-500 p-1.5 bg-teal-50 rounded-lg">
                    <ArrowDownLeft size={18} />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-[#212121]">{formatCurrency(data.totalReceivedToday)}</span>
                </div>
                <div className="text-xs font-medium mt-2 flex items-center gap-1 text-green-600">
                  <TrendingUp size={12} />
                  <span>
                    {data.totalReceivedChangePercent >= 0 ? '+' : ''}
                    {formatPct(data.totalReceivedChangePercent)} vs yesterday
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Yesterday:{' '}
                {formatCurrency(
                  data.totalReceivedChangePercent !== 0
                    ? data.totalReceivedToday / (1 + data.totalReceivedChangePercent / 100)
                    : data.totalReceivedToday
                )}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <MetricCard
          label="Pending Settlements"
          icon={<IndianRupee size={18} />}
          iconClass="text-blue-500 bg-blue-50"
          value={
            <>
              <span className="text-2xl font-bold text-[#212121]">{formatCurrency(data.pendingSettlementsAmount)}</span>
              <span className="text-sm text-[#757575] mb-1">{data.pendingSettlementsGateways} Gateways</span>
            </>
          }
          subtitle={<span className="text-blue-600">Processing</span>}
          subtitleClass="text-blue-600"
        />

        <MetricCard
          label="Vendor Payouts"
          icon={<ArrowUpRight size={18} />}
          iconClass="text-orange-500 bg-orange-50"
          value={<span className="text-2xl font-bold text-[#212121]">{formatCurrency(data.vendorPayoutsAmount)}</span>}
          subtitle={<span className="text-orange-600">{data.vendorPayoutsStatusText}</span>}
          subtitleClass="text-orange-600"
        />

        <MetricCard
          label="Failed Payments"
          icon={<AlertCircle size={18} />}
          iconClass="text-red-500 bg-red-50"
          value={
            <>
              <span className="text-2xl font-bold text-[#212121]">{formatPct(data.failedPaymentsRatePercent)}</span>
              <span className="text-sm text-[#757575] mb-1">{data.failedPaymentsCount} txns</span>
            </>
          }
          subtitle={
            data.failedPaymentsRatePercent > data.failedPaymentsThresholdPercent ? (
              <>
                <TrendingDown size={12} />
                <span>Above Threshold</span>
              </>
            ) : (
              <span>Within Limits</span>
            )
          }
          subtitleClass={
            data.failedPaymentsRatePercent > data.failedPaymentsThresholdPercent
              ? 'text-red-600'
              : 'text-green-600'
          }
        />
      </div>

      {/* Row 2 — revenue & settlement KPIs (4 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Net Revenue (Today)"
          icon={<Banknote size={18} />}
          iconClass="text-emerald-600 bg-emerald-50"
          value={<span className="text-2xl font-bold text-[#212121]">{formatCurrency(data.netRevenueToday)}</span>}
          subtitle={
            <span className="text-emerald-600">
              After {formatCurrency(data.refundsTodayAmount)} refunds ({data.refundsTodayCount})
            </span>
          }
          subtitleClass="text-emerald-600"
        />

        <MetricCard
          label="Settlement Success Rate"
          icon={<CheckCircle2 size={18} />}
          iconClass="text-indigo-500 bg-indigo-50"
          value={<span className="text-2xl font-bold text-[#212121]">{formatPct(data.settlementSuccessRatePercent)}</span>}
          subtitle={
            <span className="text-indigo-600">
              {data.settledPaymentsCount} / {data.settlementAttemptsCount} payments settled
            </span>
          }
          subtitleClass="text-indigo-600"
        />

        <MetricCard
          label="Average Order Value"
          icon={<ShoppingCart size={18} />}
          iconClass="text-violet-500 bg-violet-50"
          value={<span className="text-2xl font-bold text-[#212121]">{formatCurrency(data.averageOrderValue)}</span>}
          subtitle={
            <span className="text-violet-600">
              Across {data.successfulOrderCount} successful order{data.successfulOrderCount === 1 ? '' : 's'}
            </span>
          }
          subtitleClass="text-violet-600"
        />

        <MetricCard
          label="Refund Rate"
          icon={<RotateCcw size={18} />}
          iconClass="text-amber-500 bg-amber-50"
          value={<span className="text-2xl font-bold text-[#212121]">{formatPct(data.refundRatePercent)}</span>}
          subtitle={
            <span className={data.refundRatePercent > 2 ? 'text-amber-600' : 'text-green-600'}>
              {data.refundsTodayCount} refund{data.refundsTodayCount === 1 ? '' : 's'} today
            </span>
          }
          subtitleClass={data.refundRatePercent > 2 ? 'text-amber-600' : 'text-green-600'}
        />
      </div>

      {/* Row 3 — payment mix (COD & gateway) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="COD %"
          icon={<Wallet size={18} />}
          iconClass="text-slate-600 bg-slate-100"
          value={<span className="text-2xl font-bold text-[#212121]">{formatPct(data.codPercent)}</span>}
          subtitle={
            <span className="text-slate-600">
              {data.codTxnCount} COD transaction{data.codTxnCount === 1 ? '' : 's'} of gross
            </span>
          }
          subtitleClass="text-slate-600"
        />

        <MetricCard
          label="Gateway Success %"
          icon={<CreditCard size={18} />}
          iconClass="text-cyan-600 bg-cyan-50"
          value={<span className="text-2xl font-bold text-[#212121]">{formatPct(data.gatewaySuccessRatePercent)}</span>}
          subtitle={
            <span className={data.gatewaySuccessRatePercent >= 95 ? 'text-green-600' : 'text-cyan-600'}>
              {data.gatewaySuccessCount} / {data.gatewayTerminalCount} online gateway attempts
            </span>
          }
          subtitleClass={data.gatewaySuccessRatePercent >= 95 ? 'text-green-600' : 'text-cyan-600'}
        />
      </div>
    </div>
  );
}
