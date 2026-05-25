import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Clock, Download, X, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import {
  fetchPlans,
  createPlan,
  updatePlan,
  deletePlan,
  fetchProductionOverview,
  type ProductionPlan,
} from '../../../api/productionApi';
import { useProductionFactory } from '../../../contexts/ProductionFactoryContext';

export function ProductionPlanning() {
  const { selectedFactoryId } = useProductionFactory();
  const [planFormMode, setPlanFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<ProductionPlan | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [lineOptions, setLineOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const emptyPlanForm = () => ({
    product: '',
    line: '',
    startDate: '',
    endDate: '',
    quantity: '',
    status: 'scheduled' as ProductionPlan['status'],
  });

  const [planForm, setPlanForm] = useState(emptyPlanForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!selectedFactoryId) {
        setPlans([]);
        setLineOptions([]);
        return;
      }
      const [planData, overview] = await Promise.all([
        fetchPlans(selectedFactoryId),
        fetchProductionOverview(selectedFactoryId).catch(() => ({ lines: [] })),
      ]);
      setPlans(planData ?? []);
      const lines = (overview.lines ?? []).map((l) => l.name).filter(Boolean);
      setLineOptions(lines.length > 0 ? lines : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plans');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFactoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreatePlan = () => {
    setEditingPlanId(null);
    setPlanForm(emptyPlanForm());
    setPlanFormMode('create');
  };

  const openEditPlan = (plan: ProductionPlan) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      product: plan.product,
      line: plan.line,
      startDate: plan.startDate,
      endDate: plan.endDate,
      quantity: String(plan.quantity),
      status: plan.status,
    });
    setPlanFormMode('edit');
  };

  const closePlanForm = () => {
    setPlanFormMode(null);
    setEditingPlanId(null);
    setPlanForm(emptyPlanForm());
  };

  const savePlanForm = async () => {
    if (!selectedFactoryId) {
      toast.error('Select a factory first');
      return;
    }
    if (!planForm.product.trim() || !planForm.line.trim() || !planForm.startDate || !planForm.quantity) {
      toast.error('Product, line, start date, and quantity are required');
      return;
    }
    const quantity = parseInt(planForm.quantity, 10);
    if (isNaN(quantity) || quantity < 1) {
      toast.error('Quantity must be a positive number');
      return;
    }

    const payload = {
      product: planForm.product.trim(),
      line: planForm.line.trim(),
      startDate: planForm.startDate,
      endDate: planForm.endDate || planForm.startDate,
      quantity,
      status: planForm.status,
    };

    setSavingPlan(true);
    try {
      if (planFormMode === 'create') {
        await createPlan(payload, selectedFactoryId);
        toast.success('Production plan created successfully');
      } else if (planFormMode === 'edit' && editingPlanId) {
        await updatePlan(editingPlanId, payload, selectedFactoryId);
        toast.success('Production plan updated successfully');
      }
      closePlanForm();
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete || !selectedFactoryId) return;
    setSavingPlan(true);
    try {
      await deletePlan(planToDelete.id, selectedFactoryId);
      toast.success('Production plan deleted');
      setPlanToDelete(null);
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const exportSchedule = () => {
    const today = new Date().toISOString().split('T')[0];
    const csvData = [
      ['Production Planning Schedule', `Date: ${today}`],
      [''],
      ['Product', 'Line', 'Start Date', 'End Date', 'Quantity', 'Status'],
      ...plans.map((p) => [p.product, p.line, p.startDate, p.endDate, p.quantity.toString(), p.status]),
    ];

    const csv = csvData.map((row) => row.join(',')).join('\n');
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

  const statusLabel = (status: ProductionPlan['status']) => {
    if (status === 'in-progress') return 'In Progress';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Planning"
        subtitle="Demand forecasting and capacity planning"
        actions={
          <>
            <button
              type="button"
              onClick={exportSchedule}
              className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
            >
              <Download size={16} />
              Export Schedule
            </button>
            <button
              type="button"
              onClick={openCreatePlan}
              disabled={!selectedFactoryId}
              className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              Create Plan
            </button>
          </>
        }
      />

      <div className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
          <h3 className="font-bold text-[#212121]">Production Schedule</h3>
          <span className="text-xs text-[#757575]">{plans.length} plan{plans.length !== 1 ? 's' : ''}</span>
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
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E0E0E0]">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-[#757575]">
                  <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-[#EF4444]">{error}</td>
              </tr>
            ) : plans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-[#757575]">
                  {!selectedFactoryId
                    ? 'Select a factory to view production plans.'
                    : 'No plans yet. Create your first plan.'}
                </td>
              </tr>
            ) : (
              plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-6 py-4 font-medium text-[#212121]">{plan.product}</td>
                  <td className="px-6 py-4 text-[#616161]">{plan.line}</td>
                  <td className="px-6 py-4 text-[#616161]">{plan.startDate}</td>
                  <td className="px-6 py-4 text-[#616161]">{plan.endDate}</td>
                  <td className="px-6 py-4 text-[#212121]">{plan.quantity.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        plan.status === 'completed'
                          ? 'bg-[#DCFCE7] text-[#166534]'
                          : plan.status === 'in-progress'
                            ? 'bg-[#DBEAFE] text-[#1E40AF]'
                            : 'bg-[#F3F4F6] text-[#6B7280]'
                      }`}
                    >
                      {statusLabel(plan.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditPlan(plan)}
                        className="p-1.5 text-[#616161] hover:text-[#212121] hover:bg-[#F5F5F5] rounded-lg"
                        aria-label={`Edit plan for ${plan.product}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanToDelete(plan)}
                        className="p-1.5 text-[#EF4444] hover:text-[#DC2626] hover:bg-red-50 rounded-lg"
                        aria-label={`Delete plan for ${plan.product}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#E0E0E0] p-6 shadow-sm">
          <h3 className="font-bold text-[#212121] mb-4 flex items-center gap-2">
            <Layers size={18} /> Capacity Utilization
          </h3>
          <div className="text-sm text-[#757575] py-4">
            Capacity utilization by line will appear here when the backend provides capacity data. Create
            production plans to populate the schedule above.
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E0E0E0] p-6 shadow-sm">
          <h3 className="font-bold text-[#212121] mb-4 flex items-center gap-2">
            <Clock size={18} /> Lead Times
          </h3>
          <div className="space-y-3">
            {plans.length > 0 ? (
              [...new Set(plans.map((p) => p.product))].slice(0, 5).map((product) => (
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

      {planFormMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-[#212121]">
                {planFormMode === 'create' ? 'Create Production Plan' : 'Edit Production Plan'}
              </h3>
              <button type="button" onClick={closePlanForm} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Product</label>
                <input
                  type="text"
                  placeholder="e.g., Organic Oats"
                  value={planForm.product}
                  onChange={(e) => setPlanForm({ ...planForm, product: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Production Line</label>
                {lineOptions.length > 0 ? (
                  <select
                    value={planForm.line}
                    onChange={(e) => setPlanForm({ ...planForm, line: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="">Select line</option>
                    {lineOptions.map((line) => (
                      <option key={line} value={line}>
                        {line}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Line name"
                    value={planForm.line}
                    onChange={(e) => setPlanForm({ ...planForm, line: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Start Date</label>
                  <input
                    type="date"
                    value={planForm.startDate}
                    onChange={(e) => setPlanForm({ ...planForm, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">End Date</label>
                  <input
                    type="date"
                    value={planForm.endDate}
                    onChange={(e) => setPlanForm({ ...planForm, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Quantity</label>
                <input
                  type="number"
                  min={1}
                  placeholder="5000"
                  value={planForm.quantity}
                  onChange={(e) => setPlanForm({ ...planForm, quantity: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Status</label>
                <select
                  value={planForm.status}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, status: e.target.value as ProductionPlan['status'] })
                  }
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={closePlanForm}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={savePlanForm}
                disabled={savingPlan}
                className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] disabled:opacity-60 flex items-center gap-2"
              >
                {savingPlan && <Loader2 size={16} className="animate-spin" />}
                {planFormMode === 'create' ? 'Create Plan' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {planToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg text-[#212121] mb-2">Delete production plan?</h3>
            <p className="text-sm text-[#757575] mb-6">
              This will permanently remove the plan for{' '}
              <span className="font-medium text-[#212121]">{planToDelete.product}</span> on{' '}
              {planToDelete.line}.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePlan}
                disabled={savingPlan}
                className="px-4 py-2 bg-[#EF4444] text-white font-medium rounded-lg hover:bg-[#DC2626] disabled:opacity-60 flex items-center gap-2"
              >
                {savingPlan && <Loader2 size={16} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
