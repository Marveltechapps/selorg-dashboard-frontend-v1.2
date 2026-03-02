import { apiRequest } from '@/api/apiClient';

// --- Type Definitions ---

export interface TaxRule {
  id: string;
  name: string;
  type: 'GST' | 'TDS' | 'CESS' | 'VAT';
  rate: number;
  applicableOn: string;
  isActive: boolean;
  effectiveFrom: string;
  threshold?: number;
}

export interface PayoutSchedule {
  id: string;
  vendorTier: 'platinum' | 'gold' | 'silver' | 'bronze';
  cycle: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  processingDay: string;
  minPayout: number;
  maxPayout: number;
  autoApprove: boolean;
  autoApproveThreshold: number;
}

export interface CommissionSlab {
  id: string;
  category: string;
  vendorTier: 'platinum' | 'gold' | 'silver' | 'bronze';
  commissionRate: number;
  minOrderValue: number;
  maxOrderValue: number;
  effectiveFrom: string;
}

export interface ReconciliationRule {
  id: string;
  name: string;
  type: 'order' | 'payment' | 'refund' | 'payout';
  autoReconcile: boolean;
  toleranceAmount: number;
  tolerancePercentage: number;
  frequency: 'realtime' | 'hourly' | 'daily';
  notifyOnMismatch: boolean;
}

export interface RefundPolicy {
  id: string;
  name: string;
  orderType: 'all' | 'prepaid' | 'cod';
  autoApproveThreshold: number;
  processingTime: number;
  refundMethod: 'original' | 'wallet' | 'both';
  requiresManagerApproval: boolean;
  managerApprovalThreshold: number;
}

export interface InvoiceSettings {
  autoGenerate: boolean;
  invoicePrefix: string;
  invoiceNumberFormat: string;
  startingNumber: number;
  includeGST: boolean;
  includeTDS: boolean;
  paymentTerms: string;
  notesTemplate: string;
  footerText: string;
}

export interface PaymentTerm {
  id: string;
  name: string;
  creditPeriod: number;
  lateFeePercentage: number;
  lateFeeGracePeriod: number;
  applicableTo: 'vendors' | 'customers' | 'both';
  isDefault: boolean;
}

export interface FinancialLimit {
  id: string;
  name: string;
  limitType: 'transaction' | 'daily' | 'weekly' | 'monthly';
  entityType: 'customer' | 'vendor' | 'store';
  maxAmount: number;
  currentUsage: number;
  resetDate?: string;
  alertThreshold: number;
}

export interface FinancialYear {
  startMonth: number;
  startDay: number;
  currentYear: string;
  lockPreviousYears: boolean;
}

const PREFIX = '/finance';

function extractData<T>(res: { success?: boolean; data?: T }): T {
  if (res?.data !== undefined) return res.data as T;
  return res as unknown as T;
}

// --- API Functions ---

export async function fetchTaxRules(): Promise<TaxRule[]> {
  const res = await apiRequest<{ success: boolean; data: TaxRule[] }>(`${PREFIX}/tax-rules`);
  const data = extractData<TaxRule[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function updateTaxRule(id: string, data: Partial<TaxRule>): Promise<TaxRule> {
  const res = await apiRequest<{ success: boolean; data: TaxRule }>(`${PREFIX}/tax-rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return extractData<TaxRule>(res);
}

export async function createTaxRule(data: Omit<TaxRule, 'id'>): Promise<TaxRule> {
  const res = await apiRequest<{ success: boolean; data: TaxRule }>(`${PREFIX}/tax-rules`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return extractData<TaxRule>(res);
}

export async function fetchPayoutSchedules(): Promise<PayoutSchedule[]> {
  const res = await apiRequest<{ success: boolean; data: PayoutSchedule[] }>(`${PREFIX}/payout-schedules`);
  const data = extractData<PayoutSchedule[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function createPayoutSchedule(data: Omit<PayoutSchedule, 'id'>): Promise<PayoutSchedule> {
  const res = await apiRequest<{ success: boolean; data: PayoutSchedule }>(`${PREFIX}/payout-schedules`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return extractData<PayoutSchedule>(res);
}

export async function updatePayoutSchedule(id: string, data: Partial<PayoutSchedule>): Promise<PayoutSchedule> {
  const res = await apiRequest<{ success: boolean; data: PayoutSchedule }>(`${PREFIX}/payout-schedules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return extractData<PayoutSchedule>(res);
}

export async function fetchCommissionSlabs(): Promise<CommissionSlab[]> {
  const res = await apiRequest<{ success: boolean; data: CommissionSlab[] }>(`${PREFIX}/commission-slabs`);
  const data = extractData<CommissionSlab[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function updateCommissionSlab(id: string, data: Partial<CommissionSlab>): Promise<CommissionSlab> {
  const res = await apiRequest<{ success: boolean; data: CommissionSlab }>(`${PREFIX}/commission-slabs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return extractData<CommissionSlab>(res);
}

export async function createCommissionSlab(data: Omit<CommissionSlab, 'id'>): Promise<CommissionSlab> {
  const res = await apiRequest<{ success: boolean; data: CommissionSlab }>(`${PREFIX}/commission-slabs`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return extractData<CommissionSlab>(res);
}

export async function fetchReconciliationRules(): Promise<ReconciliationRule[]> {
  const res = await apiRequest<{ success: boolean; data: ReconciliationRule[] }>(`${PREFIX}/reconciliation-rules`);
  const data = extractData<ReconciliationRule[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function updateReconciliationRule(id: string, data: Partial<ReconciliationRule>): Promise<ReconciliationRule> {
  const res = await apiRequest<{ success: boolean; data: ReconciliationRule }>(`${PREFIX}/reconciliation-rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return extractData<ReconciliationRule>(res);
}

export async function fetchRefundPolicies(): Promise<RefundPolicy[]> {
  const res = await apiRequest<{ success: boolean; data: RefundPolicy[] }>(`${PREFIX}/refund-policies`);
  const data = extractData<RefundPolicy[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function updateRefundPolicy(id: string, data: Partial<RefundPolicy>): Promise<RefundPolicy> {
  const res = await apiRequest<{ success: boolean; data: RefundPolicy }>(`${PREFIX}/refund-policies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return extractData<RefundPolicy>(res);
}

export async function fetchInvoiceSettings(): Promise<InvoiceSettings> {
  const res = await apiRequest<{ success: boolean; data: InvoiceSettings }>(`${PREFIX}/invoice-settings`);
  return extractData<InvoiceSettings>(res);
}

export async function updateInvoiceSettings(data: Partial<InvoiceSettings>): Promise<InvoiceSettings> {
  const res = await apiRequest<{ success: boolean; data: InvoiceSettings }>(`${PREFIX}/invoice-settings`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return extractData<InvoiceSettings>(res);
}

export async function fetchPaymentTerms(): Promise<PaymentTerm[]> {
  const res = await apiRequest<{ success: boolean; data: PaymentTerm[] }>(`${PREFIX}/payment-terms`);
  const data = extractData<PaymentTerm[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function updatePaymentTerm(id: string, data: Partial<PaymentTerm>): Promise<PaymentTerm> {
  const res = await apiRequest<{ success: boolean; data: PaymentTerm }>(`${PREFIX}/payment-terms/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return extractData<PaymentTerm>(res);
}

export async function fetchFinancialLimits(): Promise<FinancialLimit[]> {
  const res = await apiRequest<{ success: boolean; data: FinancialLimit[] }>(`${PREFIX}/financial-limits`);
  const data = extractData<FinancialLimit[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function updateFinancialLimit(id: string, data: Partial<FinancialLimit>): Promise<FinancialLimit> {
  const res = await apiRequest<{ success: boolean; data: FinancialLimit }>(`${PREFIX}/financial-limits/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return extractData<FinancialLimit>(res);
}

export async function fetchFinancialYear(): Promise<FinancialYear> {
  const res = await apiRequest<{ success: boolean; data: FinancialYear }>(`${PREFIX}/financial-year`);
  return extractData<FinancialYear>(res);
}

export async function updateFinancialYear(data: Partial<FinancialYear>): Promise<FinancialYear> {
  const res = await apiRequest<{ success: boolean; data: FinancialYear }>(`${PREFIX}/financial-year`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return extractData<FinancialYear>(res);
}
