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
  if (!response.ok) throw new Error(`API error: ${response.statusText}`);
  return response.json();
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
  return arr.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
}

export async function createMaintenanceTask(task: Partial<MaintenanceTask>): Promise<MaintenanceTask> {
  const response = await apiRequest(API_ENDPOINTS.fleet.maintenance, {
    method: 'POST',
    body: JSON.stringify(task),
  });
  return (response?.data ?? response) as MaintenanceTask;
}

export async function updateMaintenanceTask(id: string, updates: Partial<MaintenanceTask>): Promise<void> {
  await apiRequest(`${API_ENDPOINTS.fleet.maintenanceTask(id)}`, { method: 'PUT', body: JSON.stringify(updates) });
}
