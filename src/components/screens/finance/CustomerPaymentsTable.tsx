import React from 'react';
import { CreditCard, AlertCircle, Smartphone, Globe, Banknote, MoreHorizontal } from 'lucide-react';
import { CustomerPayment } from './customerPaymentsApi';
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";

interface Props {
  data: CustomerPayment[];
  isLoading: boolean;
  onViewDetails: (payment: CustomerPayment) => void;
  onRetry: (payment: CustomerPayment) => void;
}

export function CustomerPaymentsTable({ data, isLoading, onViewDetails, onRetry }: Props) {
  
  const getMethodIcon = (method: string) => {
    switch(method) {
        case 'card': return <CreditCard size={14} className="text-gray-500" />;
        case 'wallet': return <Smartphone size={14} className="text-gray-500" />;
        case 'net_banking': return <Globe size={14} className="text-gray-500" />;
        case 'cod': return <Banknote size={14} className="text-gray-500" />;
        default: return <CreditCard size={14} className="text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
        captured: "bg-[#DCFCE7] text-[#166534]",
        authorized: "bg-blue-100 text-blue-700",
        pending: "bg-yellow-100 text-yellow-700",
        declined: "bg-[#FEE2E2] text-[#991B1B]",
        refunded: "bg-purple-100 text-purple-700",
        chargeback: "bg-orange-100 text-orange-700"
    }[status] || "bg-gray-100 text-gray-700";

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles}`}>
            {status}
        </span>
    );
  };

  if (isLoading) {
    return (
        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm p-4 space-y-4">
            {[1,2,3,4,5].map(i => (
                <div key={i} className="flex gap-4">
                    <Skeleton className="h-12 w-full" />
                </div>
            ))}
        </div>
    );
  }

  if (data.length === 0) {
      return (
          <div className="bg-white border border-[#E0E0E0] rounded-xl p-12 text-center shadow-sm">
              <div className="bg-gray-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="text-gray-400" size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No payments found</h3>
              <p className="text-gray-500 max-w-sm mx-auto mt-2">
                  No customer payments match your current filters. Try adjusting your search or status filter.
              </p>
          </div>
      );
  }

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Payment Method</th>
                <th className="px-6 py-3">Gateway Ref</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {data.map((payment) => (
                  <tr key={payment.id} className="hover:bg-[#FAFAFA] group transition-colors">
                    <td className="px-6 py-4">
                        <p className="font-medium text-[#212121]">{payment.customerName}</p>
                        <p className="text-xs text-[#757575]">{payment.customerEmail}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-[#616161]">{payment.orderId}</td>
                    <td className="px-6 py-4 font-bold text-[#212121]">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: payment.currency }).format(payment.amount)}
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-[#424242]">
                            {getMethodIcon(payment.methodType)}
                            <span className="truncate max-w-[140px]">{payment.paymentMethodDisplay}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#616161] max-w-[120px] truncate" title={payment.gatewayRef}>
                        {payment.gatewayRef}
                    </td>
                    <td className="px-6 py-4">
                       {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                            {payment.retryEligible && (
                                <button 
                                    onClick={() => onRetry(payment)}
                                    className="text-[#14B8A6] hover:text-[#0D9488] font-medium text-xs hidden group-hover:inline-block transition-opacity"
                                >
                                    Retry
                                </button>
                            )}
                            <button 
                                onClick={() => onViewDetails(payment)}
                                className="text-[#757575] hover:text-[#14B8A6] font-medium text-xs border border-transparent hover:border-gray-200 rounded px-2 py-1"
                            >
                                Details
                            </button>
                        </div>
                    </td>
                  </tr>
              ))}
            </tbody>
        </table>
      </div>
      {/* Footer / Pagination Placeholder */}
      <div className="px-6 py-4 border-t border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-between">
          <p className="text-xs text-gray-500">Showing {data.length} results</p>
          <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled>Previous</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled>Next</Button>
          </div>
      </div>
    </div>
  );
}
