import { apiRequest } from '@/api/apiClient';

export type InvoiceStatus = "sent" | "pending" | "overdue" | "paid" | "draft" | "cancelled";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  notes?: string;
  pdfUrl?: string;
  lastReminderAt?: string;
  createdAt: string;
}

export interface InvoiceSummary {
  sentCount: number;
  pendingCount: number;
  overdueCount: number;
  paidCount: number;
  periodLabel: string;
}

export interface CreateInvoicePayload {
  customerId?: string;
  customerName: string;
  customerEmail: string;
  issueDate: string;
  dueDate: string;
  items: Omit<InvoiceItem, 'id'>[];
  notes?: string;
}

const BASE = '/finance';

export const fetchInvoiceSummary = async (): Promise<InvoiceSummary> => {
  const response = await apiRequest<{ success: boolean; data: InvoiceSummary }>(`${BASE}/invoices/summary`);
  return response.data;
};

export const fetchInvoices = async (
  status?: InvoiceStatus | null,
  search?: string
): Promise<Invoice[]> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  const response = await apiRequest<{ success: boolean; data: Invoice[] }>(
    `${BASE}/invoices${params.toString() ? `?${params.toString()}` : ''}`
  );
  return response.data ?? [];
};

export const fetchInvoiceDetails = async (id: string): Promise<Invoice | null> => {
  const response = await apiRequest<{ success: boolean; data: Invoice }>(`${BASE}/invoices/${id}`);
  return response.data ?? null;
};

export const createInvoice = async (
  payload: CreateInvoicePayload,
  asDraft: boolean = false
): Promise<Invoice> => {
  const response = await apiRequest<{ success: boolean; data: Invoice }>(`${BASE}/invoices`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, asDraft }),
  });
  return response.data;
};

export const updateInvoiceStatus = async (id: string, status: InvoiceStatus): Promise<void> => {
  await apiRequest(`${BASE}/invoices/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

export const sendInvoice = async (id: string): Promise<void> => {
  await apiRequest(`${BASE}/invoices/${id}/send`, {
    method: 'POST',
  });
};

export const sendReminder = async (id: string): Promise<void> => {
  await apiRequest(`${BASE}/invoices/${id}/send-reminder`, {
    method: 'POST',
  });
};

export const markInvoicePaid = async (id: string): Promise<void> => {
  await apiRequest(`${BASE}/invoices/${id}/mark-paid`, {
    method: 'POST',
  });
};
