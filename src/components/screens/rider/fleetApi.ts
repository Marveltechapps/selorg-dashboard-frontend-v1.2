import { API_CONFIG, API_ENDPOINTS } from '../../../config/api';

export interface Vehicle {
  id: string;
  vehicleId: string;
  type: string;
  assignedRiderName?: string | null;
  status: 'active' | 'maintenance' | 'offline' | 'inactive';
  conditionScore: number;
  fuelType: 'EV' | 'Gas' | 'Petrol' | 'Diesel' | 'Other';
}

export interface FleetSummary {
  totalFleet: number;
  inMaintenance: number;
  evUsagePercent: number;
  scheduledServicesNextWeek: number;
}

export interface MaintenanceTask {
  id: string;
  vehicleId: string;
  type: string;
  scheduledDate: string;
  status: 'upcoming' | 'in_progress' | 'completed';
  workshopName?: string | null;
  notes?: string | null;
  cost?: number | null;
}

function mapVehicleFromApi(raw: Record<string, unknown>): Vehicle {
  const status = raw.status === 'inactive' ? 'offline' : (raw.status as Vehicle['status']);
  const fuelType = raw.fuelType === 'Petrol' || raw.fuelType === 'Diesel' ? 'Gas' : (raw.fuelType as Vehicle['fuelType']);
  return {
    id: String(raw.id ?? ''),
    vehicleId: String(raw.vehicleId ?? ''),
    type: String(raw.type ?? ''),
    assignedRiderName: raw.assignedRiderName as string | null | undefined,
    status,
    conditionScore: Number(raw.conditionScore ?? 0),
    fuelType,
  };
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Request failed');
  }

  return response.json();
}

export const fleetApi = {
  getSummary: async (): Promise<FleetSummary> => {
    const res = await apiRequest<{ success: boolean; data: FleetSummary }>(API_ENDPOINTS.fleet.summary);
    return (res as { data: FleetSummary }).data;
  },

  getVehicles: async (filters: Record<string, string> = {}): Promise<{ vehicles: Vehicle[]; total: number }> => {
    const params = new URLSearchParams(filters);
    const res = await apiRequest<{ success: boolean; count: number; data: Record<string, unknown>[] }>(
      `${API_ENDPOINTS.fleet.vehicles}${params.toString() ? '?' + params.toString() : ''}`
    );
    const data = (res as { data: Record<string, unknown>[] }).data ?? [];
    const vehicles = data.map(mapVehicleFromApi);
    const total = (res as { count: number }).count ?? vehicles.length;
    return { vehicles, total };
  },

  getVehicleById: async (id: string): Promise<Vehicle> => {
    const res = await apiRequest<{ success: boolean; data: Record<string, unknown> }>(
      API_ENDPOINTS.fleet.vehicle(id)
    );
    return mapVehicleFromApi((res as { data: Record<string, unknown> }).data);
  },

  createVehicle: async (body: Partial<Vehicle>): Promise<Vehicle> => {
    const payload = {
      vehicleId: body.vehicleId,
      type: body.type,
      fuelType: body.fuelType ?? 'EV',
      status: body.status ?? 'active',
      conditionScore: body.conditionScore ?? 100,
      assignedRiderName: body.assignedRiderName ?? null,
    };
    const res = await apiRequest<{ success: boolean; data: Record<string, unknown> }>(
      API_ENDPOINTS.fleet.vehicles,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return mapVehicleFromApi((res as { data: Record<string, unknown> }).data);
  },

  updateVehicle: async (id: string, body: Partial<Vehicle>): Promise<Vehicle> => {
    const res = await apiRequest<{ success: boolean; data: Record<string, unknown> }>(
      API_ENDPOINTS.fleet.vehicle(id),
      { method: 'PUT', body: JSON.stringify(body) }
    );
    return mapVehicleFromApi((res as { data: Record<string, unknown> }).data);
  },

  getMaintenance: async (): Promise<MaintenanceTask[]> => {
    const res = await apiRequest<{ success: boolean; count: number; data: MaintenanceTask[] }>(
      API_ENDPOINTS.fleet.maintenance
    );
    return ((res as { data: MaintenanceTask[] }).data ?? []);
  },

  getMaintenanceById: async (id: string): Promise<MaintenanceTask> => {
    const res = await apiRequest<{ success: boolean; data: MaintenanceTask }>(
      API_ENDPOINTS.fleet.maintenanceTask(id)
    );
    return (res as { data: MaintenanceTask }).data;
  },

  createMaintenance: async (body: Partial<MaintenanceTask>): Promise<MaintenanceTask> => {
    const res = await apiRequest<{ success: boolean; data: MaintenanceTask }>(
      API_ENDPOINTS.fleet.maintenance,
      { method: 'POST', body: JSON.stringify(body) }
    );
    return (res as { data: MaintenanceTask }).data;
  },

  updateMaintenance: async (id: string, body: Partial<MaintenanceTask>): Promise<MaintenanceTask> => {
    const res = await apiRequest<{ success: boolean; data: MaintenanceTask }>(
      API_ENDPOINTS.fleet.maintenanceTask(id),
      { method: 'PUT', body: JSON.stringify(body) }
    );
    return (res as { data: MaintenanceTask }).data;
  },
};

