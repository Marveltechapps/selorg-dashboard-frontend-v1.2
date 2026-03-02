import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, MapPin, Truck, CheckCircle2, X, Download, Search } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { EmptyState, LoadingState } from '../../ui/ux-components';
import { toast } from 'sonner';
import { fetchWarehouseTransfers, createWarehouseTransfer, updateWarehouseTransferStatus, WarehouseTransfer } from './warehouseApi';

export function Transfers() {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<WarehouseTransfer[]>([]);
  const [newTransfer, setNewTransfer] = useState({ destination: '', items: '', vehicle: '' });

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const data = await fetchWarehouseTransfers();
      setTransfers(data);
    } catch (error) {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const createTransfer = async () => {
    if (newTransfer.destination && newTransfer.items) {
      try {
        await createWarehouseTransfer({
          destination: newTransfer.destination,
          items: parseInt(newTransfer.items),
          status: 'pending'
        });
        toast.success('Transfer created successfully');
        setShowTransferModal(false);
        setNewTransfer({ destination: '', items: '', vehicle: '' });
        loadTransfers();
      } catch (error) {
        toast.error('Failed to create transfer');
      }
    }
  };

  const updateStatus = async (id: string, newStatus: WarehouseTransfer['status']) => {
    try {
      await updateWarehouseTransferStatus(id, newStatus);
      toast.success('Transfer status updated');
      loadTransfers();
    } catch (error) {
      toast.error('Failed to update transfer status');
    }
  };

  const exportData = () => {
    const today = new Date().toISOString().split('T')[0];
    const csvData = [
      ['Inter-Warehouse Transfers Report', `Date: ${today}`],
      [''],
      ['Transfer ID', 'Destination', 'Status', 'Items', 'Distance', 'ETA'],
      ...transfers.map(t => [
        t.transferId,
        t.destination,
        t.status,
        t.items?.toString() || '0',
        t.distance || 'N/A',
        t.eta || 'N/A'
      ]),
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transfers-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredTransfers = transfers.filter(t =>
    t.transferId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inter-Warehouse Transfers"
        subtitle="Transfer requests, route planning, and live tracking"
        actions={
          <>
            <button
              onClick={exportData}
              className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC] flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
            <button
              onClick={() => setShowTransferModal(true)}
              className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
            >
              <ArrowRightLeft size={16} />
              New Transfer
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><ArrowRightLeft size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Total Transfers</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{transfers.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Truck size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">En Route</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">
            {transfers.filter(t => t.status === 'en-route').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><MapPin size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Loading</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">
            {transfers.filter(t => t.status === 'loading').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><CheckCircle2 size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Completed</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">
            {transfers.filter(t => t.status === 'completed').length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Transfers */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h3 className="font-bold text-[#1E293B] mb-3">Live Transfer Tracking</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search transfers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
            {filteredTransfers.length === 0 && (
              <div className="text-center py-12 text-[#64748B]">
                No transfers yet. Click New Transfer to create one.
              </div>
            )}
            {filteredTransfers.map(transfer => (
              <div key={transfer.id} className="border border-[#E2E8F0] rounded-lg p-4 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  transfer.status === 'en-route' ? 'bg-blue-500' :
                  transfer.status === 'loading' ? 'bg-amber-500' :
                  transfer.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-[#1E293B]">{transfer.transferId}</h4>
                    <p className="text-xs text-[#64748B]">To: {transfer.destination}</p>
                    <p className="text-xs text-[#64748B]">{transfer.items} items</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    transfer.status === 'en-route' ? 'bg-blue-100 text-blue-700' :
                    transfer.status === 'loading' ? 'bg-amber-100 text-amber-700' :
                    transfer.status === 'completed' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {transfer.status === 'en-route' ? 'En Route' :
                     transfer.status === 'loading' ? 'Loading' :
                     transfer.status === 'completed' ? 'Completed' : 'Pending'}
                  </span>
                </div>
                
                {transfer.status === 'en-route' && transfer.distance && transfer.eta && (
                  <>
                    <div className="flex items-center gap-4 text-sm text-[#64748B] mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} />
                        <span>{transfer.distance} away</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck size={16} />
                        <span>ETA: {transfer.eta}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${transfer.progress}%` }}></div>
                    </div>
                  </>
                )}

                {transfer.status === 'pending' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateStatus(transfer.id, 'loading')}
                      className="px-3 py-1 bg-[#0891b2] text-white text-xs rounded hover:bg-[#06b6d4]"
                    >
                      Start Loading
                    </button>
                  </div>
                )}

                {transfer.status === 'loading' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateStatus(transfer.id, 'en-route')}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Dispatch
                    </button>
                  </div>
                )}

                {transfer.status === 'en-route' && (
                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={() => updateStatus(transfer.id, 'completed')}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      Mark Delivered
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Transfer History */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h3 className="font-bold text-[#1E293B]">Recent Completions</h3>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3">Transfer ID</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {transfers.filter(t => t.status === 'completed').map(transfer => (
                <tr key={transfer.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-mono text-[#475569]">{transfer.transferId}</td>
                  <td className="px-4 py-3 text-[#1E293B]">{transfer.destination}</td>
                  <td className="px-4 py-3 text-[#64748B]">{transfer.items}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Create New Transfer</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Destination</label>
                <select 
                  value={newTransfer.destination}
                  onChange={(e) => setNewTransfer({...newTransfer, destination: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="">Select destination</option>
                  <option>Regional Hub A</option>
                  <option>Regional Hub B</option>
                  <option>Cold Storage Center</option>
                  <option>Distribution Center East</option>
                  <option>Distribution Center West</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Number of Items</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={newTransfer.items}
                  onChange={(e) => setNewTransfer({...newTransfer, items: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Vehicle ID (Optional)</label>
                <input 
                  type="text"
                  placeholder="VHC-XXXX"
                  value={newTransfer.vehicle}
                  onChange={(e) => setNewTransfer({...newTransfer, vehicle: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={createTransfer}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Create Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}