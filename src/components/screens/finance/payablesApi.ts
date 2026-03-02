import { API_ENDPOINTS } from '../../../config/api';
import { apiRequest } from '../../../api/apiClient';

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

export interface NewPaymentRequest {
  vendorId: string;
  invoices: Array<{ invoiceId: string; amount: number }>;
  paymentDate: string;
  method: "bank_transfer" | "upi" | "card" | "check" | string;
  reference: string;
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

function mapVendor(raw: Record<string, unknown>): Vendor {
  return {
    id: String(raw.id ?? raw._id ?? ''),
    name: String(raw.name ?? ''),
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
  return mapInvoice(raw);
}

export async function fetchVendors(): Promise<Vendor[]> {
  const res = await apiRequest<ApiResponse<unknown[]>>(API_ENDPOINTS.finance.vendorPayments.vendors);
  const arr = res?.data;
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.map((r: Record<string, unknown>) => mapVendor(r));
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
  return {
    approvedCount: Number(payload.approvedCount ?? 0),
    totalRequested: Number(payload.totalRequested ?? ids.length),
    data: Array.isArray(payload.data) ? payload.data.map((i: Record<string, unknown>) => mapInvoice(i)) : [],
  };
}

export async function approveInvoice(id: string): Promise<VendorInvoice> {
  const res = await apiRequest<ApiResponse<Record<string, unknown>>>(API_ENDPOINTS.finance.vendorPayments.approveInvoice(id), {
    method: 'POST',
  });
  const raw = res?.data;
  if (!raw) {
    throw new Error('Failed to approve invoice');
  }
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
  return mapInvoice({ ...raw, ...vendor });
}

export async function createPayment(request: NewPaymentRequest): Promise<{ success: boolean; paymentId: string }> {
  const res = await apiRequest<ApiResponse<{ success?: boolean; paymentId?: string }>>(API_ENDPOINTS.finance.vendorPayments.createPayment, {
    method: 'POST',
    body: JSON.stringify(request),
  });
  const data = res?.data;
  if (!data) {
    throw new Error('Failed to create payment');
  }
  return {
    success: Boolean(data.success ?? true),
    paymentId: String(data.paymentId ?? ''),
  };
}
