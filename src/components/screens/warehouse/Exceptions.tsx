import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertOctagon, XCircle, Search, X, Download, Plus } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { EmptyState } from '../../ui/ux-components';
import { toast } from 'sonner';
import { 
  fetchExceptions, 
  reportException, 
  updateExceptionStatus, 
  rejectExceptionShipment, 
  acceptExceptionPartial,
  Exception 
} from './warehouseApi';

export function Exceptions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exceptions, setExceptions] = useState<Exception[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchExceptions();
      setExceptions(data);
    } catch (error) {
      toast.error('Failed to load exceptions');
    } finally {
      setLoading(false);
    }
  };

  const [newException, setNewException] = useState({
    priority: 'medium' as const,
    category: 'inbound' as const,
    title: '',
    description: '',
  });

  const updateStatus = async (id: string, newStatus: Exception['status']) => {
    try {
      await updateExceptionStatus(id, newStatus);
      toast.success(`Exception ${newStatus}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const rejectShipment = async (id: string) => {
    try {
      await rejectExceptionShipment(id);
      toast.success('Shipment rejected and vendor notified');
      loadData();
    } catch (error) {
      toast.error('Failed to reject shipment');
    }
  };

  const acceptPartial = async (id: string) => {
    const qty = prompt('Enter accepted quantity:');
    if (qty && !isNaN(Number(qty))) {
      try {
        await acceptExceptionPartial(id, Number(qty));
        toast.success('Partial shipment accepted');
        loadData();
      } catch (error) {
        toast.error('Failed to accept partial shipment');
      }
    }
  };

  const createException = async () => {
    if (newException.title && newException.description) {
      try {
        await reportException({
          ...newException,
          reportedBy: 'System Administrator'
        });
        toast.success('Exception logged successfully');
        setNewException({ priority: 'medium', category: 'inbound', title: '', description: '' });
        setShowAddModal(false);
        loadData();
      } catch (error) {
        toast.error('Failed to log exception');
      }
    }
  };

  const exportData = () => {
    const today = new Date().toISOString().split('T')[0];
    const csvData = [
      ['Exception Management Report', `Date: ${today}`],
      [''],
      ['Exception ID', 'Priority', 'Category', 'Title', 'Description', 'Status', 'Timestamp'],
      ...exceptions.map(e => [
        e.id,
        e.priority,
        e.category,
        e.title,
        e.description,
        e.status,
        e.timestamp
      ]),
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exceptions-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredExceptions = exceptions.filter(e =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const criticalExceptions = filteredExceptions.filter(e => e.priority === 'critical');
  const mediumExceptions = filteredExceptions.filter(e => e.priority === 'medium');
  const lowExceptions = filteredExceptions.filter(e => e.priority === 'low');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891b2]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exception Management"
        subtitle="Handle discrepancies, damage reports, and operational errors"
        actions={[
          <div key="search" className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
            <input 
              type="text" 
              placeholder="Search exceptions..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 pr-4 rounded-lg bg-white border border-[#E2E8F0] text-sm w-64 text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
            />
          </div>,
          <button 
            key="export"
            onClick={exportData}
            className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC] flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>,
          <button 
            key="log"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <Plus size={16} />
            Log Exception
          </button>
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertOctagon size={16} className="text-red-600" />
            <span className="text-xs font-bold text-[#64748B] uppercase">Critical</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{exceptions.filter(e => e.priority === 'critical' && e.status !== 'resolved').length}</p>
          <p className="text-xs text-[#64748B]">Immediate Action</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-amber-600" />
            <span className="text-xs font-bold text-[#64748B] uppercase">Medium</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{exceptions.filter(e => e.priority === 'medium' && e.status !== 'resolved').length}</p>
          <p className="text-xs text-[#64748B]">Requires Review</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className="text-green-600" />
            <span className="text-xs font-bold text-[#64748B] uppercase">Resolved</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{exceptions.filter(e => e.status === 'resolved').length}</p>
          <p className="text-xs text-[#64748B]">Closed Today</p>
        </div>
      </div>

      <div className="space-y-4">
        {filteredExceptions.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm p-12">
            <EmptyState title="No exceptions" message="Log an exception or view will show records here when they exist." />
          </div>
        ) : (
        <>
        {/* Critical Priority */}
        {criticalExceptions.length > 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-red-50 border-b border-red-100 flex items-center gap-3">
              <AlertOctagon size={20} className="text-red-600" />
              <h3 className="font-bold text-red-900">Critical Priority ({criticalExceptions.length})</h3>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {criticalExceptions.map(exception => (
                <div key={exception.id} className="p-4 flex gap-4 items-start">
                  <div className="p-2 bg-red-100 rounded-lg text-red-600 font-bold text-xs w-20 text-center shrink-0 uppercase">
                    {exception.category}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <h4 className="font-bold text-[#1E293B]">{exception.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded font-bold ${
                          exception.status === 'resolved' ? 'bg-green-100 text-green-700' :
                          exception.status === 'investigating' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {exception.status.charAt(0).toUpperCase() + exception.status.slice(1)}
                        </span>
                        <span className="text-xs text-[#64748B]">{exception.timestamp}</span>
                      </div>
                    </div>
                    <p className="text-sm text-[#64748B] mb-3">{exception.description}</p>
                    {exception.status !== 'resolved' && (
                      <div className="flex gap-2">
                        {exception.category === 'inbound' && exception.status === 'open' && (
                          <>
                            <button 
                              onClick={() => rejectShipment(exception.id)}
                              className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700"
                            >
                              Reject Shipment
                            </button>
                            <button 
                              onClick={() => acceptPartial(exception.id)}
                              className="px-3 py-1.5 bg-white border border-[#E2E8F0] text-[#1E293B] text-xs font-bold rounded hover:bg-[#F8FAFC]"
                            >
                              Accept Partial
                            </button>
                          </>
                        )}
                        {exception.category === 'inventory' && exception.status === 'open' && (
                          <>
                            <button 
                              onClick={() => updateStatus(exception.id, 'investigating')}
                              className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700"
                            >
                              Log Incident
                            </button>
                            <button 
                              onClick={() => updateStatus(exception.id, 'resolved')}
                              className="px-3 py-1.5 bg-white border border-[#E2E8F0] text-[#1E293B] text-xs font-bold rounded hover:bg-[#F8FAFC]"
                            >
                              Move Stock
                            </button>
                          </>
                        )}
                        {exception.status === 'investigating' && (
                          <button 
                            onClick={() => updateStatus(exception.id, 'resolved')}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medium Priority */}
        {mediumExceptions.length > 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
              <AlertCircle size={20} className="text-amber-600" />
              <h3 className="font-bold text-amber-900">Medium Priority ({mediumExceptions.length})</h3>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {mediumExceptions.map(exception => (
                <div key={exception.id} className="p-4 flex gap-4 items-start">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-600 font-bold text-xs w-20 text-center shrink-0 uppercase">
                    {exception.category}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <h4 className="font-bold text-[#1E293B]">{exception.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded font-bold ${
                          exception.status === 'resolved' ? 'bg-green-100 text-green-700' :
                          exception.status === 'investigating' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {exception.status.charAt(0).toUpperCase() + exception.status.slice(1)}
                        </span>
                        <span className="text-xs text-[#64748B]">{exception.timestamp}</span>
                      </div>
                    </div>
                    <p className="text-sm text-[#64748B] mb-3">{exception.description}</p>
                    {exception.status !== 'resolved' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => updateStatus(exception.id, exception.status === 'open' ? 'investigating' : 'resolved')}
                          className="px-3 py-1.5 bg-white border border-[#E2E8F0] text-[#1E293B] text-xs font-bold rounded hover:bg-[#F8FAFC]"
                        >
                          {exception.status === 'open' ? 'Investigate' : 'Resolve'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low Priority */}
        {lowExceptions.length > 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center gap-3">
              <AlertCircle size={20} className="text-blue-600" />
              <h3 className="font-bold text-blue-900">Low Priority ({lowExceptions.length})</h3>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {lowExceptions.map(exception => (
                <div key={exception.id} className="p-4 flex gap-4 items-start">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600 font-bold text-xs w-20 text-center shrink-0 uppercase">
                    {exception.category}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <h4 className="font-bold text-[#1E293B]">{exception.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded font-bold ${
                          exception.status === 'resolved' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {exception.status.charAt(0).toUpperCase() + exception.status.slice(1)}
                        </span>
                        <span className="text-xs text-[#64748B]">{exception.timestamp}</span>
                      </div>
                    </div>
                    <p className="text-sm text-[#64748B]">{exception.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {/* Add Exception Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Log New Exception</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Priority</label>
                <select 
                  value={newException.priority}
                  onChange={(e) => setNewException({...newException, priority: e.target.value as any})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="low">Low - Can Wait</option>
                  <option value="medium">Medium - Needs Review</option>
                  <option value="critical">Critical - Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Category</label>
                <select 
                  value={newException.category}
                  onChange={(e) => setNewException({...newException, category: e.target.value as any})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="inbound">Inbound</option>
                  <option value="inventory">Inventory</option>
                  <option value="outbound">Outbound</option>
                  <option value="qc">QC</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Title</label>
                <input 
                  type="text"
                  placeholder="Brief description"
                  value={newException.title}
                  onChange={(e) => setNewException({...newException, title: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Description</label>
                <textarea 
                  placeholder="Detailed explanation..."
                  value={newException.description}
                  onChange={(e) => setNewException({...newException, description: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2] resize-none"
                  rows={4}
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={createException}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
              >
                Log Exception
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
