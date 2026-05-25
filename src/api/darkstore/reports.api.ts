/**
 * Darkstore Reports & Analytics API
 * Base: /api/v1/darkstore/reports
 */

import { get } from '../inventory-management/apiClient';
import { getAuthToken, getActiveStoreId } from '../../contexts/AuthContext';

const BASE_URL = '/api/v1/darkstore/reports';

export type ReportDateRange = 'today' | '7d' | '30d' | 'custom';

export interface InventoryReportKpis {
  shrinkage_value: number;
  shrinkage_value_display: string;
  shrinkage_delta_pct: number;
  damage_writeoff_count: number;
  most_damaged_product: string;
  cycle_count_accuracy_pct: number;
  cycle_count_target_pct: number;
  audit_passed: boolean;
}

export interface InventoryDiscrepancy {
  sku: string;
  product_name: string;
  type: string;
  quantity: number;
  value: string;
  reason: string;
  created_at?: string;
}

export interface InventoryReport {
  success: boolean;
  period: string;
  range: string;
  kpis: InventoryReportKpis;
  discrepancies: InventoryDiscrepancy[];
}

export interface StaffReport {
  success: boolean;
  period: string;
  range: string;
  attendance: {
    rate_pct: number;
    present_count: number;
    active_staff: number;
    absent_count: number;
    total_staff: number;
  };
  error_contribution: { type: string; percent: number }[];
  performance_period: string;
}

export interface ComplianceLogRow {
  log_id: string;
  category: string;
  zone: string;
  reading: string;
  threshold: string;
  status: string;
  logged_by: string;
  logged_at: string;
}

export interface ComplianceReport {
  success: boolean;
  period: string;
  range: string;
  logs: ComplianceLogRow[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

function reportParams(range: ReportDateRange, extra: Record<string, string | number> = {}) {
  const storeId = getActiveStoreId();
  return {
    range,
    ...(storeId ? { storeId } : {}),
    ...extra,
  };
}

export async function fetchInventoryReport(range: ReportDateRange): Promise<InventoryReport> {
  return get(`${BASE_URL}/inventory`, reportParams(range));
}

export async function fetchStaffReport(range: ReportDateRange): Promise<StaffReport> {
  return get(`${BASE_URL}/staff`, reportParams(range));
}

export async function fetchComplianceReport(
  range: ReportDateRange,
  options?: { category?: string; page?: number; limit?: number }
): Promise<ComplianceReport> {
  return get(`${BASE_URL}/compliance`, reportParams(range, {
    category: options?.category ?? 'all',
    page: options?.page ?? 1,
    limit: options?.limit ?? 100,
  }));
}

export async function downloadReportsExport(range: ReportDateRange): Promise<Blob> {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  let API_BASE_URL = '';
  if (envUrl) {
    try {
      API_BASE_URL = new URL(envUrl).origin;
    } catch {
      API_BASE_URL = '';
    }
  }
  const params = new URLSearchParams(reportParams(range) as Record<string, string>);
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${BASE_URL}/export?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to export reports');
  }
  return response.blob();
}
