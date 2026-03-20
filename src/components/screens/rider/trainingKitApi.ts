import { apiRequest } from '@/api/apiClient';
import { API_ENDPOINTS } from '@/config/api';

export interface KitItem {
  id: string;
  label: string;
  iconName: 'tshirt' | 'delivery_bag' | 'id_card' | 'other';
  isActive: boolean;
  order: number;
}

export interface KitConfig {
  _id?: string;
  title: string;
  description: string;
  items: KitItem[];
  isActive: boolean;
}

// Reuse TrainingVideo interface from admin
export interface TrainingVideo {
  _id: string;
  videoId: string;
  title: string;
  description?: string;
  duration: number;
  durationDisplay: string;
  videoUrl: string;
  thumbnailUrl?: string;
  order: number;
  minimumWatchPercentage?: number;
  isActive: boolean;
}

export async function fetchKitConfig(): Promise<KitConfig> {
  const res = await apiRequest<{ success: boolean; data: KitConfig }>(
    '/rider/kit/config'
  );
  return res.data!;
}

export async function updateKitConfig(data: Partial<KitConfig>): Promise<KitConfig> {
  const res = await apiRequest<{ success: boolean; data: KitConfig }>(
    '/rider/kit/config',
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
  return res.data!;
}

export async function fetchTrainingVideos(): Promise<TrainingVideo[]> {
  const res = await apiRequest<{ success: boolean; data: TrainingVideo[] }>(
    '/rider/kit/training-videos'
  );
  return res.data ?? [];
}

export interface TrainingVideoFormData {
  videoId?: string;
  title: string;
  description?: string;
  duration: number;
  durationDisplay?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  order: number;
  minimumWatchPercentage?: number;
  isActive: boolean;
}

export async function createTrainingVideo(
  data: TrainingVideoFormData
): Promise<TrainingVideo> {
  const res = await apiRequest<{ success: boolean; data: TrainingVideo }>(
    API_ENDPOINTS.admin.trainingVideos.create,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
  return res.data!;
}

export async function updateTrainingVideo(
  id: string,
  data: Partial<TrainingVideoFormData>
): Promise<TrainingVideo> {
  const res = await apiRequest<{ success: boolean; data: TrainingVideo }>(
    API_ENDPOINTS.admin.trainingVideos.update(id),
    {
      method: 'PUT',
      body: JSON.stringify(data),
    }
  );
  return res.data!;
}

export async function deleteTrainingVideo(id: string): Promise<void> {
  await apiRequest<{ success: boolean }>(API_ENDPOINTS.admin.trainingVideos.delete(id), {
    method: 'DELETE',
  });
}

export async function fetchTrainingVideoById(id: string): Promise<TrainingVideo | null> {
  const res = await apiRequest<{ success: boolean; data: TrainingVideo }>(
    API_ENDPOINTS.admin.trainingVideos.byId(id)
  );
  return res.data ?? null;
}
