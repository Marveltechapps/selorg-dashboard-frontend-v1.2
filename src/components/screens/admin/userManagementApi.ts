// --- Type Definitions ---

export type UserStatus = "active" | "inactive" | "suspended";
export type RoleType = "system" | "custom";
export type ActionType = "login" | "update_user" | "assign_role" | "update_permissions" | "failed_login" | "suspend_user";
export type LogStatus = "success" | "failed";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  department: string;
  roleId: string;
  roleName?: string;
  accessLevel: string;
  status: UserStatus;
  lastLogin: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  reportingManagerId?: string;
  location?: string[];
  assignedStores?: string[];
  primaryStoreId?: string;
  startDate: string;
  notes?: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  roleType: RoleType;
  userCount: number;
  permissions: string[];
  accessScope: "global" | "zone" | "store";
  createdAt: string;
}

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  module: string;
  description: string;
}

export interface AccessLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: ActionType;
  details: string;
  status: LogStatus;
  ipAddress?: string;
  browser?: string;
}

export interface LoginSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  device: string;
  deviceType: "desktop" | "mobile" | "laptop";
  ipAddress: string;
  location: string;
  lastActivity: string;
  status: "active" | "inactive";
}

export interface CreateUserPayload {
  email: string;
  password?: string;
  name: string;
  department: string;
  roleId: string;
  reportingManagerId?: string;
  location?: string[];
  assignedStores?: string[];
  primaryStoreId?: string;
  twoFactorEnabled: boolean;
  sendInvite: boolean;
  startDate: string;
  notes?: string;
}

export interface UpdateUserPayload {
  name?: string;
  department?: string;
  roleId?: string;
  status?: UserStatus;
  location?: string[];
  assignedStores?: string[];
  primaryStoreId?: string;
  notes?: string;
}

export interface CreateRolePayload {
  name: string;
  description: string;
  roleType: RoleType;
  permissions: string[];
  accessScope: "global" | "zone" | "store";
}

import { apiRequest } from '@/api/apiClient';

export interface StoreOption {
  code: string;
  name: string;
  type: 'store' | 'dark_store' | 'warehouse';
  status: string;
}

// --- API Functions (real backend only - no mock fallbacks) ---

function deriveAvatar(name: string): string {
  return (name || 'U').split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || 'U';
}

export const fetchUsers = async (filters?: {
  status?: UserStatus;
  roleId?: string;
  department?: string;
  search?: string;
}): Promise<User[]> => {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.roleId) queryParams.append('roleId', filters.roleId);
  if (filters?.department) queryParams.append('department', filters.department);
  if (filters?.search) queryParams.append('search', filters.search);

  const queryString = queryParams.toString();
  const endpoint = `/admin/users${queryString ? `?${queryString}` : ''}`;

  const response = await apiRequest<{ success: boolean; data: User[] }>(endpoint);
  const data = response?.data ?? [];
  return data.map(u => ({ ...u, avatar: u.avatar ?? deriveAvatar(u.name) }));
};

export const fetchUserById = async (id: string): Promise<User | null> => {
  try {
    const response = await apiRequest<{ success: boolean; data: User }>(`/admin/users/${id}`);
    return response.data;
  } catch (error) {
    return null;
  }
};

export const createUser = async (payload: CreateUserPayload): Promise<User> => {
  const userPayload = {
    ...payload,
    password: payload.password || `TempPass${Math.random().toString(36).slice(-8)}!`,
  };

  const response = await apiRequest<{ success: boolean; data: User }>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(userPayload),
    headers: { 'Content-Type': 'application/json' },
  });

  const user = response.data;
  if (!user) throw new Error('Invalid response from create user API');

  return { ...user, avatar: user.avatar ?? deriveAvatar(user.name) };
};

export const updateUser = async (id: string, payload: UpdateUserPayload): Promise<User> => {
  const response = await apiRequest<{ success: boolean; data: User }>(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return response.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await apiRequest<{ success: boolean; message: string }>(`/admin/users/${id}`, {
    method: 'DELETE',
  });
};

export const fetchAllStores = async (): Promise<StoreOption[]> => {
  const response = await apiRequest<{ success: boolean; data: any[] }>('/admin/stores?limit=200');
  const data = response?.data ?? [];
  return data.map((s: any) => ({
    code: s.code ?? '',
    name: s.name ?? '',
    type: s.type ?? 'store',
    status: s.status ?? 'active',
  }));
};

export const fetchRoles = async (): Promise<Role[]> => {
  const response = await apiRequest<{ success: boolean; data: Role[] }>('/admin/roles');
  return response?.data && Array.isArray(response.data) ? response.data : [];
};

export const fetchRoleById = async (id: string): Promise<Role | null> => {
  try {
    const response = await apiRequest<{ success: boolean; data: Role }>(`/admin/roles/${id}`);
    return response.data;
  } catch (error) {
    return null;
  }
};

export const createRole = async (payload: CreateRolePayload): Promise<Role> => {
  const response = await apiRequest<{ success: boolean; data: Role }>('/admin/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.data) throw new Error('Invalid response from create role API');
  return response.data;
};

export const updateRole = async (id: string, payload: Partial<CreateRolePayload>): Promise<Role> => {
  const response = await apiRequest<{ success: boolean; data: Role }>(`/admin/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return response.data;
};

export const deleteRole = async (id: string): Promise<void> => {
  await apiRequest<{ success: boolean; message: string }>(`/admin/roles/${id}`, {
    method: 'DELETE',
  });
};

export const fetchPermissions = async (): Promise<Permission[]> => {
  const response = await apiRequest<{ success: boolean; data: Permission[] }>('/admin/permissions');
  return response?.data && Array.isArray(response.data) ? response.data : [];
};

export const fetchAccessLogs = async (filters?: {
  userId?: string;
  action?: ActionType;
  status?: LogStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<AccessLog[]> => {
  const queryParams = new URLSearchParams();
  if (filters?.userId) queryParams.append('userId', filters.userId);
  if (filters?.action) queryParams.append('action', filters.action);
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.startDate) queryParams.append('startDate', filters.startDate);
  if (filters?.endDate) queryParams.append('endDate', filters.endDate);
  if (filters?.page) queryParams.append('page', String(filters.page));
  if (filters?.limit) queryParams.append('limit', String(filters.limit));
  const qs = queryParams.toString();
  const response = await apiRequest<{ success: boolean; data: AccessLog[] }>(
    `/admin/access-logs${qs ? `?${qs}` : ''}`
  );
  return response.data ?? [];
};

export const fetchLoginSessions = async (userId?: string): Promise<LoginSession[]> => {
  const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const response = await apiRequest<{ success: boolean; data: LoginSession[] }>(`/admin/sessions${qs}`);
  return response.data ?? [];
};

export const revokeSession = async (sessionId: string): Promise<void> => {
  await apiRequest<{ success: boolean; message?: string }>(`/admin/sessions/${sessionId}`, {
    method: 'DELETE',
  });
};

export type BulkUserActionType = 'activate' | 'deactivate' | 'assign_role' | 'update';

export const bulkUserAction = async (
  action: BulkUserActionType,
  userIds: string[],
  options?: { roleId?: string; updates?: Partial<UpdateUserPayload> }
): Promise<{ updated: number; failed: number; errors: { userId: string; error: string }[] }> => {
  const body: Record<string, unknown> = { action, userIds };
  if (action === 'assign_role' && options?.roleId) body.roleId = options.roleId;
  if (action === 'update' && options?.updates) body.updates = options.updates;
  const response = await apiRequest<{
    success: boolean;
    data: { updated: number; failed: number; errors: { userId: string; error: string }[] };
  }>('/admin/users/bulk', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response.data;
};

/** @deprecated Use bulkUserAction instead. Kept for backward compatibility. */
export const bulkUpdateUsers = async (userIds: string[], updates: Partial<UpdateUserPayload>): Promise<void> => {
  await bulkUserAction('update', userIds, { updates });
};

/** @deprecated Use bulkUserAction instead. Kept for backward compatibility. */
export const bulkAssignRole = async (userIds: string[], roleId: string): Promise<void> => {
  await bulkUserAction('assign_role', userIds, { roleId });
};
