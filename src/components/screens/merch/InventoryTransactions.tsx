import React, { useState, useEffect } from 'react';
import { Plus, Filter, Download, Eye, Loader2 } from 'lucide-react';
import { inventoryApi } from '../../../api/merch/inventoryApi';
import { toast } from 'sonner';

export function InventoryTransactions({ searchQuery = "" }: { searchQuery?: string }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState('STORE-001');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    loadTransactions();
  }, [selectedStore, filterType]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getTransactionHistory(selectedStore);
      if (response.success && response.data) {
        setTransactions(response.data);
      } else {
        setTransactions(mockTransactions);
      }
    } catch (error) {
      console.error('Failed to load transactions', error);
      toast.error('Failed to load transactions');
      setTransactions(mockTransactions);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (searchQuery && !t.sku.includes(searchQuery) && !t.referenceId?.includes(searchQuery)) {
      return false;
    }
    if (filterType !== 'All' && t.transactionType !== filterType) {
      return false;
    }
    return true;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'bg-green-50 text-green-700 border-green-200';
      case 'sale': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'return': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'damage': return 'bg-red-50 text-red-700 border-red-200';
      case 'adjustment': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const stores = ['STORE-001', 'STORE-002', 'STORE-003', 'STORE-004'];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Inventory Transactions</h1>
          <p className="text-[#757575] text-sm">Complete audit trail of all inventory movements</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="px-4 py-2 border border-[#E0E0E0] rounded-lg bg-white text-[#212121] font-medium"
          >
            {stores.map(store => (
              <option key={store} value={store}>{store}</option>
            ))}
          </select>
          <button className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-[#E0E0E0] p-4">
        <div className="flex items-center gap-4">
          <Filter size={18} className="text-[#757575]" />
          <div className="flex gap-2 flex-wrap">
            {['All', 'purchase', 'sale', 'return', 'damage', 'adjustment'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterType === type
                    ? 'bg-[#7C3AED] text-white'
                    : 'bg-[#F5F5F5] text-[#212121] hover:bg-[#E0E0E0]'
                }`}
              >
                {type === 'All' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-[#E0E0E0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F5F7FA] border-b border-[#E0E0E0]">
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Transaction ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Type</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#212121]">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <Loader2 size={24} className="animate-spin text-[#7C3AED] mx-auto" />
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-[#757575]">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <tr key={idx} className="border-b border-[#E0E0E0] hover:bg-[#F5F5F5] transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-[#212121]">{tx.transactionId}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTypeColor(tx.transactionType)}`}>
                        {tx.transactionType.charAt(0).toUpperCase() + tx.transactionType.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[#212121]">{tx.sku}</td>
                    <td className="px-6 py-4 text-sm text-[#212121]">{tx.quantity}</td>
                    <td className="px-6 py-4 text-sm text-[#757575]">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        tx.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' : 
                        tx.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {tx.approvalStatus.charAt(0).toUpperCase() + tx.approvalStatus.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedTransaction(tx)}
                        className="text-[#7C3AED] hover:text-[#6D28D9] font-medium flex items-center gap-1 mx-auto"
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}

function TransactionDetailsModal({ transaction, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-[#212121] mb-6">Transaction Details</h2>
        
        <div className="space-y-4">
          <DetailRow label="Transaction ID" value={transaction.transactionId} />
          <DetailRow label="Type" value={transaction.transactionType} />
          <DetailRow label="SKU" value={transaction.sku} />
          <DetailRow label="Quantity" value={transaction.quantity} />
          <DetailRow label="Store ID" value={transaction.storeId} />
          <DetailRow label="Reference ID" value={transaction.referenceId || 'N/A'} />
          <DetailRow label="Unit Price" value={`$${transaction.priceInfo?.unitPrice || 0}`} />
          <DetailRow label="Total Value" value={`$${transaction.priceInfo?.totalValue || 0}`} />
          <DetailRow label="Created By" value={transaction.createdBy} />
          <DetailRow label="Created At" value={new Date(transaction.createdAt).toLocaleString()} />
          <DetailRow label="Balance Before" value={transaction.balanceBeforeTransaction || 0} />
          <DetailRow label="Balance After" value={transaction.balanceAfterTransaction || 0} />
          {transaction.reason && <DetailRow label="Reason" value={transaction.reason} />}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-[#757575] font-medium">{label}:</span>
      <span className="text-sm font-semibold text-[#212121]">{value}</span>
    </div>
  );
}

const mockTransactions = [
  {
    transactionId: 'TXN-001',
    transactionType: 'purchase',
    sku: 'SKU-1024',
    quantity: 100,
    storeId: 'STORE-001',
    referenceId: 'PO-2024-001',
    priceInfo: { unitPrice: 25, totalValue: 2500 },
    createdBy: 'Admin',
    approvalStatus: 'approved',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    balanceBeforeTransaction: 50,
    balanceAfterTransaction: 150
  },
  {
    transactionId: 'TXN-002',
    transactionType: 'sale',
    sku: 'SKU-1025',
    quantity: 20,
    storeId: 'STORE-001',
    referenceId: 'ORD-2024-500',
    priceInfo: { unitPrice: 45, totalValue: 900 },
    createdBy: 'Store Manager',
    approvalStatus: 'approved',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    balanceBeforeTransaction: 150,
    balanceAfterTransaction: 130
  },
  {
    transactionId: 'TXN-003',
    transactionType: 'return',
    sku: 'SKU-1026',
    quantity: 5,
    storeId: 'STORE-001',
    referenceId: 'RET-2024-100',
    priceInfo: { unitPrice: 35, totalValue: 175 },
    createdBy: 'Store Staff',
    approvalStatus: 'pending',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    balanceBeforeTransaction: 200,
    balanceAfterTransaction: 205
  },
  {
    transactionId: 'TXN-004',
    transactionType: 'damage',
    sku: 'SKU-1027',
    quantity: 3,
    storeId: 'STORE-001',
    referenceId: 'DMG-2024-50',
    priceInfo: { unitPrice: 15, totalValue: 45 },
    createdBy: 'QC Officer',
    approvalStatus: 'approved',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    balanceBeforeTransaction: 120,
    balanceAfterTransaction: 117,
    reason: 'Product damage during handling'
  },
];
