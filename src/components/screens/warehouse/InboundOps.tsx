import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, Truck, ClipboardList, CheckCircle2, AlertOctagon, X, Plus, Search, Download } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { EmptyState, LoadingState } from '../../ui/ux-components';
import { toast } from 'sonner';
import { fetchGRNs, createGRN as apiCreateGRN, startGRN as apiStartGRN, completeGRN as apiCompleteGRN, logGRNDiscrepancy as apiLogGRNDiscrepancy, fetchDocks, GRN, DockSlot } from './warehouseApi';

export function InboundOps() {
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [selectedGRNForDiscrepancy, setSelectedGRNForDiscrepancy] = useState<GRN | null>(null);
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');
  const [discrepancyType, setDiscrepancyType] = useState('quantity');
  const [submittingDiscrepancy, setSubmittingDiscrepancy] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [grns, setGrns] = useState<GRN[]>([]);
  const [dockSlots, setDockSlots] = useState<DockSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const [newGRNData, setNewGRNData] = useState({ poNumber: '', vendor: '', items: '' });

  useEffect(() => {
    loadData();
    // Real-time polling for inbound queue
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [gData, dData] = await Promise.all([fetchGRNs(), fetchDocks()]);
      setGrns(gData);
      setDockSlots(dData);
    } catch (error) {
      toast.error('Failed to load inbound data');
    } finally {
      setLoading(false);
    }
  };

  const createGRN = async () => {
    if (newGRNData.poNumber && newGRNData.vendor) {
      try {
        await apiCreateGRN({
          poNumber: newGRNData.poNumber,
          vendor: newGRNData.vendor,
          items: parseInt(newGRNData.items) || 0,
        });
        toast.success('GRN created successfully');
        setShowGRNModal(false);
        setNewGRNData({ poNumber: '', vendor: '', items: '' });
        loadData();
      } catch (error) {
        toast.error('Failed to create GRN');
      }
    }
  };

  const startCount = async (id: string) => {
    try {
      await apiStartGRN(id);
      toast.success('Started counting');
      loadData();
    } catch (error) {
      toast.error('Failed to start counting');
    }
  };

  const completeGRN = async (id: string) => {
    try {
      await apiCompleteGRN(id);
      toast.success('GRN completed');
      loadData();
    } catch (error) {
      toast.error('Failed to complete GRN');
    }
  };

  const openDiscrepancyModal = (grn: GRN) => {
    setSelectedGRNForDiscrepancy(grn);
    setDiscrepancyNotes('');
    setDiscrepancyType('quantity');
    setShowDiscrepancyModal(true);
  };

  const closeDiscrepancyModal = () => {
    setShowDiscrepancyModal(false);
    setSelectedGRNForDiscrepancy(null);
    setDiscrepancyNotes('');
  };

  const submitDiscrepancy = async () => {
    if (!selectedGRNForDiscrepancy) return;
    setSubmittingDiscrepancy(true);
    try {
      await apiLogGRNDiscrepancy(selectedGRNForDiscrepancy.id, {
        notes: discrepancyNotes || 'GRN discrepancy logged',
        type: discrepancyType,
      });
      toast.success('Discrepancy logged successfully');
      closeDiscrepancyModal();
      loadData();
    } catch (error) {
      toast.error('Failed to log discrepancy');
    } finally {
      setSubmittingDiscrepancy(false);
    }
  };

  const exportData = () => {
    const today = new Date().toISOString().split('T')[0];
    const csvData = [
      ['Inbound Operations Report', `Date: ${today}`],
      [''],
      ['GRN Number', 'Vendor', 'Status', 'Items', 'Timestamp'],
      ...grns.map(g => [g.poNumber, g.vendor, g.status, g.items?.toString() || '0', g.timestamp]),
      [''],
      ['Dock Schedule'],
      ['Dock', 'Status', 'Vehicle/Vendor'],
      ...dockSlots.map(d => [d.name, d.status, d.truck || d.vendor || 'N/A']),
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inbound-ops-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredGRNs = grns.filter(g => 
    g.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.vendor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = grns.filter(g => g.status === 'pending').length;
  const putawayCount = grns.filter(g => g.status === 'completed').length;

  if (loading && grns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891b2]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        title="Inbound Operations"
        subtitle="Manage goods receiving notes (GRN), dock schedules, and inbound quality checks"
        actions={
          <div className="flex gap-3">
          <button 
            onClick={exportData}
            className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC] flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>
          <button 
            onClick={() => setShowGRNModal(true)}
            className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
          >
            <ClipboardList size={16} />
            Create GRN
          </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
            <ArrowDownToLine size={24} />
          </div>
          <div>
            <p className="text-[#64748B] text-sm font-medium">Pending GRNs</p>
            <h3 className="text-2xl font-bold text-[#1E293B]">{pendingCount}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
            <Truck size={24} />
          </div>
          <div>
            <p className="text-[#64748B] text-sm font-medium">Dock Utilization</p>
            <h3 className="text-2xl font-bold text-[#1E293B]">
              {dockSlots.length ? Math.round((dockSlots.filter(d => d.status === 'active').length / dockSlots.length) * 100) : 0}%
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-cyan-100 text-cyan-700 rounded-lg">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[#64748B] text-sm font-medium">Putaway Pending</p>
            <h3 className="text-2xl font-bold text-[#1E293B]">{putawayCount * 4} Pallets</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dock Schedule */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
            <h3 className="font-bold text-[#1E293B]">Dock Schedule</h3>
            <button className="text-xs text-[#0891b2] hover:underline font-medium">Manage Docks</button>
          </div>
          <div className="p-4 space-y-3">
            {dockSlots.length === 0 ? (
              <div className="py-8 text-center text-[#64748B] text-sm">No dock slots configured</div>
            ) : dockSlots.map(dock => (
              <div 
                key={dock.id}
                className={`flex items-center justify-between p-3 border border-[#E2E8F0] rounded-lg ${
                  dock.status === 'active' ? 'bg-green-50 border-green-200' :
                  dock.status === 'offline' ? 'bg-amber-50 border-amber-200' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 flex items-center justify-center rounded font-bold text-xs ${
                    dock.status === 'active' ? 'bg-green-200 text-green-700' :
                    dock.status === 'offline' ? 'bg-amber-200 text-amber-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {dock.id}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1E293B]">
                      {dock.status === 'active' ? `Unloading: ${dock.vendor}` :
                       dock.status === 'offline' ? 'Maintenance' : `Scheduled: ${dock.vendor}`}
                    </p>
                    <p className="text-xs text-[#64748B]">
                      {dock.truck ? `Vehicle: ${dock.truck}` :
                       dock.eta ? `ETA: ${dock.eta}` : 'Technician Assigned'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold ${
                  dock.status === 'active' ? 'text-green-700' :
                  dock.status === 'offline' ? 'text-amber-700' : 'text-gray-500'
                }`}>
                  {dock.status === 'active' ? 'In Progress' :
                   dock.status === 'offline' ? 'Offline' : 'Empty'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* GRN Queue */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h3 className="font-bold text-[#1E293B] mb-3">GRN Processing Queue</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search GRN or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredGRNs.length === 0 ? (
                  <tr>
                    <td colSpan={1} className="px-6 py-8 text-center text-[#64748B]">No GRNs found</td>
                  </tr>
                ) : filteredGRNs.map(grn => (
                  <tr key={grn.id} className="hover:bg-[#F8FAFC]">
                    <td className="p-4">
                      <div className="flex justify-between mb-1">
                        <span className="font-bold text-[#1E293B]">{grn.poNumber}</span>
                        <span className={`text-xs font-bold flex items-center gap-1 ${
                          grn.status === 'discrepancy' ? 'text-red-600' :
                          grn.status === 'completed' ? 'text-green-600' :
                          grn.status === 'in-progress' ? 'text-blue-600' : 'text-[#64748B]'
                        }`}>
                          {grn.status === 'discrepancy' && <AlertOctagon size={12}/>}
                          {grn.status === 'completed' && <CheckCircle2 size={12}/>}
                          {grn.status === 'discrepancy' ? 'Discrepancy' :
                           grn.status === 'completed' ? 'Completed' :
                           grn.status === 'in-progress' ? 'Counting' : grn.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mb-2">Vendor: {grn.vendor} • {grn.items} items</p>
                      <div className="flex gap-2">
                        {grn.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => startCount(grn.id)}
                              className="px-2 py-1 bg-[#0891b2] text-white text-xs rounded hover:bg-[#06b6d4]"
                            >
                              Start Count
                            </button>
                            <button className="px-2 py-1 bg-white border border-[#E2E8F0] text-[#1E293B] text-xs rounded hover:bg-[#F1F5F9]">
                              Docs
                            </button>
                          </>
                        )}
                        {grn.status === 'in-progress' && (
                          <button 
                            onClick={() => completeGRN(grn.id)}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Complete
                          </button>
                        )}
                        {grn.status === 'discrepancy' && (
                          <button
                            onClick={() => openDiscrepancyModal(grn)}
                            className="px-2 py-1 bg-white border border-red-200 text-red-600 text-xs rounded hover:bg-red-50"
                          >
                            Log Issue
                          </button>
                        )}
                        {grn.status === 'completed' && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">
                            ✓ Processed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Log Discrepancy Modal */}
      {showDiscrepancyModal && selectedGRNForDiscrepancy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Log GRN Discrepancy</h3>
              <button onClick={closeDiscrepancyModal} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#64748B]">
                GRN: <strong>{selectedGRNForDiscrepancy.poNumber}</strong> • Vendor: {selectedGRNForDiscrepancy.vendor}
              </p>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Discrepancy Type</label>
                <select
                  value={discrepancyType}
                  onChange={(e) => setDiscrepancyType(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="quantity">Quantity mismatch</option>
                  <option value="damage">Damage</option>
                  <option value="wrong_sku">Wrong SKU</option>
                  <option value="missing">Missing items</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Notes (required)</label>
                <textarea
                  placeholder="Describe the discrepancy..."
                  value={discrepancyNotes}
                  onChange={(e) => setDiscrepancyNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button
                onClick={closeDiscrepancyModal}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                onClick={submitDiscrepancy}
                disabled={submittingDiscrepancy || !discrepancyNotes.trim()}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingDiscrepancy ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create GRN Modal */}
      {showGRNModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Create New GRN</h3>
              <button onClick={() => setShowGRNModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">PO Number</label>
                <input 
                  type="text"
                  placeholder="PO-XXXX"
                  value={newGRNData.poNumber}
                  onChange={(e) => setNewGRNData({...newGRNData, poNumber: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Vendor Name</label>
                <input 
                  type="text"
                  placeholder="Enter vendor name"
                  value={newGRNData.vendor}
                  onChange={(e) => setNewGRNData({...newGRNData, vendor: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Number of Items</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={newGRNData.items}
                  onChange={(e) => setNewGRNData({...newGRNData, items: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowGRNModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={createGRN}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Create GRN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}