import { apiRequest } from '@/api/apiClient';

// --- Type Definitions ---

export interface Store {
  id: string;
  name: string;
  code: string;
  type: 'store' | 'dark_store' | 'warehouse';
  address: string;
  city: string;
  zone?: string;
  cityId?: string;
  zoneId?: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  manager: string;
  managerId?: string;
  status: 'active' | 'inactive' | 'maintenance' | 'offline';
  operationalHours: {
    [key: string]: { open: string; close: string; isOpen: boolean };
  };
  deliveryRadius: number;
  maxCapacity: number;
  currentLoad: number;
  staffCount: number;
  rating: number;
  totalOrders: number;
  revenue: number;
  createdAt: string;
  lastUpdated?: string;
  updatedAt?: string;
}

export interface City {
  id: string;
  _id?: string;
  code: string;
  name: string;
  state?: string;
  country?: string;
}

export interface Zone {
  id: string;
  _id?: string;
  name: string;
  code?: string;
  cityId?: string;
  status?: string;
}

export interface Manager {
  id: string;
  name: string;
  email?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  storageCapacity: number; // in cubic meters
  currentUtilization: number; // percentage
  inventoryValue: number;
  productCount: number;
  zones: string[];
  manager: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Staff {
  id: string;
  name: string;
  role: 'manager' | 'picker' | 'packer' | 'delivery' | 'supervisor';
  storeId: string;
  storeName: string;
  phone: string;
  email: string;
  shift: 'morning' | 'evening' | 'night' | 'full_day';
  status: 'active' | 'on_leave' | 'inactive';
  joinedAt: string;
  performance: number; // 0-100
}

export interface DeliveryZone {
  id: string;
  name: string;
  storeId: string;
  storeName: string;
  radius: number; // in km
  areas: string[];
  isActive: boolean;
  avgDeliveryTime: number; // in minutes
  orderVolume: number;
}

export interface StorePerformance {
  storeId: string;
  storeName: string;
  ordersToday: number;
  ordersWeek: number;
  ordersMonth: number;
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  avgRating: number;
  totalReviews: number;
  onTimeDelivery: number; // percentage
  capacityUtilization: number; // percentage
}

// --- Mock Data (unused; all fetchers use real APIs) ---

let MOCK_STORES: Store[] = [
  {
    id: 'store-1',
    name: 'Indiranagar Express',
    code: 'BLR-IND-001',
    type: 'store',
    address: '100 Feet Road, Indiranagar',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560038',
    latitude: 12.9716,
    longitude: 77.6412,
    phone: '+91-80-4567-8901',
    email: 'indiranagar@quickcommerce.com',
    manager: 'Rajesh Kumar',
    status: 'active',
    operationalHours: {
      monday: { open: '06:00', close: '23:00', isOpen: true },
      tuesday: { open: '06:00', close: '23:00', isOpen: true },
      wednesday: { open: '06:00', close: '23:00', isOpen: true },
      thursday: { open: '06:00', close: '23:00', isOpen: true },
      friday: { open: '06:00', close: '23:00', isOpen: true },
      saturday: { open: '06:00', close: '23:00', isOpen: true },
      sunday: { open: '07:00', close: '22:00', isOpen: true },
    },
    deliveryRadius: 5,
    maxCapacity: 120,
    currentLoad: 87,
    staffCount: 24,
    rating: 4.6,
    totalOrders: 45820,
    revenue: 8940000,
    createdAt: '2023-06-15T08:00:00Z',
    lastUpdated: '2024-12-20T14:30:00Z',
  },
  {
    id: 'store-2',
    name: 'Koramangala Hub',
    code: 'BLR-KOR-002',
    type: 'dark_store',
    address: '5th Block, Koramangala',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560095',
    latitude: 12.9352,
    longitude: 77.6245,
    phone: '+91-80-4567-8902',
    email: 'koramangala@quickcommerce.com',
    manager: 'Priya Sharma',
    status: 'active',
    operationalHours: {
      monday: { open: '00:00', close: '23:59', isOpen: true },
      tuesday: { open: '00:00', close: '23:59', isOpen: true },
      wednesday: { open: '00:00', close: '23:59', isOpen: true },
      thursday: { open: '00:00', close: '23:59', isOpen: true },
      friday: { open: '00:00', close: '23:59', isOpen: true },
      saturday: { open: '00:00', close: '23:59', isOpen: true },
      sunday: { open: '00:00', close: '23:59', isOpen: true },
    },
    deliveryRadius: 7,
    maxCapacity: 200,
    currentLoad: 156,
    staffCount: 38,
    rating: 4.8,
    totalOrders: 78450,
    revenue: 15600000,
    createdAt: '2023-04-10T08:00:00Z',
    lastUpdated: '2024-12-20T14:30:00Z',
  },
  {
    id: 'store-3',
    name: 'Whitefield Central',
    code: 'BLR-WHI-003',
    type: 'store',
    address: 'ITPL Main Road, Whitefield',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560066',
    latitude: 12.9698,
    longitude: 77.7499,
    phone: '+91-80-4567-8903',
    email: 'whitefield@quickcommerce.com',
    manager: 'Amit Patel',
    status: 'active',
    operationalHours: {
      monday: { open: '06:00', close: '23:00', isOpen: true },
      tuesday: { open: '06:00', close: '23:00', isOpen: true },
      wednesday: { open: '06:00', close: '23:00', isOpen: true },
      thursday: { open: '06:00', close: '23:00', isOpen: true },
      friday: { open: '06:00', close: '23:00', isOpen: true },
      saturday: { open: '06:00', close: '23:00', isOpen: true },
      sunday: { open: '07:00', close: '22:00', isOpen: true },
    },
    deliveryRadius: 6,
    maxCapacity: 150,
    currentLoad: 98,
    staffCount: 28,
    rating: 4.5,
    totalOrders: 52300,
    revenue: 10800000,
    createdAt: '2023-07-22T08:00:00Z',
    lastUpdated: '2024-12-20T14:30:00Z',
  },
  {
    id: 'store-4',
    name: 'HSR Layout Express',
    code: 'BLR-HSR-004',
    type: 'store',
    address: 'Sector 1, HSR Layout',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560102',
    latitude: 12.9116,
    longitude: 77.6473,
    phone: '+91-80-4567-8904',
    email: 'hsr@quickcommerce.com',
    manager: 'Sneha Reddy',
    status: 'active',
    operationalHours: {
      monday: { open: '06:00', close: '23:00', isOpen: true },
      tuesday: { open: '06:00', close: '23:00', isOpen: true },
      wednesday: { open: '06:00', close: '23:00', isOpen: true },
      thursday: { open: '06:00', close: '23:00', isOpen: true },
      friday: { open: '06:00', close: '23:00', isOpen: true },
      saturday: { open: '06:00', close: '23:00', isOpen: true },
      sunday: { open: '07:00', close: '22:00', isOpen: true },
    },
    deliveryRadius: 5,
    maxCapacity: 130,
    currentLoad: 72,
    staffCount: 22,
    rating: 4.7,
    totalOrders: 38920,
    revenue: 7560000,
    createdAt: '2023-08-05T08:00:00Z',
    lastUpdated: '2024-12-20T14:30:00Z',
  },
  {
    id: 'store-5',
    name: 'Jayanagar Quick Stop',
    code: 'BLR-JAY-005',
    type: 'store',
    address: '4th Block, Jayanagar',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560011',
    latitude: 12.9250,
    longitude: 77.5838,
    phone: '+91-80-4567-8905',
    email: 'jayanagar@quickcommerce.com',
    manager: 'Vikram Singh',
    status: 'active',
    operationalHours: {
      monday: { open: '06:00', close: '22:00', isOpen: true },
      tuesday: { open: '06:00', close: '22:00', isOpen: true },
      wednesday: { open: '06:00', close: '22:00', isOpen: true },
      thursday: { open: '06:00', close: '22:00', isOpen: true },
      friday: { open: '06:00', close: '22:00', isOpen: true },
      saturday: { open: '06:00', close: '22:00', isOpen: true },
      sunday: { open: '07:00', close: '21:00', isOpen: true },
    },
    deliveryRadius: 4,
    maxCapacity: 100,
    currentLoad: 54,
    staffCount: 18,
    rating: 4.4,
    totalOrders: 29450,
    revenue: 5890000,
    createdAt: '2023-09-12T08:00:00Z',
    lastUpdated: '2024-12-20T14:30:00Z',
  },
  {
    id: 'store-6',
    name: 'Electronic City Hub',
    code: 'BLR-EC-006',
    type: 'dark_store',
    address: 'Phase 1, Electronic City',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560100',
    latitude: 12.8456,
    longitude: 77.6603,
    phone: '+91-80-4567-8906',
    email: 'ecity@quickcommerce.com',
    manager: 'Deepak Malhotra',
    status: 'maintenance',
    operationalHours: {
      monday: { open: '00:00', close: '23:59', isOpen: false },
      tuesday: { open: '00:00', close: '23:59', isOpen: false },
      wednesday: { open: '00:00', close: '23:59', isOpen: false },
      thursday: { open: '00:00', close: '23:59', isOpen: false },
      friday: { open: '00:00', close: '23:59', isOpen: false },
      saturday: { open: '00:00', close: '23:59', isOpen: false },
      sunday: { open: '00:00', close: '23:59', isOpen: false },
    },
    deliveryRadius: 8,
    maxCapacity: 180,
    currentLoad: 0,
    staffCount: 32,
    rating: 4.3,
    totalOrders: 42100,
    revenue: 8240000,
    createdAt: '2023-05-18T08:00:00Z',
    lastUpdated: '2024-12-20T14:30:00Z',
  },
  {
    id: 'store-7',
    name: 'Marathahalli Express',
    code: 'BLR-MAR-007',
    type: 'store',
    address: 'Outer Ring Road, Marathahalli',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560037',
    latitude: 12.9591,
    longitude: 77.6974,
    phone: '+91-80-4567-8907',
    email: 'marathahalli@quickcommerce.com',
    manager: 'Kavita Nair',
    status: 'active',
    operationalHours: {
      monday: { open: '06:00', close: '23:00', isOpen: true },
      tuesday: { open: '06:00', close: '23:00', isOpen: true },
      wednesday: { open: '06:00', close: '23:00', isOpen: true },
      thursday: { open: '06:00', close: '23:00', isOpen: true },
      friday: { open: '06:00', close: '23:00', isOpen: true },
      saturday: { open: '06:00', close: '23:00', isOpen: true },
      sunday: { open: '07:00', close: '22:00', isOpen: true },
    },
    deliveryRadius: 6,
    maxCapacity: 140,
    currentLoad: 89,
    staffCount: 26,
    rating: 4.6,
    totalOrders: 36780,
    revenue: 7120000,
    createdAt: '2023-06-28T08:00:00Z',
    lastUpdated: '2024-12-20T14:30:00Z',
  },
  {
    id: 'store-8',
    name: 'MG Road Premium',
    code: 'BLR-MG-008',
    type: 'store',
    address: 'MG Road, Central Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
    latitude: 12.9762,
    longitude: 77.6033,
    phone: '+91-80-4567-8908',
    email: 'mgroad@quickcommerce.com',
    manager: 'Arjun Menon',
    status: 'active',
    operationalHours: {
      monday: { open: '07:00', close: '22:00', isOpen: true },
      tuesday: { open: '07:00', close: '22:00', isOpen: true },
      wednesday: { open: '07:00', close: '22:00', isOpen: true },
      thursday: { open: '07:00', close: '22:00', isOpen: true },
      friday: { open: '07:00', close: '22:00', isOpen: true },
      saturday: { open: '07:00', close: '22:00', isOpen: true },
      sunday: { open: '08:00', close: '21:00', isOpen: true },
    },
    deliveryRadius: 3,
    maxCapacity: 80,
    currentLoad: 45,
    staffCount: 15,
    rating: 4.8,
    totalOrders: 24560,
    revenue: 6230000,
    createdAt: '2023-10-03T08:00:00Z',
    lastUpdated: '2024-12-20T14:30:00Z',
  },
];

let MOCK_WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-1',
    name: 'Central Fulfillment Hub',
    code: 'WH-BLR-CENTRAL',
    address: 'Peenya Industrial Area, Bangalore',
    city: 'Bangalore',
    storageCapacity: 50000,
    currentUtilization: 76,
    inventoryValue: 45600000,
    productCount: 8945,
    zones: ['North Bangalore', 'Central Bangalore', 'East Bangalore'],
    manager: 'Sanjay Gupta',
    status: 'active',
    createdAt: '2023-03-01T08:00:00Z',
  },
  {
    id: 'wh-2',
    name: 'South Distribution Center',
    code: 'WH-BLR-SOUTH',
    address: 'Bommasandra Industrial Area, Bangalore',
    city: 'Bangalore',
    storageCapacity: 35000,
    currentUtilization: 68,
    inventoryValue: 28900000,
    productCount: 6240,
    zones: ['South Bangalore', 'Electronic City'],
    manager: 'Meera Krishnan',
    status: 'active',
    createdAt: '2023-04-15T08:00:00Z',
  },
  {
    id: 'wh-3',
    name: 'East Zone Warehouse',
    code: 'WH-BLR-EAST',
    address: 'Whitefield Industrial Zone, Bangalore',
    city: 'Bangalore',
    storageCapacity: 28000,
    currentUtilization: 82,
    inventoryValue: 32400000,
    productCount: 5680,
    zones: ['Whitefield', 'KR Puram', 'Marathahalli'],
    manager: 'Ramesh Iyer',
    status: 'active',
    createdAt: '2023-05-20T08:00:00Z',
  },
];

let MOCK_STAFF: Staff[] = [
  { id: 'staff-1', name: 'Rajesh Kumar', role: 'manager', storeId: 'store-1', storeName: 'Indiranagar Express', phone: '+91-98765-43201', email: 'rajesh.k@qc.com', shift: 'full_day', status: 'active', joinedAt: '2023-06-15T08:00:00Z', performance: 92 },
  { id: 'staff-2', name: 'Anil Verma', role: 'picker', storeId: 'store-1', storeName: 'Indiranagar Express', phone: '+91-98765-43202', email: 'anil.v@qc.com', shift: 'morning', status: 'active', joinedAt: '2023-07-10T08:00:00Z', performance: 88 },
  { id: 'staff-3', name: 'Sunita Rao', role: 'packer', storeId: 'store-1', storeName: 'Indiranagar Express', phone: '+91-98765-43203', email: 'sunita.r@qc.com', shift: 'evening', status: 'active', joinedAt: '2023-07-15T08:00:00Z', performance: 85 },
  { id: 'staff-4', name: 'Priya Sharma', role: 'manager', storeId: 'store-2', storeName: 'Koramangala Hub', phone: '+91-98765-43204', email: 'priya.s@qc.com', shift: 'full_day', status: 'active', joinedAt: '2023-04-10T08:00:00Z', performance: 95 },
  { id: 'staff-5', name: 'Kiran Desai', role: 'supervisor', storeId: 'store-2', storeName: 'Koramangala Hub', phone: '+91-98765-43205', email: 'kiran.d@qc.com', shift: 'night', status: 'active', joinedAt: '2023-05-12T08:00:00Z', performance: 90 },
  { id: 'staff-6', name: 'Amit Patel', role: 'manager', storeId: 'store-3', storeName: 'Whitefield Central', phone: '+91-98765-43206', email: 'amit.p@qc.com', shift: 'full_day', status: 'active', joinedAt: '2023-07-22T08:00:00Z', performance: 87 },
  { id: 'staff-7', name: 'Neha Singh', role: 'delivery', storeId: 'store-3', storeName: 'Whitefield Central', phone: '+91-98765-43207', email: 'neha.s@qc.com', shift: 'morning', status: 'active', joinedAt: '2023-08-05T08:00:00Z', performance: 91 },
  { id: 'staff-8', name: 'Ravi Kumar', role: 'picker', storeId: 'store-3', storeName: 'Whitefield Central', phone: '+91-98765-43208', email: 'ravi.k@qc.com', shift: 'evening', status: 'on_leave', joinedAt: '2023-08-10T08:00:00Z', performance: 83 },
];

let MOCK_ZONES: DeliveryZone[] = [
  { id: 'zone-1', name: 'Indiranagar Coverage', storeId: 'store-1', storeName: 'Indiranagar Express', radius: 5, areas: ['Indiranagar', 'Domlur', 'HAL', 'Jeevanbhima Nagar'], isActive: true, avgDeliveryTime: 18, orderVolume: 2450 },
  { id: 'zone-2', name: 'Koramangala Premium', storeId: 'store-2', storeName: 'Koramangala Hub', radius: 7, areas: ['Koramangala', 'BTM Layout', 'HSR Layout', 'Silk Board'], isActive: true, avgDeliveryTime: 15, orderVolume: 3890 },
  { id: 'zone-3', name: 'Whitefield Tech Park', storeId: 'store-3', storeName: 'Whitefield Central', radius: 6, areas: ['Whitefield', 'ITPL', 'Varthur', 'Brookefield'], isActive: true, avgDeliveryTime: 20, orderVolume: 2120 },
  { id: 'zone-4', name: 'HSR Residential', storeId: 'store-4', storeName: 'HSR Layout Express', radius: 5, areas: ['HSR Layout', 'Bommanahalli', 'Begur', 'Hongasandra'], isActive: true, avgDeliveryTime: 17, orderVolume: 1850 },
  { id: 'zone-5', name: 'Jayanagar South', storeId: 'store-5', storeName: 'Jayanagar Quick Stop', radius: 4, areas: ['Jayanagar', 'JP Nagar', 'Banashankari'], isActive: true, avgDeliveryTime: 16, orderVolume: 1540 },
];

const MOCK_STORE_PERFORMANCE: StorePerformance[] = [
  { storeId: 'store-1', storeName: 'Indiranagar Express', ordersToday: 87, ordersWeek: 612, ordersMonth: 2540, revenueToday: 174000, revenueWeek: 1224000, revenueMonth: 5080000, avgRating: 4.6, totalReviews: 4582, onTimeDelivery: 96, capacityUtilization: 73 },
  { storeId: 'store-2', storeName: 'Koramangala Hub', ordersToday: 156, ordersWeek: 1092, ordersMonth: 4520, revenueToday: 312000, revenueWeek: 2184000, revenueMonth: 9040000, avgRating: 4.8, totalReviews: 7845, onTimeDelivery: 98, capacityUtilization: 78 },
  { storeId: 'store-3', storeName: 'Whitefield Central', ordersToday: 98, ordersWeek: 686, ordersMonth: 2840, revenueToday: 196000, revenueWeek: 1372000, revenueMonth: 5680000, avgRating: 4.5, totalReviews: 5230, onTimeDelivery: 94, capacityUtilization: 65 },
  { storeId: 'store-4', storeName: 'HSR Layout Express', ordersToday: 72, ordersWeek: 504, ordersMonth: 2090, revenueToday: 144000, revenueWeek: 1008000, revenueMonth: 4180000, avgRating: 4.7, totalReviews: 3892, onTimeDelivery: 97, capacityUtilization: 55 },
  { storeId: 'store-5', storeName: 'Jayanagar Quick Stop', ordersToday: 54, ordersWeek: 378, ordersMonth: 1560, revenueToday: 108000, revenueWeek: 756000, revenueMonth: 3120000, avgRating: 4.4, totalReviews: 2945, onTimeDelivery: 95, capacityUtilization: 54 },
];

// --- API Functions ---

function normalizeStore(raw: any): Store {
  if (!raw) return raw;
  const oh = raw.operationalHours;
  const operationalHours =
    oh && typeof oh === 'object'
      ? oh instanceof Map
        ? Object.fromEntries(oh)
        : oh
      : {};
  return {
    id: raw.id ?? raw._id?.toString(),
    name: raw.name,
    code: raw.code ?? `STORE-${raw._id}`,
    type: raw.type ?? 'store',
    address: raw.address,
    city: raw.city ?? raw.cityId?.name ?? '',
    zone: raw.zone ?? raw.zoneId?.name,
    cityId: raw.cityId?._id ?? raw.cityId,
    zoneId: raw.zoneId?._id ?? raw.zoneId,
    state: raw.state ?? '',
    pincode: raw.pincode ?? '',
    latitude: raw.latitude ?? raw.x ?? 0,
    longitude: raw.longitude ?? raw.y ?? 0,
    phone: raw.phone ?? '',
    email: raw.email ?? '',
    manager: raw.manager ?? raw.managerId?.name ?? '',
    managerId: raw.managerId?._id ?? raw.managerId,
    status: raw.status ?? 'active',
    operationalHours,
    deliveryRadius: raw.deliveryRadius ?? 5,
    maxCapacity: raw.maxCapacity ?? 100,
    currentLoad: raw.currentLoad ?? 0,
    staffCount: raw.staffCount ?? 0,
    rating: raw.rating ?? 0,
    totalOrders: raw.totalOrders ?? 0,
    revenue: raw.revenue ?? 0,
    createdAt: raw.createdAt ?? '',
    lastUpdated: raw.updatedAt ?? raw.lastUpdated,
    updatedAt: raw.updatedAt,
  };
}

export async function fetchStores(params?: {
  search?: string;
  status?: string;
  cityId?: string;
  zoneId?: string;
  type?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Store[]; pagination?: Pagination }> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.status) qs.set('status', params.status);
  if (params?.cityId) qs.set('cityId', params.cityId);
  if (params?.zoneId) qs.set('zoneId', params.zoneId);
  if (params?.type) qs.set('type', params.type);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));

  const url = `/admin/stores${qs.toString() ? `?${qs}` : ''}`;
  const response = await apiRequest<{ success: boolean; data: any[]; pagination?: Pagination }>(url);
  if (!response?.success || !response.data) {
    throw new Error('Failed to load stores');
  }
  const data = response.data.map(normalizeStore);
  return { data, pagination: response.pagination };
}

export async function getStore(id: string): Promise<Store> {
  const response = await apiRequest<{ success: boolean; data: any }>(`/admin/stores/${id}`);
  if (!response?.success || !response.data) {
    throw new Error('Store not found');
  }
  return normalizeStore(response.data);
}

export async function fetchCities(): Promise<City[]> {
  const response = await apiRequest<{ success: boolean; data: any[] }>('/admin/cities');
  if (!response?.success) throw new Error('Failed to load cities');
  return (response.data ?? []).map((c: any) => ({
    id: c._id?.toString?.() ?? c.id,
    code: c.code,
    name: c.name,
    state: c.state,
    country: c.country,
  }));
}

export async function fetchZones(cityId?: string): Promise<Zone[]> {
  const url = cityId ? `/admin/zones?cityId=${encodeURIComponent(cityId)}` : '/admin/zones';
  const response = await apiRequest<{ success: boolean; data: any[] }>(url);
  if (!response?.success) throw new Error('Failed to load zones');
  return (response.data ?? []).map((z: any) => ({
    id: z._id?.toString?.() ?? z.id,
    name: z.name,
    code: z.code,
    cityId: z.cityId?.toString?.() ?? z.cityId,
    status: z.status,
  }));
}

export async function fetchManagers(): Promise<Manager[]> {
  const response = await apiRequest<{ success: boolean; data: Manager[] }>('/admin/users/managers');
  if (!response?.success) throw new Error('Failed to load managers');
  return response.data ?? [];
}

export async function fetchWarehouses(params?: { search?: string; status?: string; page?: number; limit?: number }): Promise<{ data: Warehouse[]; pagination?: Pagination }> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.status) qs.set('status', params.status);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const url = `/admin/warehouses${qs.toString() ? `?${qs}` : ''}`;
  const response = await apiRequest<{ success: boolean; data: any[]; pagination?: Pagination }>(url);
  if (!response?.success) throw new Error('Failed to load warehouses');
  const data = (response.data ?? []).map((w: any) => ({
    id: w._id?.toString?.() ?? w.id,
    name: w.name,
    code: w.code ?? `WH-${w.id}`,
    address: w.address ?? '',
    city: w.city ?? '',
    storageCapacity: w.storageCapacity ?? 0,
    currentUtilization: w.currentUtilization ?? 0,
    inventoryValue: w.inventoryValue ?? 0,
    productCount: w.productCount ?? 0,
    zones: w.zones ?? [],
    manager: w.manager ?? '',
    status: w.status ?? 'active',
    createdAt: w.createdAt ?? '',
  }));
  return { data, pagination: response.pagination };
}

export async function fetchStaff(params?: { storeId?: string; role?: string; status?: string }): Promise<Staff[]> {
  const qs = new URLSearchParams();
  if (params?.storeId) qs.set('storeId', params.storeId);
  if (params?.role) qs.set('role', params.role);
  if (params?.status) qs.set('status', params.status);
  const url = `/admin/staff${qs.toString() ? `?${qs}` : ''}`;
  const response = await apiRequest<{ success: boolean; data: any[] }>(url);
  if (!response?.success) throw new Error('Failed to load staff');
  return (response.data ?? []).map((s: any) => ({
    id: s._id?.toString?.() ?? s.id,
    name: s.name,
    role: (s.role ?? 'Picker').toLowerCase().replace(/loader/i, 'delivery').replace(/rider/i, 'delivery') as Staff['role'],
    storeId: s.storeId?.toString?.() ?? s.storeId ?? '',
    storeName: s.storeName ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    shift: s.shift ?? 'full_day',
    status: (s.status ?? 'Offline').toLowerCase().replace(/break|meeting/i, 'on_leave') as Staff['status'],
    joinedAt: s.joinedAt ?? s.createdAt ?? '',
    performance: s.performance ?? 0,
  }));
}

export async function createStaff(data: Partial<Staff>): Promise<Staff> {
  const payload: Record<string, unknown> = {
    id: data.id ?? `staff-${Date.now()}`,
    name: data.name,
    role: (data.role ?? 'Picker').charAt(0).toUpperCase() + (data.role ?? 'Picker').slice(1),
    storeId: data.storeId || undefined,
    zone: (data as any).zone,
    status: (data.status ?? 'Offline').charAt(0).toUpperCase() + (data.status ?? 'Offline').slice(1),
    phone: data.phone,
    email: data.email,
    shift: data.shift,
    joinedAt: data.joinedAt,
    performance: data.performance,
  };
  const res = await apiRequest<{ success: boolean; data: any }>('/admin/staff', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res?.success || !res.data) throw new Error('Failed to create staff');
  const s = res.data;
  return {
    id: s._id?.toString?.() ?? s.id,
    name: s.name,
    role: (s.role ?? 'Picker').toLowerCase().replace(/loader/i, 'delivery').replace(/rider/i, 'delivery') as Staff['role'],
    storeId: s.storeId?.toString?.() ?? s.storeId ?? '',
    storeName: s.storeName ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    shift: s.shift ?? 'full_day',
    status: (s.status ?? 'Offline').toLowerCase().replace(/break|meeting/i, 'on_leave') as Staff['status'],
    joinedAt: s.joinedAt ?? s.createdAt ?? '',
    performance: s.performance ?? 0,
  };
}

export async function updateStaff(id: string, data: Partial<Staff>): Promise<Staff> {
  const payload: Record<string, unknown> = {
    name: data.name,
    role: data.role ? (data.role.charAt(0).toUpperCase() + data.role.slice(1)) : undefined,
    storeId: data.storeId,
    zone: (data as any).zone,
    status: data.status ? (data.status.charAt(0).toUpperCase() + data.status.slice(1)) : undefined,
    phone: data.phone,
    email: data.email,
    shift: data.shift,
    joinedAt: data.joinedAt,
    performance: data.performance,
  };
  const res = await apiRequest<{ success: boolean; data: any }>(`/admin/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res?.success || !res.data) throw new Error('Failed to update staff');
  const s = res.data;
  return {
    id: s._id?.toString?.() ?? s.id,
    name: s.name,
    role: (s.role ?? 'Picker').toLowerCase().replace(/loader/i, 'delivery').replace(/rider/i, 'delivery') as Staff['role'],
    storeId: s.storeId?.toString?.() ?? s.storeId ?? '',
    storeName: s.storeName ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    shift: s.shift ?? 'full_day',
    status: (s.status ?? 'Offline').toLowerCase().replace(/break|meeting/i, 'on_leave') as Staff['status'],
    joinedAt: s.joinedAt ?? s.createdAt ?? '',
    performance: s.performance ?? 0,
  };
}

export async function deleteStaff(id: string): Promise<void> {
  await apiRequest(`/admin/staff/${id}`, { method: 'DELETE' });
}

export async function fetchDeliveryZones(): Promise<DeliveryZone[]> {
  const response = await apiRequest<{ success: boolean; data?: DeliveryZone[] }>('/admin/store-warehouse/delivery-zones');
  if (!response?.success) throw new Error('Failed to load delivery zones');
  return response.data ?? [];
}

export async function fetchStorePerformance(): Promise<StorePerformance[]> {
  const response = await apiRequest<{ success: boolean; data?: StorePerformance[] }>('/admin/stores/performance');
  if (!response?.success) throw new Error('Failed to load store performance');
  return response.data ?? [];
}

export async function createStore(data: Partial<Store>): Promise<Store> {
  const payload: Record<string, unknown> = {
    name: data.name,
    code: data.code,
    type: data.type ?? 'store',
    address: data.address,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    latitude: data.latitude,
    longitude: data.longitude,
    phone: data.phone,
    email: data.email,
    managerId: data.managerId,
    status: data.status ?? 'active',
    deliveryRadius: data.deliveryRadius ?? 5,
    maxCapacity: data.maxCapacity ?? 100,
    operationalHours: data.operationalHours,
  };
  if (data.cityId) payload.cityId = data.cityId;
  if (data.zoneId) payload.zoneId = data.zoneId;
  const response = await apiRequest<{ success: boolean; data: any }>('/admin/stores', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response?.data) throw new Error('No data returned from API');
  return normalizeStore(response.data);
}

export async function updateStore(id: string, data: Partial<Store>): Promise<Store> {
  const payload: Record<string, unknown> = {
    name: data.name,
    code: data.code,
    type: data.type,
    address: data.address,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    latitude: data.latitude,
    longitude: data.longitude,
    phone: data.phone,
    email: data.email,
    managerId: data.managerId,
    status: data.status,
    deliveryRadius: data.deliveryRadius,
    maxCapacity: data.maxCapacity,
    operationalHours: data.operationalHours,
  };
  if (data.cityId) payload.cityId = data.cityId;
  if (data.zoneId) payload.zoneId = data.zoneId;
  const response = await apiRequest<{ success: boolean; data: any }>(`/admin/stores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!response?.data) throw new Error('No data returned from API');
  return normalizeStore(response.data);
}

export async function deleteStore(id: string): Promise<void> {
  await apiRequest(`/admin/stores/${id}`, {
    method: 'DELETE',
  });
}

export async function getWarehouse(id: string): Promise<Warehouse> {
  const res = await apiRequest<{ success: boolean; data: any }>(`/admin/warehouses/${id}`);
  if (!res?.success || !res.data) throw new Error('Warehouse not found');
  const w = res.data;
  return {
    id: w._id?.toString?.() ?? w.id,
    name: w.name,
    code: w.code ?? `WH-${w.id}`,
    address: w.address ?? '',
    city: w.city ?? '',
    storageCapacity: w.storageCapacity ?? 0,
    currentUtilization: w.currentUtilization ?? 0,
    inventoryValue: w.inventoryValue ?? 0,
    productCount: w.productCount ?? 0,
    zones: w.zones ?? [],
    manager: w.manager ?? '',
    status: w.status ?? 'active',
    createdAt: w.createdAt ?? '',
  };
}

export async function createWarehouse(data: Partial<Warehouse> & { cityId?: string; zoneId?: string }): Promise<Warehouse> {
  const payload: Record<string, unknown> = {
    name: data.name,
    code: data.code,
    type: 'warehouse',
    address: data.address ?? '',
    city: data.city,
    cityId: data.cityId,
    zoneId: data.zoneId,
    maxCapacity: data.storageCapacity ?? 1000,
  };
  const res = await apiRequest<{ success: boolean; data: any }>('/admin/warehouses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res?.success || !res.data) throw new Error('Failed to create warehouse');
  const w = res.data;
  return {
    id: w._id?.toString?.() ?? w.id,
    name: w.name,
    code: w.code,
    address: w.address ?? '',
    city: w.city ?? '',
    storageCapacity: w.storageCapacity ?? w.maxCapacity ?? 0,
    currentUtilization: 0,
    inventoryValue: 0,
    productCount: 0,
    zones: w.zones ?? [],
    manager: w.manager ?? '',
    status: w.status ?? 'active',
    createdAt: w.createdAt ?? '',
  };
}

export async function updateWarehouse(id: string, data: Partial<Warehouse> & { cityId?: string; zoneId?: string }): Promise<Warehouse> {
  const payload: Record<string, unknown> = {
    name: data.name,
    code: data.code,
    address: data.address,
    city: data.city,
    cityId: data.cityId,
    zoneId: data.zoneId,
    maxCapacity: data.storageCapacity,
    status: data.status,
  };
  const res = await apiRequest<{ success: boolean; data: any }>(`/admin/warehouses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res?.success || !res.data) throw new Error('Failed to update warehouse');
  const w = res.data;
  return {
    id: w._id?.toString?.() ?? w.id,
    name: w.name,
    code: w.code,
    address: w.address ?? '',
    city: w.city ?? '',
    storageCapacity: w.storageCapacity ?? w.maxCapacity ?? 0,
    currentUtilization: w.currentUtilization ?? 0,
    inventoryValue: w.inventoryValue ?? 0,
    productCount: w.productCount ?? 0,
    zones: w.zones ?? [],
    manager: w.manager ?? '',
    status: w.status ?? 'active',
    createdAt: w.createdAt ?? '',
  };
}

export async function deleteWarehouse(id: string): Promise<void> {
  await apiRequest(`/admin/warehouses/${id}`, { method: 'DELETE' });
}

export async function bulkUpdateStoreStatus(ids: string[], status: 'active' | 'inactive' | 'maintenance'): Promise<number> {
  await Promise.all(
    ids.map(id =>
      apiRequest(`/admin/stores/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
    )
  );
  return ids.length;
}

export async function getStoreStats(): Promise<{
  totalStores: number;
  activeStores: number;
  totalWarehouses: number;
  totalStaff: number;
  avgRating: number;
}> {
  const response = await apiRequest<{ success: boolean; data: any }>('/admin/stores/stats');
  if (!response?.success || !response.data) throw new Error('Failed to load store stats');
  const d = response.data;
  return {
    totalStores: d.totalStores ?? 0,
    activeStores: d.activeStores ?? 0,
    totalWarehouses: d.totalWarehouses ?? 0,
    totalStaff: d.totalStaff ?? 0,
    avgRating: typeof d.avgRating === 'number' ? d.avgRating : parseFloat(d.avgRating ?? '0') || 0,
  };
}

// --- Admin Store & Warehouse sub-sections (Inventories, Stock Movements, GRNs, Putaway, Bins) ---

export interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  location: string;
  value: number;
  lastUpdated?: string;
}

export interface StockMovement {
  id: string;
  type: string;
  reference: string;
  fromLocation: string;
  toLocation: string;
  sku?: string;
  productName?: string;
  quantity: number;
  status: string;
  createdAt?: string;
}

export interface GRN {
  id: string;
  poNumber: string;
  vendor: string;
  status: string;
  items: number;
  timestamp?: string;
}

export interface PutawayTask {
  id: string;
  grnId?: string;
  transferId?: string;
  sku: string;
  productName: string;
  quantity: number;
  location: string;
  actualLocation?: string;
  status: string;
  assignedTo?: string;
  storeId?: string;
  createdAt?: string;
}

export interface Bin {
  id: string;
  aisle: string;
  rack: number;
  shelf: number;
  status: string;
  sku?: string;
  quantity?: number;
  zone?: string;
}

export async function fetchInventories(params?: { page?: number; limit?: number }): Promise<{ data: InventoryItem[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const url = `/admin/store-warehouse/inventories${qs.toString() ? `?${qs}` : ''}`;
  const response = await apiRequest<{ success: boolean; data: InventoryItem[]; meta: any }>(url);
  if (!response?.success) throw new Error('Failed to load inventories');
  return { data: response.data ?? [], meta: response.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 } };
}

export async function fetchStockMovements(params?: { page?: number; limit?: number }): Promise<{ data: StockMovement[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const url = `/admin/store-warehouse/stock-movements${qs.toString() ? `?${qs}` : ''}`;
  const response = await apiRequest<{ success: boolean; data: StockMovement[]; meta: any }>(url);
  if (!response?.success) throw new Error('Failed to load stock movements');
  return { data: response.data ?? [], meta: response.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 } };
}

export async function fetchGRNs(params?: { page?: number; limit?: number; status?: string }): Promise<{ data: GRN[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.status) qs.set('status', params.status);
  const url = `/admin/store-warehouse/grns${qs.toString() ? `?${qs}` : ''}`;
  const response = await apiRequest<{ success: boolean; data: GRN[]; meta: any }>(url);
  if (!response?.success) throw new Error('Failed to load GRNs');
  return { data: response.data ?? [], meta: response.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 } };
}

export async function fetchPutawayTasks(params?: { page?: number; limit?: number; status?: string }): Promise<{ data: PutawayTask[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.status) qs.set('status', params.status);
  const url = `/admin/store-warehouse/putaway${qs.toString() ? `?${qs}` : ''}`;
  const response = await apiRequest<{ success: boolean; data: PutawayTask[]; meta: any }>(url);
  if (!response?.success) throw new Error('Failed to load putaway tasks');
  return { data: response.data ?? [], meta: response.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 } };
}

export async function fetchBins(params?: { page?: number; limit?: number }): Promise<{ data: Bin[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const url = `/admin/store-warehouse/bins${qs.toString() ? `?${qs}` : ''}`;
  const response = await apiRequest<{ success: boolean; data: Bin[]; meta: any }>(url);
  if (!response?.success) throw new Error('Failed to load bins');
  return { data: response.data ?? [], meta: response.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 } };
}
