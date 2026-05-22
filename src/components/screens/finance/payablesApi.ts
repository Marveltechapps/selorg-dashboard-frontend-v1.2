import { API_ENDPOINTS } from '../../../config/api';
import { apiRequest } from '../../../api/apiClient';
import { vendorManagementApi } from '../../../api/vendor/vendorManagement.api';
import { DASHBOARD_TOPICS, emitDashboardRefresh } from '../../../lib/dashboardRefreshBus';

function notifyFinancePayablesMutated() {
  emitDashboardRefresh(DASHBOARD_TOPICS.financePayables);
}

export interface VendorInvoice {
  id: string;
  vendorId: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: "pending_approval" | "approved" | "scheduled" | "paid" | "overdue" | "rejected";
  paymentId?: string;
  paymentWorkflow?: VendorPayment | null;
  uploadedBy: string;
  uploadedAt: string;
  attachmentUrl?: string;
  notes?: string;
  items?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
}

export interface VendorPayablesSummary {
  outstandingPayablesAmount: number;
  outstandingHorizonText: string;
  pendingApprovalCount: number;
  overdueAmount: number;
  overdueVendorsCount: number;
}

export type PaymentWorkflowStep =
  | 'finance_verification'
  | 'approval'
  | 'payment_released'
  | 'settlement_confirmation';

export interface PaymentWorkflowStepMeta {
  key: PaymentWorkflowStep;
  label: string;
}

export interface PaymentWorkflowHistoryEntry {
  step: PaymentWorkflowStep;
  status: 'completed' | 'rejected' | 'skipped';
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface VendorPaymentInvoiceLine {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  currentStep: PaymentWorkflowStep;
  currentStepLabel: string;
  lineStatus: 'in_progress' | 'completed' | 'rejected';
  workflowHistory: PaymentWorkflowHistoryEntry[];
}

export interface VendorPayment {
  id?: string;
  paymentId: string;
  vendorId: string;
  vendorName: string;
  attachmentUrl: string;
  attachmentFileName?: string;
  attachmentContentType?: string;
  invoices: VendorPaymentInvoiceLine[];
  totalAmount: number;
  paymentDate: string;
  method: string;
  reference: string;
  overallStatus: 'in_progress' | 'completed' | 'cancelled';
  createdBy: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  workflowSteps: PaymentWorkflowStepMeta[];
}

export interface NewPaymentRequest {
  vendorId: string;
  invoices: Array<{ invoiceId: string; amount: number }>;
  paymentDate: string;
  method: "bank_transfer" | "upi" | "card" | "check" | string;
  reference: string;
  file: File;
}

export interface VendorInvoiceFilter {
  status?: string;
  vendorId?: string;
  dateFrom?: string;
  dateTo?: string;
  query?: string;
  page: number;
  pageSize: number;
}

export interface Vendor {
  id: string;
  name: string;
  email?: string;
  accountNumber?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

function mapInvoice(raw: Record<string, unknown>): VendorInvoice {
  return {
    id: String(raw.id ?? raw._id ?? ''),
    vendorId: String(raw.vendorId ?? ''),
    vendorName: String(raw.vendorName ?? ''),
    invoiceNumber: String(raw.invoiceNumber ?? ''),
    invoiceDate: typeof raw.invoiceDate === 'string' ? raw.invoiceDate : (raw.invoiceDate as Date)?.toString?.() ?? '',
    dueDate: typeof raw.dueDate === 'string' ? raw.dueDate : (raw.dueDate as Date)?.toString?.() ?? '',
    amount: Number(raw.amount ?? 0),
    currency: String(raw.currency ?? 'INR'),
    status: (raw.status as VendorInvoice['status']) ?? 'pending_approval',
    paymentId: raw.paymentId != null ? String(raw.paymentId) : undefined,
    uploadedBy: String(raw.uploadedBy ?? ''),
    uploadedAt: typeof raw.uploadedAt === 'string' ? raw.uploadedAt : (raw.uploadedAt as Date)?.toString?.() ?? '',
    attachmentUrl: raw.attachmentUrl != null ? String(raw.attachmentUrl) : undefined,
    notes: raw.notes != null ? String(raw.notes) : undefined,
    items: Array.isArray(raw.items)
      ? (raw.items as Array<Record<string, unknown>>).map((it) => ({
          description: String(it.description ?? ''),
          quantity: Number(it.quantity ?? 0),
          unitPrice: Number(it.unitPrice ?? 0),
          total: Number(it.total ?? 0),
        }))
      : undefined,
  };
}

function resolveVendorId(raw: Record<string, unknown>): string {
  const candidate = raw.id ?? raw._id ?? raw.vendorId;
  if (candidate == null) return '';
  if (typeof candidate === 'string') return candidate.trim();
  if (typeof candidate === 'object' && candidate !== null && '$oid' in candidate) {
    return String((candidate as { $oid: string }).$oid).trim();
  }
  return String(candidate).trim();
}

function mapVendor(raw: Record<string, unknown>): Vendor {
  const resolvedId = resolveVendorId(raw);
  const resolvedName = String(
    raw.name ?? raw.displayName ?? raw.vendorName ?? raw.code ?? raw.vendorCode ?? ''
  ).trim();
  return {
    id: resolvedId,
    name: resolvedName || (resolvedId ? `Vendor ${resolvedId}` : 'Unknown Vendor'),
    email: raw.email != null ? String(raw.email) : undefined,
    accountNumber: raw.accountNumber != null ? String(raw.accountNumber) : undefined,
  };
}

export async function fetchPayablesSummary(): Promise<VendorPayablesSummary> {
  const res = await apiRequest<ApiResponse<VendorPayablesSummary>>(API_ENDPOINTS.finance.vendorPayments.summary);
  const data = res?.data;
  if (!data) {
    throw new Error('Invalid response from payables summary');
  }
  return {
    outstandingPayablesAmount: Number(data.outstandingPayablesAmount ?? 0),
    outstandingHorizonText: String(data.outstandingHorizonText ?? 'Due next 30 days'),
    pendingApprovalCount: Number(data.pendingApprovalCount ?? 0),
    overdueAmount: Number(data.overdueAmount ?? 0),
    overdueVendorsCount: Number(data.overdueVendorsCount ?? 0),
  };
}

export async function fetchVendorInvoices(filter: VendorInvoiceFilter): Promise<{
  data: VendorInvoice[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const params = new URLSearchParams();
  if (filter.status && filter.status !== 'all') params.set('status', filter.status);
  if (filter.vendorId && filter.vendorId !== 'all') params.set('vendorId', filter.vendorId);
  if (filter.dateFrom) params.set('dateFrom', filter.dateFrom);
  if (filter.dateTo) params.set('dateTo', filter.dateTo);
  params.set('page', String(filter.page));
  params.set('pageSize', String(filter.pageSize));

  const url = `${API_ENDPOINTS.finance.vendorPayments.invoices}?${params.toString()}`;
  const res = await apiRequest<ApiResponse<{ data: unknown[]; total: number; page: number; pageSize: number }>>(url);

  const payload = res?.data;
  if (!payload) {
    throw new Error('Invalid response from vendor invoices');
  }

  let data = Array.isArray(payload.data) ? payload.data : [];
  if (filter.query && filter.query.trim()) {
    const q = filter.query.toLowerCase().trim();
    data = data.filter(
      (i: Record<string, unknown>) =>
        String(i.invoiceNumber ?? '').toLowerCase().includes(q) ||
        String(i.vendorName ?? '').toLowerCase().includes(q) ||
        String(i.id ?? i._id ?? '').toLowerCase().includes(q)
    );
  }

  return {
    data: data.map((i: Record<string, unknown>) => mapInvoice(i)),
    total: Number(payload.total ?? data.length),
    page: Number(payload.page ?? filter.page),
    pageSize: Number(payload.pageSize ?? filter.pageSize),
  };
}

export async function fetchVendorInvoiceDetails(id: string): Promise<VendorInvoice> {
  const res = await apiRequest<ApiResponse<Record<string, unknown>>>(API_ENDPOINTS.finance.vendorPayments.invoiceById(id));
  const raw = res?.data;
  if (!raw) {
    throw new Error('Invoice not found');
  }
  const invoice = mapInvoice(raw);
  if (raw.paymentWorkflow && typeof raw.paymentWorkflow === 'object') {
    invoice.paymentWorkflow = mapVendorPayment(raw.paymentWorkflow as Record<string, unknown>);
  }
  return invoice;
}

function extractVendorRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  if (Array.isArray(obj.items)) return obj.items as Record<string, unknown>[];
  if (Array.isArray(obj.vendors)) return obj.vendors as Record<string, unknown>[];
  return [];
}

function normalizeVendorListRows(rows: Record<string, unknown>[]): Vendor[] {
  return rows
    .filter((raw) => {
      if (raw.metadata && typeof raw.metadata === 'object' && (raw.metadata as { deleted?: boolean }).deleted) {
        return false;
      }
      if (
        raw.status === 'inactive' &&
        raw.metadata &&
        typeof raw.metadata === 'object' &&
        (raw.metadata as { deleteReason?: string }).deleteReason
      ) {
        return false;
      }
      return true;
    })
    .map((r) => mapVendor(r))
    .filter((vendor) => Boolean(vendor.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Vendor directory for finance payables — same list as Vendor dashboard (`GET /vendor/vendors`).
 */
export async function fetchVendors(): Promise<Vendor[]> {
  try {
    const response = await vendorManagementApi.getVendors({ page: 1, pageSize: 500 });
    const rows = extractVendorRows(response);
    const mapped = normalizeVendorListRows(rows);
    if (mapped.length > 0) return mapped;
  } catch (e) {
    console.warn('Vendor dashboard API unavailable for finance, using finance vendor-payments endpoint', e);
  }

  const cacheBust = `_=${Date.now()}`;
  const res = await apiRequest<ApiResponse<unknown[]>>(
    `${API_ENDPOINTS.finance.vendorPayments.vendors}?${cacheBust}`
  );
  return normalizeVendorListRows(extractVendorRows(res));
}

export async function bulkApproveInvoices(ids: string[]): Promise<{ approvedCount: number; totalRequested: number; data: VendorInvoice[] }> {
  const res = await apiRequest<ApiResponse<{ approvedCount: number; totalRequested: number; data: unknown[] }>>(
    API_ENDPOINTS.finance.vendorPayments.bulkApproveInvoices,
    {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }
  );
  const payload = res?.data;
  if (!payload) {
    throw new Error('Failed to bulk approve invoices');
  }
  const out = {
    approvedCount: Number(payload.approvedCount ?? 0),
    totalRequested: Number(payload.totalRequested ?? ids.length),
    data: Array.isArray(payload.data) ? payload.data.map((i: Record<string, unknown>) => mapInvoice(i)) : [],
  };
  notifyFinancePayablesMutated();
  return out;
}

export async function approveInvoice(id: string): Promise<VendorInvoice> {
  const res = await apiRequest<ApiResponse<Record<string, unknown>>>(API_ENDPOINTS.finance.vendorPayments.approveInvoice(id), {
    method: 'POST',
  });
  const raw = res?.data;
  if (!raw) {
    throw new Error('Failed to approve invoice');
  }
  notifyFinancePayablesMutated();
  return mapInvoice(raw);
}

export async function rejectInvoice(id: string, reason: string): Promise<VendorInvoice> {
  const res = await apiRequest<ApiResponse<Record<string, unknown>>>(API_ENDPOINTS.finance.vendorPayments.rejectInvoice(id), {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  const raw = res?.data;
  if (!raw) {
    throw new Error('Failed to reject invoice');
  }
  notifyFinancePayablesMutated();
  return mapInvoice(raw);
}

export async function markInvoicePaid(id: string): Promise<VendorInvoice> {
  const res = await apiRequest<ApiResponse<Record<string, unknown>>>(API_ENDPOINTS.finance.vendorPayments.markInvoicePaid(id), {
    method: 'POST',
  });
  const raw = res?.data;
  if (!raw) {
    throw new Error('Failed to mark invoice as paid');
  }
  notifyFinancePayablesMutated();
  return mapInvoice(raw);
}

export interface UploadInvoicePayload {
  vendorId: string;
  vendorName?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  currency?: string;
}

export async function uploadInvoice(data: UploadInvoicePayload): Promise<VendorInvoice> {
  const body = {
    vendorId: data.vendorId,
    invoiceNumber: data.invoiceNumber,
    invoiceDate: data.invoiceDate,
    dueDate: data.dueDate,
    amount: data.amount,
    currency: data.currency ?? 'INR',
  };
  const res = await apiRequest<ApiResponse<Record<string, unknown>>>(API_ENDPOINTS.finance.vendorPayments.invoices, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const raw = res?.data;
  if (!raw) {
    throw new Error('Failed to upload invoice');
  }
  const vendor = data.vendorName ? { vendorName: data.vendorName } : {};
  notifyFinancePayablesMutated();
  return mapInvoice({ ...raw, ...vendor });
}

function mapVendorPayment(raw: Record<string, unknown>): VendorPayment {
  return {
    id: raw.id != null ? String(raw.id) : undefined,
    paymentId: String(raw.paymentId ?? ''),
    vendorId: String(raw.vendorId ?? ''),
    vendorName: String(raw.vendorName ?? ''),
    attachmentUrl: String(raw.attachmentUrl ?? ''),
    attachmentFileName: raw.attachmentFileName != null ? String(raw.attachmentFileName) : undefined,
    attachmentContentType:
      raw.attachmentContentType != null ? String(raw.attachmentContentType) : undefined,
    invoices: Array.isArray(raw.invoices)
      ? (raw.invoices as Record<string, unknown>[]).map((line) => ({
          invoiceId: String(line.invoiceId ?? ''),
          invoiceNumber: String(line.invoiceNumber ?? ''),
          amount: Number(line.amount ?? 0),
          currency: String(line.currency ?? 'INR'),
          currentStep: (line.currentStep as PaymentWorkflowStep) ?? 'finance_verification',
          currentStepLabel: String(line.currentStepLabel ?? line.currentStep ?? ''),
          lineStatus: (line.lineStatus as VendorPaymentInvoiceLine['lineStatus']) ?? 'in_progress',
          workflowHistory: Array.isArray(line.workflowHistory)
            ? (line.workflowHistory as Record<string, unknown>[]).map((h) => ({
                step: (h.step as PaymentWorkflowStep) ?? 'finance_verification',
                status: (h.status as PaymentWorkflowHistoryEntry['status']) ?? 'completed',
                completedAt: h.completedAt != null ? String(h.completedAt) : undefined,
                completedBy: h.completedBy != null ? String(h.completedBy) : undefined,
                notes: h.notes != null ? String(h.notes) : undefined,
              }))
            : [],
        }))
      : [],
    totalAmount: Number(raw.totalAmount ?? 0),
    paymentDate:
      typeof raw.paymentDate === 'string'
        ? raw.paymentDate
        : (raw.paymentDate as Date)?.toString?.() ?? '',
    method: String(raw.method ?? ''),
    reference: String(raw.reference ?? ''),
    overallStatus: (raw.overallStatus as VendorPayment['overallStatus']) ?? 'in_progress',
    createdBy: String(raw.createdBy ?? ''),
    completedAt: raw.completedAt != null ? String(raw.completedAt) : undefined,
    createdAt: raw.createdAt != null ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt != null ? String(raw.updatedAt) : undefined,
    workflowSteps: Array.isArray(raw.workflowSteps)
      ? (raw.workflowSteps as Record<string, unknown>[]).map((s) => ({
          key: (s.key as PaymentWorkflowStep) ?? 'finance_verification',
          label: String(s.label ?? s.key ?? ''),
        }))
      : [],
  };
}

export async function createPayment(
  request: NewPaymentRequest
): Promise<{ success: boolean; paymentId: string; payment: VendorPayment }> {
  const form = new FormData();
  form.append('file', request.file);
  form.append('vendorId', request.vendorId);
  form.append('invoices', JSON.stringify(request.invoices));
  form.append('paymentDate', request.paymentDate);
  form.append('method', request.method);
  form.append('reference', request.reference);

  const res = await apiRequest<
    ApiResponse<{ success?: boolean; paymentId?: string; payment?: Record<string, unknown> }>
  >(API_ENDPOINTS.finance.vendorPayments.createPayment, {
    method: 'POST',
    body: form,
  });
  const data = res?.data;
  if (!data?.paymentId) {
    throw new Error('Failed to create payment');
  }
  const out = {
    success: Boolean(data.success ?? true),
    paymentId: String(data.paymentId),
    payment: mapVendorPayment(data.payment ?? { paymentId: data.paymentId }),
  };
  notifyFinancePayablesMutated();
  return out;
}

export async function fetchVendorPayments(params?: {
  status?: string;
  vendorId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: VendorPayment[]; total: number; page: number; pageSize: number }> {
  const search = new URLSearchParams();
  if (params?.status && params.status !== 'all') search.set('status', params.status);
  if (params?.vendorId && params.vendorId !== 'all') search.set('vendorId', params.vendorId);
  search.set('page', String(params?.page ?? 1));
  search.set('pageSize', String(params?.pageSize ?? 20));

  const url = `${API_ENDPOINTS.finance.vendorPayments.payments}?${search.toString()}`;
  const res = await apiRequest<
    ApiResponse<{ data: unknown[]; total: number; page: number; pageSize: number }>
  >(url);
  const payload = res?.data;
  if (!payload) {
    throw new Error('Failed to load payments');
  }
  return {
    data: Array.isArray(payload.data)
      ? payload.data.map((p) => mapVendorPayment(p as Record<string, unknown>))
      : [],
    total: Number(payload.total ?? 0),
    page: Number(payload.page ?? 1),
    pageSize: Number(payload.pageSize ?? 20),
  };
}

export async function fetchVendorPayment(paymentId: string): Promise<VendorPayment> {
  const res = await apiRequest<ApiResponse<Record<string, unknown>>>(
    API_ENDPOINTS.finance.vendorPayments.paymentById(paymentId)
  );
  const raw = res?.data;
  if (!raw) {
    throw new Error('Payment not found');
  }
  return mapVendorPayment(raw);
}

export async function advancePaymentWorkflowStep(
  paymentId: string,
  invoiceId: string,
  notes?: string
): Promise<VendorPayment> {
  const res = await apiRequest<ApiResponse<Record<string, unknown>>>(
    API_ENDPOINTS.finance.vendorPayments.advanceWorkflow(paymentId, invoiceId),
    {
      method: 'POST',
      body: JSON.stringify({ notes: notes || undefined }),
    }
  );
  const raw = res?.data;
  if (!raw) {
    throw new Error('Failed to advance workflow');
  }
  notifyFinancePayablesMutated();
  return mapVendorPayment(raw);
}

export async function cancelVendorPayment(paymentId: string, reason?: string): Promise<VendorPayment> {
  const res = await apiRequest<ApiResponse<Record<string, unknown>>>(
    API_ENDPOINTS.finance.vendorPayments.cancelPayment(paymentId),
    {
      method: 'POST',
      body: JSON.stringify({ reason: reason || undefined }),
    }
  );
  const raw = res?.data;
  if (!raw) {
    throw new Error('Failed to cancel payment');
  }
  notifyFinancePayablesMutated();
  return mapVendorPayment(raw);
}
