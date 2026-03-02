import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Layers, Clock, Download, X, Plus, Loader2 } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import { fetchPlans, createPlan as createPlanApi, type ProductionPlan } from '../../../api/productionApi';

export function ProductionPlanning() {
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlans();
      setPlans(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plans');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [newPlan, setNewPlan] = useState({
    product: '',
    line: '',
    startDate: '',
    endDate: '',
    quantity: '',
  });

  const createPlan = async () => {
    if (!newPlan.product || !newPlan.line || !newPlan.startDate || !newPlan.quantity) {
      toast.error('Product, line, start date, and quantity are required');
      return;
    }
    try {
      await createPlanApi({
        product: newPlan.product,
        line: newPlan.line,
        startDate: newPlan.startDate,
        endDate: newPlan.endDate || newPlan.startDate,
        quantity: parseInt(newPlan.quantity, 10) || 0,
      });
      setNewPlan({ product: '', line: '', startDate: '', endDate: '', quantity: '' });
      setShowPlanModal(false);
      toast.success('Production plan created successfully!');
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create plan');
    }
  };

  const exportSchedule = () => {
    const today = new Date().toISOString().split('T')[0];
    const csvData = [
      ['Production Planning Schedule', `Date: ${today}`],
      [''],
      ['Product', 'Line', 'Start Date', 'End Date', 'Quantity', 'Status'],
      ...plans.map(p => [p.product, p.line, p.startDate, p.endDate, p.quantity.toString(), p.status]),
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-schedule-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Planning"
        subtitle="Demand forecasting and capacity planning"
        actions={
          <>
            <button 
              onClick={exportSchedule}
              className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
            >
              <Download size={16} />
              Export Schedule
            </button>
            <button 
              onClick={() => setShowPlanModal(true)}
              className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] flex items-center gap-2"
            >
              <Plus size={16} />
              Create Plan
            </button>
          </>
        }
      />

      {/* Schedule Table */}
      <div className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA]">
          <h3 className="font-bold text-[#212121]">Production Schedule</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
            <tr>
              <th className="px-6 py-3">Product</th>
              <th className="px-6 py-3">Line</th>
              <th className="px-6 py-3">Start Date</th>
              <th className="px-6 py-3">End Date</th>
              <th className="px-6 py-3">Quantity</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E0E0E0]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-[#757575]">
                  <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-[#EF4444]">{error}</td>
              </tr>
            ) : plans.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-[#757575]">No plans yet. Create your first plan.</td>
              </tr>
            ) : plans.map(plan => (
              <tr key={plan.id} className="hover:bg-[#FAFAFA]">
                <td className="px-6 py-4 font-medium text-[#212121]">{plan.product}</td>
                <td className="px-6 py-4 text-[#616161]">{plan.line}</td>
                <td className="px-6 py-4 text-[#616161]">{plan.startDate}</td>
                <td className="px-6 py-4 text-[#616161]">{plan.endDate}</td>
                <td className="px-6 py-4 text-[#212121]">{plan.quantity.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    plan.status === 'completed' ? 'bg-[#DCFCE7] text-[#166534]' :
                    plan.status === 'in-progress' ? 'bg-[#DBEAFE] text-[#1E40AF]' :
                    'bg-[#F3F4F6] text-[#6B7280]'
                  }`}>
                    {plan.status === 'in-progress' ? 'In Progress' : plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                  </span>
                </td>
              </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#E0E0E0] p-6 shadow-sm">
          <h3 className="font-bold text-[#212121] mb-4 flex items-center gap-2">
            <Layers size={18} /> Capacity Utilization
          </h3>
          <div className="text-sm text-[#757575] py-4">
            Capacity utilization by line will appear here when the backend provides capacity data. Create production plans to populate the schedule above.
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E0E0E0] p-6 shadow-sm">
          <h3 className="font-bold text-[#212121] mb-4 flex items-center gap-2">
            <Clock size={18} /> Lead Times
          </h3>
          <div className="space-y-3">
            {plans.length > 0 ? (
              [...new Set(plans.map(p => p.product))].slice(0, 5).map(product => (
                <div key={product} className="flex justify-between items-center p-3 bg-[#F5F5F5] rounded-lg">
                  <span className="text-sm font-medium">{product}</span>
                  <span className="text-sm font-bold text-[#16A34A]">—</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-[#757575] py-4">
                Lead times will appear when production plans and backend lead-time data are available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Create Production Plan</h3>
              <button onClick={() => setShowPlanModal(false)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Product</label>
                <input 
                  type="text"
                  placeholder="e.g., Organic Oats"
                  value={newPlan.product}
                  onChange={(e) => setNewPlan({...newPlan, product: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Production Line</label>
                <select 
                  value={newPlan.line}
                  onChange={(e) => setNewPlan({...newPlan, line: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                >
                  <option value="">Select line</option>
                  <option>Line A (Assembly)</option>
                  <option>Line B (Packaging)</option>
                  <option>Line C (Bottling)</option>
                  <option>Line D (Processing)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Start Date</label>
                  <input 
                    type="date"
                    value={newPlan.startDate}
                    onChange={(e) => setNewPlan({...newPlan, startDate: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">End Date</label>
                  <input 
                    type="date"
                    value={newPlan.endDate}
                    onChange={(e) => setNewPlan({...newPlan, endDate: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Quantity</label>
                <input 
                  type="number"
                  placeholder="5000"
                  value={newPlan.quantity}
                  onChange={(e) => setNewPlan({...newPlan, quantity: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowPlanModal(false)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button 
                onClick={createPlan}
                className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D]"
              >
                Create Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}