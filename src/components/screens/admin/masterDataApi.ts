import { apiRequest } from '@/api/apiClient';

export interface City {
  id: string;
  code: string;
  name: string;
  state?: string;
  country?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Zone {
  id: string;
  name: string;
  code?: string;
  cityId?: string;
  cityName?: string;
  type?: string;
  status?: string;
  color?: string;
  areaSqKm?: number;
  defaultCapacity?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleType {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface SkuUnit {
  id: string;
  code: string;
  name: string;
  baseUnit?: string;
  conversionFactor?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface Rider {
  id: string;
  riderId: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType: string;
  status: string;
  availability: string;
  cityName?: string;
  cityId?: string;
  stats?: { totalDeliveries: number; averageRating: number; completedDeliveries?: number };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Cities
export async function fetchCities(params?: { isActive?: boolean; search?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.isActive !== undefined) qs.set('isActive', String(params.isActive));
  if (params?.search) qs.set('search', params.search);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const url = `/admin/cities${qs.toString() ? `?${qs}` : ''}`;
  const res = await apiRequest<{ success: boolean; data: any[]; pagination?: Pagination }>(url);
  if (!res?.success) throw new Error('Failed to load cities');
  const data = (res.data ?? []).map((c: any) => ({
    id: c._id?.toString?.() ?? c.id,
    code: c.code,
    name: c.name,
    state: c.state,
    country: c.country,
    isActive: c.isActive,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
  return { data, pagination: res.pagination };
}

export async function getCity(id: string): Promise<City> {
  const res = await apiRequest<{ success: boolean; data: any }>(`/admin/cities/${id}`);
  if (!res?.success || !res.data) throw new Error('City not found');
  const c = res.data;
  return { id: c._id?.toString?.() ?? c.id, code: c.code, name: c.name, state: c.state, country: c.country, isActive: c.isActive };
}

export async function createCity(data: Partial<City>): Promise<City> {
  const res = await apiRequest<{ success: boolean; data: any }>('/admin/cities', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res?.success || !res.data) throw new Error('Failed to create city');
  const c = res.data;
  return { id: c._id?.toString?.() ?? c.id, code: c.code, name: c.name, state: c.state, country: c.country, isActive: c.isActive };
}

export async function updateCity(id: string, data: Partial<City>): Promise<City> {
  const res = await apiRequest<{ success: boolean; data: any }>(`/admin/cities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res?.success || !res.data) throw new Error('Failed to update city');
  const c = res.data;
  return { id: c._id?.toString?.() ?? c.id, code: c.code, name: c.name, state: c.state, country: c.country, isActive: c.isActive };
}

export async function deleteCity(id: string): Promise<void> {
  await apiRequest(`/admin/cities/${id}`, { method: 'DELETE' });
}

// Zones
export async function fetchZones(params?: { cityId?: string; status?: string; search?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.cityId) qs.set('cityId', params.cityId);
  if (params?.status) qs.set('status', params.status);
  if (params?.search) qs.set('search', params.search);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const url = `/admin/zones${qs.toString() ? `?${qs}` : ''}`;
  const res = await apiRequest<{ success: boolean; data: any[]; pagination?: Pagination }>(url);
  if (!res?.success) throw new Error('Failed to load zones');
  const data = (res.data ?? []).map((z: any) => ({
    id: z._id?.toString?.() ?? z.id,
    name: z.name,
    code: z.code,
    cityId: z.cityId?.toString?.() ?? z.cityId,
    cityName: z.cityName,
    type: z.type,
    status: z.status,
    color: z.color,
    areaSqKm: z.areaSqKm,
    defaultCapacity: z.defaultCapacity,
  }));
  return { data, pagination: res.pagination };
}

export async function getZone(id: string): Promise<Zone> {
  const res = await apiRequest<{ success: boolean; data: any }>(`/admin/zones/${id}`);
  if (!res?.success || !res.data) throw new Error('Zone not found');
  const z = res.data;
  return {
    id: z._id?.toString?.() ?? z.id,
    name: z.name,
    code: z.code,
    cityId: z.cityId?.toString?.() ?? z.cityId,
    cityName: z.cityName,
    type: z.type,
    status: z.status,
    color: z.color,
    areaSqKm: z.areaSqKm,
    defaultCapacity: z.defaultCapacity,
  };
}

export async function createZone(data: Partial<Zone>): Promise<Zone> {
  const res = await apiRequest<{ success: boolean; data: any }>('/admin/zones', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res?.success || !res.data) throw new Error('Failed to create zone');
  const z = res.data;
  return { id: z._id?.toString?.() ?? z.id, name: z.name, code: z.code, cityId: z.cityId?.toString?.() ?? z.cityId, cityName: z.cityName, type: z.type, status: z.status };
}

export async function updateZone(id: string, data: Partial<Zone>): Promise<Zone> {
  const res = await apiRequest<{ success: boolean; data: any }>(`/admin/zones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res?.success || !res.data) throw new Error('Failed to update zone');
  const z = res.data;
  return { id: z._id?.toString?.() ?? z.id, name: z.name, code: z.code, cityId: z.cityId?.toString?.() ?? z.cityId, cityName: z.cityName, type: z.type, status: z.status };
}

export async function deleteZone(id: string): Promise<void> {
  await apiRequest(`/admin/zones/${id}`, { method: 'DELETE' });
}

// Vehicle Types
export async function fetchVehicleTypes(params?: { isActive?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.isActive !== undefined) qs.set('isActive', String(params.isActive));
  const url = `/admin/vehicle-types${qs.toString() ? `?${qs}` : ''}`;
  const res = await apiRequest<{ success: boolean; data: any[] }>(url);
  if (!res?.success) throw new Error('Failed to load vehicle types');
  const data = (res.data ?? []).map((v: any) => ({
    id: v._id?.toString?.() ?? v.id,
    code: v.code,
    name: v.name,
    description: v.description,
    isActive: v.isActive,
    sortOrder: v.sortOrder,
  }));
  return { data };
}

export async function createVehicleType(data: Partial<VehicleType>): Promise<VehicleType> {
  const res = await apiRequest<{ success: boolean; data: any }>('/admin/vehicle-types', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res?.success || !res.data) throw new Error('Failed to create vehicle type');
  const v = res.data;
  return { id: v._id?.toString?.() ?? v.id, code: v.code, name: v.name, description: v.description, isActive: v.isActive, sortOrder: v.sortOrder };
}

export async function updateVehicleType(id: string, data: Partial<VehicleType>): Promise<VehicleType> {
  const res = await apiRequest<{ success: boolean; data: any }>(`/admin/vehicle-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res?.success || !res.data) throw new Error('Failed to update vehicle type');
  const v = res.data;
  return { id: v._id?.toString?.() ?? v.id, code: v.code, name: v.name, description: v.description, isActive: v.isActive, sortOrder: v.sortOrder };
}

export async function deleteVehicleType(id: string): Promise<void> {
  await apiRequest(`/admin/vehicle-types/${id}`, { method: 'DELETE' });
}

// SKU Units
export async function fetchSkuUnits(params?: { isActive?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.isActive !== undefined) qs.set('isActive', String(params.isActive));
  const url = `/admin/sku-units${qs.toString() ? `?${qs}` : ''}`;
  const res = await apiRequest<{ success: boolean; data: any[] }>(url);
  if (!res?.success) throw new Error('Failed to load SKU units');
  const data = (res.data ?? []).map((s: any) => ({
    id: s._id?.toString?.() ?? s.id,
    code: s.code,
    name: s.name,
    baseUnit: s.baseUnit,
    conversionFactor: s.conversionFactor,
    isActive: s.isActive,
    sortOrder: s.sortOrder,
  }));
  return { data };
}

export async function createSkuUnit(data: Partial<SkuUnit>): Promise<SkuUnit> {
  const res = await apiRequest<{ success: boolean; data: any }>('/admin/sku-units', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res?.success || !res.data) throw new Error('Failed to create SKU unit');
  const s = res.data;
  return { id: s._id?.toString?.() ?? s.id, code: s.code, name: s.name, baseUnit: s.baseUnit, conversionFactor: s.conversionFactor, isActive: s.isActive, sortOrder: s.sortOrder };
}

export async function updateSkuUnit(id: string, data: Partial<SkuUnit>): Promise<SkuUnit> {
  const res = await apiRequest<{ success: boolean; data: any }>(`/admin/sku-units/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res?.success || !res.data) throw new Error('Failed to update SKU unit');
  const s = res.data;
  return { id: s._id?.toString?.() ?? s.id, code: s.code, name: s.name, baseUnit: s.baseUnit, conversionFactor: s.conversionFactor, isActive: s.isActive, sortOrder: s.sortOrder };
}

export async function deleteSkuUnit(id: string): Promise<void> {
  await apiRequest(`/admin/sku-units/${id}`, { method: 'DELETE' });
}

// Riders
export async function fetchRiders(params?: { status?: string; availability?: string; cityId?: string; search?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.availability) qs.set('availability', params.availability);
  if (params?.cityId) qs.set('cityId', params.cityId);
  if (params?.search) qs.set('search', params.search);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const url = `/admin/riders${qs.toString() ? `?${qs}` : ''}`;
  const res = await apiRequest<{ success: boolean; data: any[]; pagination?: Pagination }>(url);
  if (!res?.success) throw new Error('Failed to load riders');
  const data = (res.data ?? []).map((r: any) => ({
    id: r.id ?? r._id?.toString?.(),
    riderId: r.riderId,
    name: r.name,
    phone: r.phone,
    email: r.email,
    vehicleType: r.vehicleType,
    status: r.status,
    availability: r.availability,
    cityName: r.cityName,
    cityId: r.cityId,
    stats: r.stats,
  }));
  return { data, pagination: res.pagination };
}

export async function getRider(id: string): Promise<Rider> {
  const res = await apiRequest<{ success: boolean; data: any }>(`/admin/riders/${id}`);
  if (!res?.success || !res.data) throw new Error('Rider not found');
  const r = res.data;
  return {
    id: r.id ?? r._id?.toString?.(),
    riderId: r.riderId,
    name: r.name,
    phone: r.phone,
    email: r.email,
    vehicleType: r.vehicleType,
    status: r.status,
    availability: r.availability,
    cityName: r.cityName,
    cityId: r.cityId,
    stats: r.stats,
  };
}

export async function updateRiderStatus(id: string, payload: { status?: string; availability?: string }): Promise<Rider> {
  const res = await apiRequest<{ success: boolean; data: any }>(`/admin/riders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res?.success || !res.data) throw new Error('Failed to update rider');
  const r = res.data;
  return {
    id: r.id ?? r._id?.toString?.(),
    riderId: r.riderId,
    name: r.name,
    phone: r.phone,
    email: r.email,
    vehicleType: r.vehicleType,
    status: r.status,
    availability: r.availability,
    cityName: r.cityName,
    cityId: r.cityId,
    stats: r.stats,
  };
}
