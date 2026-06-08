import { apiRequest } from '../apiClient';

export interface StoreProfile {
  id: string;
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
}

export async function getStoreProfile(storeId: string): Promise<{ success: boolean; data: StoreProfile }> {
  return apiRequest(`/darkstore/dashboard/store-profile?storeId=${encodeURIComponent(storeId)}`);
}

export async function getWarehouseProfile(storeId: string): Promise<{ success: boolean; data: StoreProfile }> {
  return apiRequest(`/darkstore/dashboard/warehouse-profile?storeId=${encodeURIComponent(storeId)}`);
}
