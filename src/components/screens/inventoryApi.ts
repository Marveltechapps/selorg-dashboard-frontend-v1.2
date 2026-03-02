/**
 * Inventory Management API Service
 * Connects frontend to backend API endpoints
 */
import { getActiveStoreId } from '../../contexts/AuthContext';

const API_BASE_URL = (() => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    try { return new URL(String(envUrl).trim()).origin; } catch { return ''; }
  }
  return '';
})();

// Types matching backend response structures
export interface ShelfViewResponse {
  success: boolean;
  empty_shelves: number;
  misplaced_shelves: number;
  damaged_goods_reports: number;
  aisles_data: {
    [aisle: string]: {
      aisle: string;
      shelves: {
        shelf_number: number;
        location_code: string;
        status: string;
        is_critical: boolean;
        is_misplaced: boolean;
        assigned_skus: {
          sku: string;
          product_name: string;
          stock_count: number;
        }[];
      }[];
    };
  };
  selected_shelf?: {
    location_code: string;
    section: string;
    status: string;
    assigned_skus: {
      sku: string;
      product_name: string;
      stock_count: number;
    }[];
    issues: {
      issue_type: string;
      description: string;
      severity: string;
    }[];
    recent_activities: {
      action: string;
      timestamp: string;
      user: string;
    }[];
  };
}

export interface InventoryItem {
  sku: string;
  product_name: string;
  category?: string;
  stock: number;
  location?: string;
  status?: string;
  min_threshold?: number;
  max_threshold?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StockLevelsResponse {
  success: boolean;
  items: InventoryItem[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

export interface InventoryAdjustment {
  adjustment_id: string;
  sku: string;
  product_name: string;
  action: 'add' | 'remove' | 'damage' | 'adjust';
  quantity: number;
  reason: string;
  notes?: string;
  user: string;
  created_at: string;
}

export interface AdjustmentsResponse {
  success: boolean;
  adjustments: InventoryAdjustment[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

export interface CycleCountResponse {
  success: boolean;
  metrics: {
    daily_progress: number;
    accuracy_rate: number;
    variance_value: number;
    items_counted: number;
    total_items: number;
  };
  heatmap: {
    location: string;
    variance_percentage: number;
  }[];
  variance_report: {
    sku: string;
    product_name: string;
    expected: number;
    counted: number;
    difference: number;
  }[];
}

export interface ScanItemResponse {
  success: boolean;
  sku: string;
  product_name: string;
  location: string;
  stock: number;
  message: string;
}

// API Functions

export async function fetchShelfView(
  storeId: string = getActiveStoreId() || '',
  zone: string = 'Zone 1 (Ambient)',
  aisle: string = 'all',
  shelfLocation?: string
): Promise<ShelfViewResponse> {
  const params = new URLSearchParams({
    storeId,
    zone,
    aisle,
  });
  
  if (shelfLocation) {
    params.append('shelf_location', shelfLocation);
  }
  
  const response = await fetch(`${API_BASE_URL}/api/v1/darkstore/inventory/shelf-view?${params}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch shelf view: ${response.statusText}`);
  }
  
  return response.json();
}

export async function fetchStockLevels(
  storeId: string = getActiveStoreId() || '',
  page: number = 1,
  limit: number = 50,
  search: string = '',
  category: string = 'all',
  status: string = 'all'
): Promise<StockLevelsResponse> {
  const params = new URLSearchParams({
    storeId,
    page: page.toString(),
    limit: limit.toString(),
    search,
    category,
    status,
  });
  
  const response = await fetch(`${API_BASE_URL}/api/v1/darkstore/inventory/stock-levels?${params}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch stock levels: ${response.statusText}`);
  }
  
  return response.json();
}

export async function updateStockLevel(
  sku: string,
  data: { stock: number; location?: string }
): Promise<{ success: boolean; message: string; sku: string; stock: number }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/darkstore/inventory/stock-levels/${sku}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to update stock level: ${response.statusText}`);
  }
  
  return response.json();
}

export async function deleteInventoryItem(sku: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/darkstore/inventory/stock-levels/${sku}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to delete inventory item: ${response.statusText}`);
  }
  
  return response.json();
}

export async function changeItemStatus(
  sku: string,
  status: string
): Promise<{ success: boolean; message: string; sku: string; status: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/darkstore/inventory/stock-levels/${sku}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to change item status: ${response.statusText}`);
  }
  
  return response.json();
}

export async function fetchAdjustments(
  storeId: string = getActiveStoreId() || '',
  page: number = 1,
  limit: number = 50
): Promise<AdjustmentsResponse> {
  const params = new URLSearchParams({
    storeId,
    page: page.toString(),
    limit: limit.toString(),
  });
  
  const response = await fetch(`${API_BASE_URL}/api/v1/darkstore/inventory/adjustments?${params}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch adjustments: ${response.statusText}`);
  }
  
  return response.json();
}

export async function createAdjustment(data: {
  sku: string;
  action: 'add' | 'remove' | 'damage' | 'adjust';
  quantity: number;
  reason: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; adjustment_id: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/darkstore/inventory/adjustments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to create adjustment: ${response.statusText}`);
  }
  
  return response.json();
}

export async function fetchCycleCount(
  storeId: string = getActiveStoreId() || ''
): Promise<CycleCountResponse> {
  const params = new URLSearchParams({ storeId });
  
  const response = await fetch(`${API_BASE_URL}/api/v1/darkstore/inventory/cycle-count?${params}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch cycle count: ${response.statusText}`);
  }
  
  return response.json();
}

export async function downloadCycleCountReport(
  storeId: string = getActiveStoreId() || ''
): Promise<Blob> {
  const params = new URLSearchParams({ storeId });
  
  const response = await fetch(`${API_BASE_URL}/api/v1/darkstore/inventory/cycle-count/report?${params}`);
  
  if (!response.ok) {
    throw new Error(`Failed to download cycle count report: ${response.statusText}`);
  }
  
  return response.blob();
}

export async function scanItem(data: {
  sku: string;
  location: string;
}): Promise<ScanItemResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/darkstore/inventory/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to scan item: ${response.statusText}`);
  }
  
  return response.json();
}

export async function fetchAuditLog(
  storeId: string = getActiveStoreId() || '',
  page: number = 1,
  limit: number = 50
): Promise<{
  success: boolean;
  audit_logs: {
    log_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    user: string;
    timestamp: string;
    details: any;
  }[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}> {
  const params = new URLSearchParams({
    storeId,
    page: page.toString(),
    limit: limit.toString(),
  });
  
  const response = await fetch(`${API_BASE_URL}/api/v1/darkstore/inventory/audit-log?${params}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch audit log: ${response.statusText}`);
  }
  
  return response.json();
}

export async function createRestockTask(data: {
  sku: string;
  store_id: string;
  quantity: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}): Promise<{ success: boolean; restock_id: string; estimated_arrival: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/darkstore/inventory/restock-task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to create restock task: ${response.statusText}`);
  }
  
  return response.json();
}

export async function createRestock(data: {
  sku: string;
  store_id: string;
  quantity: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}): Promise<{ success: boolean; restock_id: string; estimated_arrival: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/darkstore/inventory/restock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to create restock: ${response.statusText}`);
  }
  
  return response.json();
}

