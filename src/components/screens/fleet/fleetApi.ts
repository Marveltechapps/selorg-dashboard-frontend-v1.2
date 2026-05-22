export type VehicleType = "Electric Scooter" | "Motorbike (Gas)" | "Bicycle" | "Car" | "Van";
export type FuelType = "EV" | "Petrol" | "Diesel" | "Other";
export type VehicleStatus = "active" | "maintenance" | "inactive";
export type PoolType = "Hub" | "Dedicated" | "Spare";
export type MaintenanceStatus = "upcoming" | "in_progress" | "completed";
export type MaintenanceType = "Scheduled Service" | "Breakdown" | "Inspection";

export interface VehicleDocuments {
  rcValidTill: string; // ISO date
  insuranceValidTill: string; // ISO date
  pucValidTill?: string; // ISO date
}

export interface Vehicle {
  id: string; // internal id
  vehicleId: string; // display id e.g. "EV-SCOOT-012"
  type: VehicleType;
  fuelType: FuelType;
  assignedRiderId?: string;
  assignedRiderName?: string;
  status: VehicleStatus;
  conditionScore: number; // 0-100
  conditionLabel: string;
  lastServiceDate: string; // ISO date
  nextServiceDueDate: string; // ISO date
  currentOdometerKm: number;
  utilizationPercent: number;
  documents: VehicleDocuments;
  pool: PoolType;
  notes?: string;
  location?: string; // e.g. "Downtown Hub"
}

export interface FleetSummary {
  totalFleet: number;
  inMaintenance: number;
  evUsagePercent: number;
  scheduledServicesNextWeek: number;
}

export interface MaintenanceTask {
  id: string;
  vehicleId: string; // Display ID
  vehicleInternalId: string; // Internal ID
  vehicleType?: VehicleType | string | null;
  type: MaintenanceType;
  scheduledDate: string; // ISO date
  status: MaintenanceStatus;
  workshopName?: string;
  notes?: string;
  cost?: number;
}

// --- API FUNCTIONS ---

import { API_CONFIG } from '../../../config/api';
import { API_ENDPOINTS } from '../../../config/api';
import { getAuthToken } from '../../../contexts/AuthContext';

export type FleetFieldErrors = Record<string, string>;

export class FleetApiError extends Error {
  fieldErrors: FleetFieldErrors;

  constructor(message: string, fieldErrors: FleetFieldErrors = {}) {
    super(message);
    this.name = 'FleetApiError';
    this.fieldErrors = fieldErrors;
  }
}

function parseFieldErrors(payload: Record<string, unknown> | null): FleetFieldErrors {
  const errorObj = payload?.error as { details?: Array<{ field?: string; message?: string }> } | undefined;
  if (!Array.isArray(errorObj?.details)) return {};
  return errorObj.details.reduce<FleetFieldErrors>((acc, item) => {
    if (item?.field && item?.message) acc[item.field] = item.message;
    return acc;
  }, {});
}

function extractApiMessage(payload: Record<string, unknown> | null, fallback: string): string {
  const fieldErrors = parseFieldErrors(payload);
  const detailMessages = Object.values(fieldErrors);
  if (detailMessages.length > 0) return detailMessages.join('. ');
  return (
    (typeof payload?.message === 'string' && payload.message) ||
    (typeof payload?.error === 'string' && payload.error) ||
    (typeof (payload?.error as { message?: string })?.message === 'string' &&
      (payload?.error as { message: string }).message) ||
    fallback
  );
}

async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken() || ''}`,
      ...(options.headers as object),
    },
  });
  if (!response.ok) {
    let payload: Record<string, unknown> | null = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const message = extractApiMessage(payload, `API error: ${response.statusText}`);
    throw new FleetApiError(message, parseFieldErrors(payload));
  }
  return response.json();
}

/** Convert YYYY-MM-DD from date input to noon UTC ISO (avoids timezone day-shift). */
export function dateInputToIso(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) throw new FleetApiError('Please select a valid scheduled date.', { scheduledDate: 'Invalid date format' });
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (Number.isNaN(date.getTime())) {
    throw new FleetApiError('Please select a valid scheduled date.', { scheduledDate: 'Invalid date' });
  }
  return date.toISOString();
}

export function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseScheduledDateRaw(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'object' && value !== null && '$date' in value) {
    const nested = (value as { $date: string }).$date;
    const d = new Date(nested);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function normalizeMaintenanceTask(raw: Record<string, unknown>): MaintenanceTask {
  const scheduledDate = parseScheduledDateRaw(raw.scheduledDate);
  return {
    id: String(raw.id ?? (raw as { _id?: string })._id ?? ''),
    vehicleId: String(raw.vehicleId ?? raw.vehicleInternalId ?? ''),
    vehicleInternalId: String(raw.vehicleInternalId ?? ''),
    vehicleType: (raw.vehicleType as string | null) ?? null,
    type: (raw.type as MaintenanceType) || 'Scheduled Service',
    scheduledDate: scheduledDate ?? '',
    status: (raw.status as MaintenanceStatus) || 'upcoming',
    workshopName: raw.workshopName as string | undefined,
    notes: raw.notes as string | undefined,
    cost: typeof raw.cost === 'number' ? raw.cost : undefined,
  };
}

export function formatMaintenanceDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function maintenanceDateSortKey(value: string): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms;
}

function normalizeVehicle(v: Record<string, unknown>): Vehicle {
  const status = v.status as string;
  return {
    ...v,
    status: (status === 'inactive' ? 'offline' : status) as Vehicle['status'],
    documents: (v.documents as VehicleDocuments) ?? {
      rcValidTill: new Date().toISOString(),
      insuranceValidTill: new Date().toISOString(),
    },
  } as Vehicle;
}

export async function fetchFleetSummary(): Promise<FleetSummary> {
  const data = await apiRequest(API_ENDPOINTS.fleet.summary);
  if (data && data.success === false) throw new Error(data.message);
  const raw = data?.data ?? data;
  if (!raw) throw new Error('No fleet summary returned');
  return {
    totalFleet: Number(raw.totalFleet ?? 0),
    inMaintenance: Number(raw.inMaintenance ?? 0),
    evUsagePercent: Number(raw.evUsagePercent ?? 0),
    scheduledServicesNextWeek: Number(raw.scheduledServicesNextWeek ?? 0),
  };
}

export async function fetchVehicles(filters?: { status?: string; type?: string; fuelType?: string }): Promise<Vehicle[]> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") params.append('status', filters.status);
  if (filters?.type && filters.type !== "all") params.append('type', filters.type);
  if (filters?.fuelType && filters.fuelType !== "all") params.append('fuelType', filters.fuelType);
  const query = params.toString();
  const data = await apiRequest(`${API_ENDPOINTS.fleet.vehicles}${query ? `?${query}` : ''}`);
  if (data && data.success === false) throw new Error(data.message);
  const list = data?.data ?? data?.vehicles ?? [];
  return Array.isArray(list) ? list.map(normalizeVehicle) : [];
}

export async function fetchVehicleById(id: string): Promise<Vehicle | undefined> {
  const data = await apiRequest(API_ENDPOINTS.fleet.vehicle(id));
  if (data && data.success === false) throw new Error(data.message || 'Failed to fetch vehicle');
  const raw = data?.data ?? data;
  return raw ? normalizeVehicle(raw) : undefined;
}

export async function createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
  try {
    const response = await apiRequest(API_ENDPOINTS.fleet.vehicles, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return (response?.data ?? response) as Vehicle;
  } catch (err) {
    console.error('Failed to create vehicle', err);
    throw new Error('Failed to add vehicle. Backend may be offline—check connection.');
  }
}

export async function updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
  const response = await apiRequest(API_ENDPOINTS.fleet.vehicle(id), { method: 'PUT', body: JSON.stringify(updates) });
  if (response && response.success === false) throw new Error(response.message || 'Update failed');
  const raw = response?.data ?? response;
  return raw ? normalizeVehicle(raw) : (updates as Vehicle);
}

export async function fetchMaintenanceTasks(): Promise<MaintenanceTask[]> {
  const data = await apiRequest(API_ENDPOINTS.fleet.maintenance);
  if (data && data.success === false) throw new Error(data.message);
  const tasks = data?.data ?? data ?? [];
  const arr = Array.isArray(tasks) ? tasks : [];
  return arr
    .map((t) => normalizeMaintenanceTask(t as Record<string, unknown>))
    .sort((a, b) => maintenanceDateSortKey(a.scheduledDate) - maintenanceDateSortKey(b.scheduledDate));
}

export async function createMaintenanceTask(task: Partial<MaintenanceTask>): Promise<MaintenanceTask> {
  const response = await apiRequest(API_ENDPOINTS.fleet.maintenance, {
    method: 'POST',
    body: JSON.stringify(task),
  });
  if (response && response.success === false) {
    throw new FleetApiError(response.message || 'Failed to schedule maintenance');
  }
  const raw = response?.data ?? response;
  return normalizeMaintenanceTask(
    (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  );
}

export async function updateMaintenanceTask(
  id: string,
  updates: Partial<MaintenanceTask>
): Promise<MaintenanceTask> {
  const response = await apiRequest(`${API_ENDPOINTS.fleet.maintenanceTask(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  if (response && response.success === false) {
    throw new FleetApiError(response.message || 'Update failed');
  }
  const raw = response?.data ?? response;
  return normalizeMaintenanceTask(
    (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  );
}
