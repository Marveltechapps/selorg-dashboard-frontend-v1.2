import { apiRequest } from '@/api/apiClient';
import { API_ENDPOINTS } from '@/config/api';

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
  createdAt?: string;
  updatedAt?: string;
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

export async function fetchTrainingVideos(): Promise<TrainingVideo[]> {
  const res = await apiRequest<{ success: boolean; data: TrainingVideo[] }>(
    API_ENDPOINTS.admin.trainingVideos.list
  );
  return res.data ?? [];
}

export async function fetchTrainingVideoById(id: string): Promise<TrainingVideo | null> {
  const res = await apiRequest<{ success: boolean; data: TrainingVideo }>(
    API_ENDPOINTS.admin.trainingVideos.byId(id)
  );
  return res.data ?? null;
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

export interface PickerTrainingOverviewFilters {
  videoId?: string;
  status?: 'completed' | 'in_progress' | 'not_started';
  page?: number;
  limit?: number;
}

export interface PickerTrainingOverviewRow {
  pickerId: string;
  pickerName: string;
  phone: string;
  videoId: string;
  videoTitle: string;
  watchPercent: number;
  completed: boolean;
  completedAt: string | null;
  lastSeen: string | null;
  status: 'completed' | 'in_progress' | 'not_started';
}

export async function fetchPickerTrainingOverview(filters: PickerTrainingOverviewFilters) {
  const params = new URLSearchParams(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, String(value)])
  );
  const query = params.toString();
  return apiRequest<{
    success: boolean;
    data: PickerTrainingOverviewRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(`${API_ENDPOINTS.admin.trainingVideos.pickerProgress}${query ? `?${query}` : ''}`);
}
