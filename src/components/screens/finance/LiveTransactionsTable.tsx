import React, { useEffect, useState } from 'react';
import { LiveTransaction, fetchLiveTransactions } from './financeApi';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import websocketService from '@/utils/websocket';

interface Props {
  entityId: string;
  onTransactionClick: (txn: LiveTransaction) => void;
  filterMethod?: string | null;
}

export function LiveTransactionsTable({ entityId, onTransactionClick, filterMethod }: Props) {
  const [transactions, setTransactions] = useState<LiveTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      // In a real app, cursor pagination would be used to append
      const newTxns = await fetchLiveTransactions(entityId, isPoll ? 2 : 10);
      
      setTransactions(prev => {
        if (!isPoll) return newTxns;
        const combined = [...newTxns, ...prev];
        const deduped: LiveTransaction[] = [];
        const seenIds = new Set<string>();
        const seenOrderIds = new Set<string>();
        for (const item of combined) {
          if (seenIds.has(item.id)) continue;
          if (item.orderId && seenOrderIds.has(item.orderId)) continue;
          seenIds.add(item.id);
          if (item.orderId) seenOrderIds.add(item.orderId);
          deduped.push(item);
        }
        return deduped.slice(0, 20);
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 8000);

    websocketService.connect();

    const handlePaymentCreated = (data: any) => {
      if (!data) return;
      const newTxn: LiveTransaction = {
        id: data.id || `txn-${Date.now()}`,
        txnId: data.txnId || `TXN-${Date.now()}`,
        amount: data.amount || 0,
        currency: data.currency || 'INR',
        methodDisplay: data.methodDisplay || data.methodType || 'Unknown',
        maskedDetails: data.maskedDetails || '',
        status: data.status || 'pending',
        createdAt: data.createdAt || new Date().toISOString(),
        gateway: data.gateway || 'internal',
        orderId: data.orderId,
        customerName: data.customerName,
      };
      setTransactions((prev) => {
        const isDuplicate = prev.some(
          (t) => t.id === newTxn.id || (t.orderId && t.orderId === newTxn.orderId)
        );
        if (isDuplicate) return prev;
        return [newTxn, ...prev].slice(0, 20);
      });
      toast.success(`New payment: ₹${newTxn.amount.toLocaleString('en-IN')} via ${newTxn.methodDisplay}`);
    };

    const handleOrderCancelled = (data: any) => {
      if (!data || !data.order_id) return;
      setTransactions((prev) =>
        prev.map((t) => {
          if (t.orderId !== data.order_id) return t;
          return { ...t, status: 'failed' };
        })
      );
    };

    websocketService.on('payment:created', handlePaymentCreated);
    websocketService.on('order:cancelled', handleOrderCancelled);

    return () => {
      clearInterval(interval);
      websocketService.off('payment:created', handlePaymentCreated);
      websocketService.off('order:cancelled', handleOrderCancelled);
    };
  }, [entityId]);

  const filteredTransactions = filterMethod 
    ? transactions.filter(t => {
        if (filterMethod === 'cards') return t.gateway === 'Stripe' || t.methodDisplay.includes('Visa') || t.methodDisplay.includes('Mastercard');
        if (filterMethod === 'digital_wallets') return t.methodDisplay.includes('Pay');
        if (filterMethod === 'cod') return t.methodDisplay === 'COD';
        return true;
      })
    : transactions;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Success</Badge>;
      case 'failed': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
      case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = (new Date().getTime() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return 'Older';
  };

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
      <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center shrink-0">
        <h3 className="font-bold text-[#212121]">Live Transactions</h3>
        <div className="flex items-center gap-3">
            {isRefreshing && <RefreshCw size={14} className="animate-spin text-gray-400" />}
            <span className="flex items-center gap-1.5 text-xs font-bold text-[#14B8A6]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                LIVE FEED
            </span>
        </div>
      </div>
      
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0] sticky top-0">
            <tr>
              <th className="px-6 py-3">Txn ID</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Method</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E0E0E0]">
            {loading && transactions.length === 0 ? (
               <tr>
                 <td colSpan={5} className="p-8 text-center text-gray-500">Loading live feed...</td>
               </tr>
            ) : filteredTransactions.length === 0 ? (
               <tr>
                 <td colSpan={5} className="p-8 text-center text-gray-500">No transactions found</td>
               </tr>
            ) : (
              filteredTransactions.map((txn) => (
                <tr 
                  key={txn.id} 
                  onClick={() => onTransactionClick(txn)}
                  className="hover:bg-[#FAFAFA] cursor-pointer transition-colors animate-in fade-in slide-in-from-top-1 duration-300"
                >
                  <td className="px-6 py-4 font-mono text-[#616161]">{txn.txnId}</td>
                  <td className="px-6 py-4 font-bold text-[#212121]">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: txn.currency }).format(txn.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-gray-900 font-medium">{txn.methodDisplay}</span>
                      <span className="text-xs text-gray-500">{txn.maskedDetails}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(txn.status)}
                  </td>
                  <td className="px-6 py-4 text-[#616161] text-xs">
                    {getTimeAgo(txn.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
