import type { VendorInvoice, VendorPayablesSummary } from '../finance/payablesApi';

export type FinanceInvoiceRow = {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  tax: number;
  totalAmount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  paymentDate: string | null;
  status: string;
  paymentMethod: string;
  category: string;
  poReference: string;
  description: string;
  attachments: number;
  transactionId: string;
  updatedAt?: string;
};

export type FinanceSummaryUi = {
  pendingPayouts: number;
  approvedInvoices: number;
  disputedAmount: number;
  paidThisMonth: number;
  avgPaymentCycle: number;
  outstandingBalance: number;
  creditLimit: number;
  availableCredit: number;
  overdueAmount: number;
  overdueVendorsCount: number;
};

export type PaymentHistoryEntry = {
  month: string;
  paid: number;
  pending: number;
  disputed: number;
};

export type PaymentByCategoryEntry = {
  name: string;
  value: number;
  color: string;
};

export type VendorPaymentSummary = {
  vendorId: string;
  vendorName: string;
  totalPaid: number;
  pendingAmount: number;
  invoiceCount: number;
  avgPaymentDays: number;
  creditRating: string;
  lastPayment: string;
};

const STATUS_CHART_COLORS: Record<string, string> = {
  paid: '#22C55E',
  pending_approval: '#8B5CF6',
  approved: '#4F46E5',
  scheduled: '#3B82F6',
  overdue: '#EF4444',
  rejected: '#F97316',
};

const PENDING_STATUSES = new Set(['pending_approval', 'approved', 'scheduled', 'overdue']);

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthKey(d: Date): string {
  return d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
}

export function mapPayablesToFinanceSummary(
  p: VendorPayablesSummary,
  vendors: { id: string; creditLimit?: number }[] = []
): FinanceSummaryUi {
  const outstanding = Number(p.outstandingPayablesAmount ?? 0);
  const totalCredit = vendors.reduce((sum, v) => sum + Number(v.creditLimit ?? 0), 0);
  const available = Math.max(0, totalCredit - outstanding);

  return {
    pendingPayouts: outstanding,
    approvedInvoices: Number(p.pendingApprovalCount ?? 0),
    disputedAmount: Number(p.disputedAmount ?? 0),
    paidThisMonth: Number(p.paidThisMonth ?? 0),
    avgPaymentCycle: Number(p.avgPaymentCycle ?? 0),
    outstandingBalance: outstanding,
    creditLimit: totalCredit,
    availableCredit: available,
    overdueAmount: Number(p.overdueAmount ?? 0),
    overdueVendorsCount: Number(p.overdueVendorsCount ?? 0),
  };
}

export function mapPayablesInvoiceToFinance(inv: VendorInvoice): FinanceInvoiceRow {
  const items = inv.items ?? [];
  const itemsSubtotal = items.reduce(
    (sum, line) => sum + Number(line.total ?? line.quantity * line.unitPrice),
    0
  );
  const amount = Number(inv.amount ?? 0);
  const tax = itemsSubtotal > amount ? itemsSubtotal - amount : 0;
  const updatedAt =
    typeof (inv as VendorInvoice & { updatedAt?: string }).updatedAt === 'string'
      ? (inv as VendorInvoice & { updatedAt?: string }).updatedAt
      : inv.uploadedAt;

  return {
    id: inv.id,
    vendorId: inv.vendorId,
    vendorName: inv.vendorName,
    amount,
    tax,
    totalAmount: amount,
    currency: inv.currency ?? 'INR',
    issueDate: inv.invoiceDate?.split?.('T')?.[0] ?? String(inv.invoiceDate ?? ''),
    dueDate: inv.dueDate?.split?.('T')?.[0] ?? String(inv.dueDate ?? ''),
    paymentDate:
      inv.status === 'paid'
        ? (updatedAt?.split?.('T')?.[0] ?? inv.invoiceDate?.split?.('T')?.[0] ?? null)
        : null,
    status: inv.status,
    paymentMethod: 'Bank Transfer',
    category: items[0]?.description ? 'Procurement' : 'General',
    poReference: inv.invoiceNumber ?? '',
    description: inv.notes ?? '',
    attachments: inv.attachmentUrl ? 1 : 0,
    transactionId: inv.paymentId ? String(inv.paymentId) : String(inv.id),
    updatedAt,
  };
}

export function buildVendorPaymentSummaries(
  invoices: FinanceInvoiceRow[],
  vendors: { id: string; name: string; creditLimit?: number }[]
): VendorPaymentSummary[] {
  const byVendor = new Map<string, VendorPaymentSummary>();

  for (const v of vendors) {
    byVendor.set(v.id, {
      vendorId: v.id,
      vendorName: v.name,
      totalPaid: 0,
      pendingAmount: 0,
      invoiceCount: 0,
      avgPaymentDays: 0,
      creditRating: creditRatingFromLimit(v.creditLimit),
      lastPayment: '-',
    });
  }

  const cycleBuckets = new Map<string, number[]>();
  const latestPaidByVendor = new Map<string, string>();

  for (const inv of invoices) {
    let row = byVendor.get(inv.vendorId);
    if (!row) {
      row = {
        vendorId: inv.vendorId,
        vendorName: inv.vendorName,
        totalPaid: 0,
        pendingAmount: 0,
        invoiceCount: 0,
        avgPaymentDays: 0,
        creditRating: '-',
        lastPayment: '-',
      };
      byVendor.set(inv.vendorId, row);
    }

    row.invoiceCount += 1;
    const amt = inv.totalAmount;

    if (inv.status === 'paid') {
      row.totalPaid += amt;
      const paidOn = inv.paymentDate ?? inv.updatedAt;
      if (paidOn) {
        const prev = latestPaidByVendor.get(inv.vendorId);
        if (!prev || paidOn > prev) latestPaidByVendor.set(inv.vendorId, paidOn);
      }
      const issued = parseDate(inv.issueDate);
      const settled = parseDate(inv.paymentDate ?? inv.updatedAt);
      if (issued && settled) {
        const days = Math.max(
          0,
          Math.round((settled.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24))
        );
        const arr = cycleBuckets.get(inv.vendorId) ?? [];
        arr.push(days);
        cycleBuckets.set(inv.vendorId, arr);
      }
    } else if (PENDING_STATUSES.has(inv.status)) {
      row.pendingAmount += amt;
    }
  }

  for (const [vendorId, row] of byVendor) {
    const cycles = cycleBuckets.get(vendorId);
    if (cycles?.length) {
      row.avgPaymentDays = Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length);
    }
    row.lastPayment = latestPaidByVendor.get(vendorId) ?? '-';
  }

  return Array.from(byVendor.values()).sort((a, b) => b.pendingAmount - a.pendingAmount);
}

function creditRatingFromLimit(limit?: number): string {
  const n = Number(limit ?? 0);
  if (n >= 1_000_000) return 'A';
  if (n >= 500_000) return 'B';
  if (n >= 100_000) return 'C';
  if (n > 0) return 'D';
  return '-';
}

export function buildPaymentHistory(invoices: FinanceInvoiceRow[]): PaymentHistoryEntry[] {
  const now = new Date();
  const months: PaymentHistoryEntry[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

    let paid = 0;
    let pending = 0;
    let disputed = 0;

    for (const inv of invoices) {
      const issue = parseDate(inv.issueDate);
      if (!issue || issue < start || issue > end) continue;
      const amt = inv.totalAmount;
      if (inv.status === 'paid') paid += amt;
      else if (inv.status === 'rejected') disputed += amt;
      else if (PENDING_STATUSES.has(inv.status)) pending += amt;
    }

    months.push({ month: key, paid, pending, disputed });
  }

  return months;
}

export function buildPaymentByCategory(invoices: FinanceInvoiceRow[]): PaymentByCategoryEntry[] {
  const totals = new Map<string, PaymentByCategoryEntry>();

  for (const inv of invoices) {
    const label = formatStatusLabel(inv.status);
    const color = STATUS_CHART_COLORS[inv.status] ?? '#94A3B8';
    const prev = totals.get(label);
    totals.set(label, {
      name: label,
      value: (prev?.value ?? 0) + inv.totalAmount,
      color: prev?.color ?? color,
    });
  }

  return Array.from(totals.values()).sort((a, b) => b.value - a.value);
}

function formatStatusLabel(status: string): string {
  switch (status) {
    case 'pending_approval':
      return 'Pending approval';
    case 'paid':
      return 'Paid';
    case 'overdue':
      return 'Overdue';
    case 'rejected':
      return 'Rejected';
    case 'scheduled':
      return 'Scheduled';
    case 'approved':
      return 'Approved';
    default:
      return status;
  }
}
