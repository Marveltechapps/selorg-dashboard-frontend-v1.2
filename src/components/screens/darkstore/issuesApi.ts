import { apiRequest } from '@/api/apiClient';
import { API_ENDPOINTS } from '@/config/api';

export interface IssueFilters {
  site?: string;
  severity?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface IssueListItem {
  id: string;
  pickerId: string;
  pickerName: string;
  issueType: string;
  orderId?: string;
  description: string;
  imageUrl?: string;
  severity?: string;
  status: string;
  reportedAt: string;
  assignedTo?: string;
  closedAt?: string;
  storeId?: string;
}

export interface IssueDetails extends IssueListItem {
  pickerPhone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OpsUser {
  id: string;
  name: string;
  email?: string;
}

function buildParams(filters: IssueFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
  };
  if (filters.site) params.site = filters.site;
  if (filters.severity) params.severity = filters.severity;
  if (filters.status) params.status = filters.status;
  return params;
}

export const fetchIssues = async (
  filters: IssueFilters
): Promise<{ data: IssueListItem[]; total: number; page: number; limit: number }> => {
  const params = buildParams(filters);
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();
  const url = `${API_ENDPOINTS.darkstoreIssues.list}${query ? `?${query}` : ''}`;
  const res = await apiRequest<{
    success: boolean;
    data: IssueListItem[];
    total: number;
    page: number;
    limit: number;
  }>(url);
  return {
    data: res.data,
    total: res.total,
    page: res.page,
    limit: res.limit,
  };
};

export const fetchIssueDetails = async (id: string): Promise<IssueDetails> => {
  const res = await apiRequest<{ success: boolean; data: IssueDetails }>(
    API_ENDPOINTS.darkstoreIssues.byId(id)
  );
  return res.data;
};

export const fetchOpsUsers = async (): Promise<OpsUser[]> => {
  const res = await apiRequest<{ success: boolean; data: OpsUser[] }>(
    API_ENDPOINTS.darkstoreIssues.opsUsers
  );
  return res.data;
};

export const updateIssue = async (
  id: string,
  action: 'assign' | 'close',
  assignedTo?: string
): Promise<IssueDetails> => {
  const body: { action: string; assignedTo?: string } = { action };
  if (assignedTo) body.assignedTo = assignedTo;
  const res = await apiRequest<{ success: boolean; data: IssueDetails }>(
    API_ENDPOINTS.darkstoreIssues.byId(id),
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  );
  return res.data;
};
