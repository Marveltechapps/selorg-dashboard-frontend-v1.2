import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  fetchTaxRules,
  fetchPayoutSchedules,
  fetchCommissionSlabs,
  fetchReconciliationRules,
  fetchRefundPolicies,
  fetchInvoiceSettings,
  fetchPaymentTerms,
  fetchFinancialLimits,
  fetchFinancialYear,
  createTaxRule,
  updateTaxRule,
  createPayoutSchedule,
  updatePayoutSchedule,
  updateCommissionSlab,
  updateReconciliationRule,
  updateRefundPolicy,
  updateInvoiceSettings,
  updatePaymentTerm,
  updateFinancialLimit,
  updateFinancialYear,
  TaxRule,
  PayoutSchedule,
  CommissionSlab,
  ReconciliationRule,
  RefundPolicy,
  InvoiceSettings,
  PaymentTerm,
  FinancialLimit,
  FinancialYear,
} from './financeRulesApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Receipt,
  Wallet,
  RotateCcw,
  RefreshCw,
  FileText,
  Calendar,
  TrendingUp,
  Shield,
  AlertCircle,
  CheckCircle,
  Edit,
  Save,
  X,
  Percent,
  IndianRupee,
  Clock,
  Target,
} from 'lucide-react';

export function FinanceRules() {
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [payoutSchedules, setPayoutSchedules] = useState<PayoutSchedule[]>([]);
  const [commissionSlabs, setCommissionSlabs] = useState<CommissionSlab[]>([]);
  const [reconciliationRules, setReconciliationRules] = useState<ReconciliationRule[]>([]);
  const [refundPolicies, setRefundPolicies] = useState<RefundPolicy[]>([]);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [financialLimits, setFinancialLimits] = useState<FinancialLimit[]>([]);
  const [financialYear, setFinancialYear] = useState<FinancialYear | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editingInvoice, setEditingInvoice] = useState(false);
  const [editingFY, setEditingFY] = useState(false);
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [payoutEditSchedule, setPayoutEditSchedule] = useState<PayoutSchedule | null>(null);
  const [payoutAddOpen, setPayoutAddOpen] = useState(false);
  const [payoutForm, setPayoutForm] = useState<Omit<PayoutSchedule, 'id'>>({
    vendorTier: 'gold',
    cycle: 'weekly',
    processingDay: 'Monday',
    minPayout: 0,
    maxPayout: 0,
    autoApprove: false,
    autoApproveThreshold: 0,
  });
  const [taxForm, setTaxForm] = useState<Omit<TaxRule, 'id'>>({
    name: '',
    type: 'GST',
    rate: 0,
    applicableOn: 'All goods',
    isActive: true,
    effectiveFrom: new Date().toISOString().slice(0, 10),
  });

  const formatDate = (d: string | undefined) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return d;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [taxes, payouts, commissions, recon, refunds, invoice, terms, limits, fy] = await Promise.all([
        fetchTaxRules(),
        fetchPayoutSchedules(),
        fetchCommissionSlabs(),
        fetchReconciliationRules(),
        fetchRefundPolicies(),
        fetchInvoiceSettings(),
        fetchPaymentTerms(),
        fetchFinancialLimits(),
        fetchFinancialYear(),
      ]);
      setTaxRules(taxes);
      setPayoutSchedules(payouts);
      setCommissionSlabs(commissions);
      setReconciliationRules(recon);
      setRefundPolicies(refunds);
      setInvoiceSettings(invoice);
      setPaymentTerms(terms);
      setFinancialLimits(limits);
      setFinancialYear(fy);
    } catch (error) {
      toast.error('Failed to load finance rules');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTaxRule = async (id: string, currentStatus: boolean) => {
    try {
      await updateTaxRule(id, { isActive: !currentStatus });
      toast.success(`Tax rule ${!currentStatus ? 'enabled' : 'disabled'}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update tax rule');
    }
  };

  const handleUpdatePayoutSchedule = async (id: string, field: keyof PayoutSchedule, value: any) => {
    try {
      await updatePayoutSchedule(id, { [field]: value });
      toast.success('Payout schedule updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update payout schedule');
    }
  };

  const handleUpdateCommission = async (id: string, rate: number) => {
    try {
      await updateCommissionSlab(id, { commissionRate: rate });
      toast.success('Commission rate updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update commission');
    }
  };

  const handleToggleReconciliation = async (id: string, field: 'autoReconcile' | 'notifyOnMismatch', currentValue: boolean) => {
    try {
      await updateReconciliationRule(id, { [field]: !currentValue });
      toast.success('Reconciliation rule updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update reconciliation rule');
    }
  };

  const handleSaveInvoiceSettings = async () => {
    if (!invoiceSettings) return;
    try {
      await updateInvoiceSettings(invoiceSettings);
      toast.success('Invoice settings saved');
      setEditingInvoice(false);
    } catch (error) {
      toast.error('Failed to save invoice settings');
    }
  };

  const handleSaveFinancialYear = async () => {
    if (!financialYear) return;
    try {
      await updateFinancialYear(financialYear);
      toast.success('Financial year settings saved');
      setEditingFY(false);
    } catch (error) {
      toast.error('Failed to save financial year');
    }
  };

  const handleSetDefaultTerm = async (id: string) => {
    try {
      for (const term of paymentTerms) {
        if (term.isDefault) await updatePaymentTerm(term.id, { isDefault: false });
      }
      await updatePaymentTerm(id, { isDefault: true });
      toast.success('Default payment term updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update default term');
    }
  };

  const handleCreateTaxRule = async () => {
    if (!taxForm.name || taxForm.rate < 0) {
      toast.error('Name and rate are required');
      return;
    }
    try {
      await createTaxRule({ ...taxForm, effectiveFrom: taxForm.effectiveFrom || new Date().toISOString().slice(0, 10) });
      toast.success('Tax rule created');
      setTaxModalOpen(false);
      setTaxForm({ name: '', type: 'GST', rate: 0, applicableOn: 'All goods', isActive: true, effectiveFrom: new Date().toISOString().slice(0, 10) });
      loadData();
    } catch (error) {
      toast.error('Failed to create tax rule');
    }
  };

  const handleSavePayoutSchedule = async () => {
    if (!payoutEditSchedule) return;
    try {
      await updatePayoutSchedule(payoutEditSchedule.id, payoutEditSchedule);
      toast.success('Payout schedule updated');
      setPayoutEditSchedule(null);
      loadData();
    } catch (error) {
      toast.error('Failed to update payout schedule');
    }
  };

  const handleCreatePayoutSchedule = async () => {
    try {
      await createPayoutSchedule(payoutForm);
      toast.success('Payout schedule created');
      setPayoutAddOpen(false);
      setPayoutForm({ vendorTier: 'gold', cycle: 'weekly', processingDay: 'Monday', minPayout: 0, maxPayout: 0, autoApprove: false, autoApproveThreshold: 0 });
      loadData();
    } catch (error) {
      toast.error('Failed to create payout schedule');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-[#71717a]">Loading finance rules...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Finance Rules & Configuration</h1>
          <p className="text-[#71717a] text-sm">Manage tax, payouts, reconciliation, and financial policies</p>
        </div>
        <Button size="sm" onClick={loadData} variant="outline">
          <RefreshCw size={14} className="mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Active Tax Rules</p>
            <Receipt className="text-[#e11d48]" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{taxRules.filter(t => t.isActive).length}</p>
          <p className="text-xs text-[#71717a] mt-1">of {taxRules.length} total</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Payout Cycles</p>
            <Wallet className="text-emerald-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{payoutSchedules.length}</p>
          <p className="text-xs text-[#71717a] mt-1">vendor tiers</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Commission Slabs</p>
            <Percent className="text-blue-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{commissionSlabs.length}</p>
          <p className="text-xs text-[#71717a] mt-1">active rates</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Financial Year</p>
            <Calendar className="text-purple-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{financialYear?.currentYear ?? '—'}</p>
          <p className="text-xs text-[#71717a] mt-1">{financialYear ? `Month ${financialYear.startMonth} • Day ${financialYear.startDay}` : 'Not configured'}</p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="tax" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tax">
            <Receipt size={14} className="mr-1.5" /> Tax Rules
          </TabsTrigger>
          <TabsTrigger value="payout">
            <Wallet size={14} className="mr-1.5" /> Payouts
          </TabsTrigger>
          <TabsTrigger value="commission">
            <Percent size={14} className="mr-1.5" /> Commission
          </TabsTrigger>
          <TabsTrigger value="reconciliation">
            <RotateCcw size={14} className="mr-1.5" /> Reconciliation
          </TabsTrigger>
          <TabsTrigger value="refund">
            <RefreshCw size={14} className="mr-1.5" /> Refunds
          </TabsTrigger>
          <TabsTrigger value="invoice">
            <FileText size={14} className="mr-1.5" /> Invoicing
          </TabsTrigger>
          <TabsTrigger value="terms">
            <Calendar size={14} className="mr-1.5" /> Payment Terms
          </TabsTrigger>
          <TabsTrigger value="limits">
            <Shield size={14} className="mr-1.5" /> Limits
          </TabsTrigger>
        </TabsList>

        {/* Tax Rules Tab */}
        <TabsContent value="tax">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#18181b]">Tax Configuration</h3>
                <p className="text-xs text-[#71717a] mt-1">Manage GST, TDS, CESS, and other tax rules</p>
              </div>
              <Button size="sm" onClick={() => setTaxModalOpen(true)}>
                <Receipt size={14} className="mr-1.5" /> Add Tax Rule
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tax Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rate (%)</TableHead>
                    <TableHead>Applicable On</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          rule.type === 'GST' ? 'border-emerald-500 text-emerald-700' :
                          rule.type === 'TDS' ? 'border-blue-500 text-blue-700' :
                          rule.type === 'CESS' ? 'border-amber-500 text-amber-700' :
                          'border-purple-500 text-purple-700'
                        }>
                          {rule.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold">{rule.rate}%</TableCell>
                      <TableCell className="text-[#71717a]">{rule.applicableOn}</TableCell>
                      <TableCell className="text-[#71717a]">
                        {rule.threshold ? `₹${rule.threshold.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-[#71717a]">{formatDate(rule.effectiveFrom)}</TableCell>
                      <TableCell>
                        <Badge className={rule.isActive ? 'bg-emerald-500' : 'bg-gray-500'}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => handleToggleTaxRule(rule.id, rule.isActive)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {taxRules.length === 0 && (
                <div className="p-8 text-center text-[#71717a] text-sm">
                  No tax rules yet. Add a tax rule to get started.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Payout Schedules Tab */}
        <TabsContent value="payout">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#18181b]">Vendor Payout Schedules</h3>
                <p className="text-xs text-[#71717a] mt-1">Configure payout cycles by vendor tier</p>
              </div>
              <Button size="sm" onClick={() => setPayoutAddOpen(true)}>
                <Wallet size={14} className="mr-1.5" /> Add Payout Schedule
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {payoutSchedules.map((schedule) => (
                <div key={schedule.id} className="border border-[#e4e4e7] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        schedule.vendorTier === 'platinum' ? 'bg-purple-100' :
                        schedule.vendorTier === 'gold' ? 'bg-amber-100' :
                        schedule.vendorTier === 'silver' ? 'bg-gray-100' :
                        'bg-orange-100'
                      }`}>
                        <TrendingUp className={
                          schedule.vendorTier === 'platinum' ? 'text-purple-600' :
                          schedule.vendorTier === 'gold' ? 'text-amber-600' :
                          schedule.vendorTier === 'silver' ? 'text-gray-600' :
                          'text-orange-600'
                        } size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#18181b] capitalize">{schedule.vendorTier} Tier</h4>
                        <p className="text-sm text-[#71717a] capitalize">{schedule.cycle} Payout • {schedule.processingDay}</p>
                      </div>
                    </div>
                    <Badge className={schedule.autoApprove ? 'bg-emerald-500' : 'bg-amber-500'}>
                      {schedule.autoApprove ? 'Auto-Approve' : 'Manual Approval'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-[#71717a] mb-1">Min Payout</p>
                      <p className="font-bold text-[#18181b]">₹{schedule.minPayout.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#71717a] mb-1">Max Payout</p>
                      <p className="font-bold text-[#18181b]">₹{schedule.maxPayout.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#71717a] mb-1">Auto-Approve Threshold</p>
                      <p className="font-bold text-[#18181b]">
                        {schedule.autoApprove ? `₹${schedule.autoApproveThreshold.toLocaleString()}` : '-'}
                      </p>
                    </div>
                    <div className="flex items-end justify-end">
                      <Button size="sm" variant="outline" onClick={() => setPayoutEditSchedule(schedule)}>
                        <Edit size={14} className="mr-1.5" /> Edit Schedule
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {payoutSchedules.length === 0 && (
                <div className="p-8 text-center text-[#71717a] text-sm">
                  No payout schedules yet. Add a payout schedule to get started.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Commission Structure Tab */}
        <TabsContent value="commission">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Commission Structure</h3>
              <p className="text-xs text-[#71717a] mt-1">Category and vendor tier-based commission rates</p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor Tier</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead>Order Value Range</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissionSlabs.map((slab) => (
                    <TableRow key={slab.id}>
                      <TableCell className="font-medium">{slab.category}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          slab.vendorTier === 'platinum' ? 'border-purple-500 text-purple-700' :
                          slab.vendorTier === 'gold' ? 'border-amber-500 text-amber-700' :
                          slab.vendorTier === 'silver' ? 'border-gray-500 text-gray-700' :
                          'border-orange-500 text-orange-700'
                        }>
                          {slab.vendorTier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-bold text-[#e11d48]">{slab.commissionRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#71717a]">
                        ₹{slab.minOrderValue.toLocaleString()} - ₹{slab.maxOrderValue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-[#71717a]">{formatDate(slab.effectiveFrom)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost">
                          <Edit size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {commissionSlabs.length === 0 && (
                <div className="p-8 text-center text-[#71717a] text-sm">
                  No commission slabs yet. Add via backend or admin tools.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Reconciliation Tab */}
        <TabsContent value="reconciliation">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Reconciliation Rules</h3>
              <p className="text-xs text-[#71717a] mt-1">Auto-reconciliation and tolerance settings</p>
            </div>

            <div className="p-6 space-y-3">
              {reconciliationRules.map((rule) => (
                <div key={rule.id} className="border border-[#e4e4e7] rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-[#18181b]">{rule.name}</h4>
                        <Badge variant="outline" className="capitalize">{rule.type}</Badge>
                        <Badge className={rule.autoReconcile ? 'bg-emerald-500' : 'bg-amber-500'}>
                          {rule.autoReconcile ? 'Auto-Reconcile' : 'Manual'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-[#71717a]">Tolerance Amount</p>
                          <p className="font-bold text-[#18181b]">₹{rule.toleranceAmount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#71717a]">Tolerance %</p>
                          <p className="font-bold text-[#18181b]">{rule.tolerancePercentage}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#71717a]">Frequency</p>
                          <p className="font-bold text-[#18181b] capitalize">{rule.frequency}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-[#71717a]">Notify on Mismatch</p>
                          <Switch
                            checked={rule.notifyOnMismatch}
                            onCheckedChange={() => handleToggleReconciliation(rule.id, 'notifyOnMismatch', rule.notifyOnMismatch)}
                          />
                        </div>
                      </div>
                    </div>

                    <Switch
                      checked={rule.autoReconcile}
                      onCheckedChange={() => handleToggleReconciliation(rule.id, 'autoReconcile', rule.autoReconcile)}
                    />
                  </div>
                </div>
              ))}
              {reconciliationRules.length === 0 && (
                <div className="p-8 text-center text-[#71717a] text-sm">
                  No reconciliation rules yet. Add via backend or admin tools.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Refund Policies Tab */}
        <TabsContent value="refund">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Refund Policies</h3>
              <p className="text-xs text-[#71717a] mt-1">Auto-approval thresholds and processing times</p>
            </div>

            <div className="p-6 space-y-4">
              {refundPolicies.map((policy) => (
                <div key={policy.id} className="border border-[#e4e4e7] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-[#18181b]">{policy.name}</h4>
                      <p className="text-sm text-[#71717a] capitalize">Order Type: {policy.orderType}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{policy.refundMethod}</Badge>
                  </div>

                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-[#71717a] mb-1">Auto-Approve Below</p>
                      <p className="font-bold text-emerald-600">₹{policy.autoApproveThreshold.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#71717a] mb-1">Processing Time</p>
                      <p className="font-bold text-[#18181b]">{policy.processingTime}h</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#71717a] mb-1">Manager Approval Above</p>
                      <p className="font-bold text-amber-600">
                        {policy.requiresManagerApproval ? `₹${policy.managerApprovalThreshold.toLocaleString()}` : 'Not Required'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#71717a] mb-1">Refund Method</p>
                      <p className="font-bold text-[#18181b] capitalize">{policy.refundMethod}</p>
                    </div>
                    <div className="flex items-end justify-end">
                      <Button size="sm" variant="outline">
                        <Edit size={14} className="mr-1.5" /> Edit Policy
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {refundPolicies.length === 0 && (
                <div className="p-8 text-center text-[#71717a] text-sm">
                  No refund policies configured yet.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Invoice Settings Tab */}
        <TabsContent value="invoice">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#18181b]">Invoice Configuration</h3>
                <p className="text-xs text-[#71717a] mt-1">Auto-generation and invoice format settings</p>
              </div>
              {editingInvoice ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingInvoice(false)}>
                    <X size={14} className="mr-1.5" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveInvoiceSettings}>
                    <Save size={14} className="mr-1.5" /> Save
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditingInvoice(true)}>
                  <Edit size={14} className="mr-1.5" /> Edit Settings
                </Button>
              )}
            </div>

            <div className="p-6 space-y-6">
              {!invoiceSettings ? (
                <div className="p-8 text-center text-[#71717a] text-sm">
                  Failed to load invoice settings. Please refresh.
                </div>
              ) : (
                <>
                  {/* Auto-Generation */}
                  <div className="flex items-center justify-between p-4 bg-[#f4f4f5] rounded-lg">
                    <div>
                      <p className="font-medium text-[#18181b]">Auto-Generate Invoices</p>
                      <p className="text-xs text-[#71717a]">Automatically create invoices for completed orders</p>
                    </div>
                    <Switch
                      checked={invoiceSettings.autoGenerate}
                      onCheckedChange={(checked) => setInvoiceSettings({ ...invoiceSettings, autoGenerate: checked })}
                      disabled={!editingInvoice}
                    />
                  </div>

                  {/* Invoice Numbering */}
                  <div>
                    <h4 className="font-bold text-sm text-[#18181b] mb-3">Invoice Numbering</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Prefix</Label>
                        <Input
                          value={invoiceSettings.invoicePrefix}
                          onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoicePrefix: e.target.value })}
                          disabled={!editingInvoice}
                          placeholder="QC-INV"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Format</Label>
                        <Input
                          value={invoiceSettings.invoiceNumberFormat}
                          onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoiceNumberFormat: e.target.value })}
                          disabled={!editingInvoice}
                          placeholder="PREFIX-YYYY-NNNNNN"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Starting Number</Label>
                        <Input
                          type="number"
                          value={invoiceSettings.startingNumber}
                          onChange={(e) => setInvoiceSettings({ ...invoiceSettings, startingNumber: parseInt(e.target.value) })}
                          disabled={!editingInvoice}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[#71717a] mt-2">
                      Preview: {invoiceSettings.invoicePrefix}-2024-{invoiceSettings.startingNumber.toString().padStart(6, '0')}
                    </p>
                  </div>

                  {/* Tax Inclusion */}
                  <div>
                    <h4 className="font-bold text-sm text-[#18181b] mb-3">Tax Settings</h4>
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={invoiceSettings.includeGST}
                          onCheckedChange={(checked) => setInvoiceSettings({ ...invoiceSettings, includeGST: checked })}
                          disabled={!editingInvoice}
                        />
                        <Label>Include GST</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={invoiceSettings.includeTDS}
                          onCheckedChange={(checked) => setInvoiceSettings({ ...invoiceSettings, includeTDS: checked })}
                          disabled={!editingInvoice}
                        />
                        <Label>Include TDS</Label>
                      </div>
                    </div>
                  </div>

                  {/* Payment Terms */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Default Payment Terms</Label>
                      <Input
                        value={invoiceSettings.paymentTerms}
                        onChange={(e) => setInvoiceSettings({ ...invoiceSettings, paymentTerms: e.target.value })}
                        disabled={!editingInvoice}
                        placeholder="NET 30"
                      />
                    </div>
                  </div>

                  {/* Templates */}
                  <div className="space-y-2">
                    <Label>Invoice Notes Template</Label>
                    <textarea
                      className="w-full min-h-20 p-3 border border-[#e4e4e7] rounded-lg text-sm resize-none disabled:bg-[#f4f4f5]"
                      value={invoiceSettings.notesTemplate}
                      onChange={(e) => setInvoiceSettings({ ...invoiceSettings, notesTemplate: e.target.value })}
                      disabled={!editingInvoice}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Footer Text</Label>
                    <Input
                      value={invoiceSettings.footerText}
                      onChange={(e) => setInvoiceSettings({ ...invoiceSettings, footerText: e.target.value })}
                      disabled={!editingInvoice}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Payment Terms Tab */}
        <TabsContent value="terms">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Payment Terms</h3>
              <p className="text-xs text-[#71717a] mt-1">Credit periods and late fee configurations</p>
            </div>

            <div className="p-6 space-y-3">
              {paymentTerms.map((term) => (
                <div key={term.id} className="border border-[#e4e4e7] rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-[#18181b]">{term.name}</h4>
                        <Badge variant="outline" className="capitalize">{term.applicableTo}</Badge>
                        {term.isDefault && <Badge className="bg-emerald-500">Default</Badge>}
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-[#71717a]">Credit Period</p>
                          <p className="font-bold text-[#18181b]">{term.creditPeriod} days</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#71717a]">Late Fee</p>
                          <p className="font-bold text-[#e11d48]">{term.lateFeePercentage}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#71717a]">Grace Period</p>
                          <p className="font-bold text-[#18181b]">{term.lateFeeGracePeriod} days</p>
                        </div>
                        <div className="flex items-end justify-end gap-2">
                          {!term.isDefault && (
                            <Button size="sm" variant="outline" onClick={() => handleSetDefaultTerm(term.id)}>
                              Set Default
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {paymentTerms.length === 0 && (
                <div className="p-8 text-center text-[#71717a] text-sm">
                  No payment terms configured yet.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Financial Limits Tab */}
        <TabsContent value="limits">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Financial Limits & Controls</h3>
              <p className="text-xs text-[#71717a] mt-1">Transaction and usage limits by entity type</p>
            </div>

            <div className="p-6 space-y-4">
              {financialLimits.map((limit) => {
                const usagePercent = limit.maxAmount > 0 ? (limit.currentUsage / limit.maxAmount) * 100 : 0;
                const isNearLimit = usagePercent >= limit.alertThreshold;

                return (
                  <div key={limit.id} className="border border-[#e4e4e7] rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-bold text-[#18181b]">{limit.name}</h4>
                          <Badge variant="outline" className="capitalize">{limit.limitType}</Badge>
                          <Badge variant="outline" className="capitalize">{limit.entityType}</Badge>
                          {isNearLimit && (
                            <Badge className="bg-amber-500">
                              <AlertCircle size={12} className="mr-1" /> Near Limit
                            </Badge>
                          )}
                        </div>
                        {limit.resetDate && (
                          <p className="text-xs text-[#71717a] mt-1">
                            Resets on {new Date(limit.resetDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#71717a]">Max Amount</p>
                        <p className="font-bold text-[#18181b]">₹{limit.maxAmount.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#71717a]">Current Usage</span>
                        <span className="font-bold text-[#18181b]">₹{limit.currentUsage.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-[#e4e4e7] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            usagePercent >= 90 ? 'bg-rose-500' :
                            usagePercent >= limit.alertThreshold ? 'bg-amber-500' :
                            'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-[#71717a]">
                        <span>0%</span>
                        <span className="font-medium">{usagePercent.toFixed(1)}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {financialLimits.length === 0 && (
                <div className="p-8 text-center text-[#71717a] text-sm">
                  No financial limits configured yet.
                </div>
              )}

              {/* Financial Year Settings */}
              {financialYear && (
                <div className="border-2 border-dashed border-[#e4e4e7] rounded-lg p-4 mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-[#18181b]">Financial Year Configuration</h4>
                      <p className="text-sm text-[#71717a]">Current: {financialYear.currentYear}</p>
                    </div>
                    {editingFY ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingFY(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleSaveFinancialYear}>Save</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setEditingFY(true)}>
                        <Edit size={14} className="mr-1.5" /> Edit
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Start Month</Label>
                      <Select
                        value={financialYear.startMonth.toString()}
                        onValueChange={(val) => setFinancialYear({ ...financialYear, startMonth: parseInt(val) })}
                        disabled={!editingFY}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                            <SelectItem key={idx + 1} value={(idx + 1).toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Start Day</Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={financialYear.startDay}
                        onChange={(e) => setFinancialYear({ ...financialYear, startDay: parseInt(e.target.value) })}
                        disabled={!editingFY}
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={financialYear.lockPreviousYears}
                          onCheckedChange={(checked) => setFinancialYear({ ...financialYear, lockPreviousYears: checked })}
                          disabled={!editingFY}
                        />
                        <Label className="text-xs">Lock Previous Years</Label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Tax Rule Modal */}
      <Dialog open={taxModalOpen} onOpenChange={setTaxModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Tax Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tax Name</Label>
              <Input
                value={taxForm.name}
                onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                placeholder="e.g. GST 18%"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={taxForm.type}
                onValueChange={(val) => setTaxForm({ ...taxForm, type: val as TaxRule['type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GST">GST</SelectItem>
                  <SelectItem value="TDS">TDS</SelectItem>
                  <SelectItem value="CESS">CESS</SelectItem>
                  <SelectItem value="VAT">VAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={taxForm.rate || ''}
                onChange={(e) => setTaxForm({ ...taxForm, rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Applicable On</Label>
              <Input
                value={taxForm.applicableOn}
                onChange={(e) => setTaxForm({ ...taxForm, applicableOn: e.target.value })}
                placeholder="e.g. All goods"
              />
            </div>
            <div className="space-y-2">
              <Label>Effective From</Label>
              <Input
                type="date"
                value={taxForm.effectiveFrom || ''}
                onChange={(e) => setTaxForm({ ...taxForm, effectiveFrom: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={taxForm.isActive}
                onCheckedChange={(checked) => setTaxForm({ ...taxForm, isActive: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaxModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTaxRule}>Create Tax Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payout Schedule Modal */}
      <Dialog open={payoutAddOpen} onOpenChange={setPayoutAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payout Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vendor Tier</Label>
              <Select
                value={payoutForm.vendorTier}
                onValueChange={(val) => setPayoutForm({ ...payoutForm, vendorTier: val as PayoutSchedule['vendorTier'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platinum">Platinum</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="bronze">Bronze</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cycle</Label>
              <Select
                value={payoutForm.cycle}
                onValueChange={(val) => setPayoutForm({ ...payoutForm, cycle: val as PayoutSchedule['cycle'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Processing Day</Label>
              <Input
                value={payoutForm.processingDay}
                onChange={(e) => setPayoutForm({ ...payoutForm, processingDay: e.target.value })}
                placeholder="e.g. Monday"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Payout (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={payoutForm.minPayout || ''}
                  onChange={(e) => setPayoutForm({ ...payoutForm, minPayout: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Payout (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={payoutForm.maxPayout || ''}
                  onChange={(e) => setPayoutForm({ ...payoutForm, maxPayout: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={payoutForm.autoApprove}
                onCheckedChange={(checked) => setPayoutForm({ ...payoutForm, autoApprove: checked })}
              />
              <Label>Auto-Approve</Label>
            </div>
            {payoutForm.autoApprove && (
              <div className="space-y-2">
                <Label>Auto-Approve Threshold (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={payoutForm.autoApproveThreshold || ''}
                  onChange={(e) => setPayoutForm({ ...payoutForm, autoApproveThreshold: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePayoutSchedule}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payout Schedule Modal */}
      <Dialog open={!!payoutEditSchedule} onOpenChange={(open) => !open && setPayoutEditSchedule(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payout Schedule</DialogTitle>
          </DialogHeader>
          {payoutEditSchedule && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Processing Day</Label>
                <Input
                  value={payoutEditSchedule.processingDay}
                  onChange={(e) => setPayoutEditSchedule({ ...payoutEditSchedule, processingDay: e.target.value })}
                  placeholder="e.g. Monday"
                />
              </div>
              <div className="space-y-2">
                <Label>Min Payout (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={payoutEditSchedule.minPayout || ''}
                  onChange={(e) => setPayoutEditSchedule({ ...payoutEditSchedule, minPayout: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Payout (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={payoutEditSchedule.maxPayout || ''}
                  onChange={(e) => setPayoutEditSchedule({ ...payoutEditSchedule, maxPayout: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={payoutEditSchedule.autoApprove}
                  onCheckedChange={(checked) => setPayoutEditSchedule({ ...payoutEditSchedule, autoApprove: checked })}
                />
                <Label>Auto-Approve</Label>
              </div>
              {payoutEditSchedule.autoApprove && (
                <div className="space-y-2">
                  <Label>Auto-Approve Threshold (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={payoutEditSchedule.autoApproveThreshold || ''}
                    onChange={(e) => setPayoutEditSchedule({ ...payoutEditSchedule, autoApproveThreshold: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutEditSchedule(null)}>Cancel</Button>
            <Button onClick={handleSavePayoutSchedule}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
