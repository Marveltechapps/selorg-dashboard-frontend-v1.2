import { API_CONFIG, API_ENDPOINTS } from '../../config/api';
import { getAuthToken } from '../../contexts/AuthContext';

/**
 * Vendor Management API
 */
export const vendorManagementApi = {
  /**
   * Get all vendors (alias for getVendors)
   */
  async listVendors(filters?: any) {
    return this.getVendors(filters);
  },

  /**
   * Get all vendors
   * @param filters - optional { page, pageSize, status, category, search }
   */
  async getVendors(filters?: { page?: number; pageSize?: number; status?: string; category?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.page != null) params.append('page', String(filters.page));
      if (filters.pageSize != null) params.append('pageSize', String(filters.pageSize));
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
    }
    const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.vendors.list}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
    });

    if (!response.ok) {
      const error: any = new Error('Failed to fetch vendors');
      try {
        const errData = await response.json();
        error.message = errData.message || errData.error || error.message;
      } catch {
        error.message = `Failed to fetch vendors (${response.status})`;
      }
      throw error;
    }

    return response.json();
  },

  /**
   * Execute vendor action (approve, reject, suspend, activate, etc.)
   */
  async vendorAction(vendorId: string, action: string, payload?: Record<string, unknown>) {
    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.vendors.action(vendorId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
      body: JSON.stringify({ action, ...payload }),
    });

    if (!response.ok) {
      const error: any = new Error(`Failed to execute vendor action: ${action}`);
      try {
        const errData = await response.json();
        error.message = errData.message || errData.error || error.message;
      } catch {
        error.message = `Failed to execute vendor action (${response.status})`;
      }
      throw error;
    }

    return response.json();
  },

  /**
   * Get vendor by ID
   */
  async getVendorById(id: string) {
    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.vendors.byId(id)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch vendor');
    }

    return response.json();
  },

  /**
   * Create vendor
   */
  async createVendor(vendorData: any) {
    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.vendors.create}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
      body: JSON.stringify(vendorData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create vendor' }));
      throw new Error(error.message || 'Failed to create vendor');
    }

    return response.json();
  },

  /**
   * Update vendor
   */
  async updateVendor(id: string, vendorData: any) {
    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.vendors.update(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
      body: JSON.stringify(vendorData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update vendor' }));
      throw new Error(error.message || 'Failed to update vendor');
    }

    return response.json();
  },

  /**
   * Delete vendor
   */
  async deleteVendor(id: string) {
    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.vendors.byId(id)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
    });

    if (!response.ok) {
      // Create error object with status for better error handling
      const error: any = new Error(`Failed to delete vendor (${response.status})`);
      error.status = response.status;
      error.response = response;
      
      try {
        const errorData = await response.json();
        error.message = errorData.message || errorData.error || `Failed to delete vendor (${response.status})`;
      } catch {
        error.message = `Failed to delete vendor (${response.status})`;
      }
      
      throw error;
    }

    return response.json().catch(() => ({}));
  },

  /**
   * Get vendor summary (counts, metrics, health)
   */
  async getVendorSummary() {
    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.vendors.summary}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
    });

    if (!response.ok) {
      const error: any = new Error('Failed to fetch vendor summary');
      try {
        const errData = await response.json();
        error.message = errData.message || errData.error || error.message;
      } catch {
        error.message = `Failed to fetch vendor summary (${response.status})`;
      }
      throw error;
    }

    return response.json();
  },

  /**
   * List vendor QC checks
   */
  async listVendorQCChecks(vendorId: string) {
    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.vendors.qcChecks(vendorId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch vendor QC checks');
    }

    return response.json();
  },

  /**
   * List all QC checks
   */
  async listQCChecks(filters?: any) {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.qc.list}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const authToken = getAuthToken();
    if (!authToken) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      let errorMessage = 'Failed to fetch QC checks';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error?.message || errorData.error || `Failed to fetch QC checks (${response.status} ${response.statusText})`;
      } catch (e) {
        if (response.status === 403) {
          errorMessage = 'Access denied. Please check your authentication token or contact support.';
        } else if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else {
          errorMessage = `Failed to fetch QC checks (${response.status} ${response.statusText})`;
        }
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  /**
   * List vendor certificates
   */
  async listVendorCertificates(vendorId: string) {
    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.vendor.certificates.listVendorCertificates(vendorId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch vendor certificates');
    }

    return response.json();
  },

  /**
   * Get audits
   */
  async getAudits(filters?: { vendorId?: string; auditType?: string; result?: string; startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (filters?.vendorId) params.append('vendorId', filters.vendorId);
    if (filters?.auditType) params.append('auditType', filters.auditType);
    if (filters?.result) params.append('result', filters.result);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await fetch(`${API_CONFIG.baseURL}/vendor/qc-compliance/audits?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch audits');
    }

    return response.json();
  },

  /**
   * Get temperature compliance
   */
  async getTemperatureCompliance(filters?: { vendorId?: string; shipmentId?: string; compliant?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.vendorId) params.append('vendorId', filters.vendorId);
    if (filters?.shipmentId) params.append('shipmentId', filters.shipmentId);
    if (filters?.compliant !== undefined) params.append('compliant', String(filters.compliant));

    const response = await fetch(`${API_CONFIG.baseURL}/vendor/qc-compliance/temperature?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch temperature compliance');
    }

    return response.json();
  },

  /**
   * Get vendor ratings
   */
  async getVendorRatings(vendorId?: string) {
    const params = new URLSearchParams();
    if (vendorId) params.append('vendorId', vendorId);

    const response = await fetch(`${API_CONFIG.baseURL}/vendor/qc-compliance/ratings?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch vendor ratings');
    }

    return response.json();
  },

  /**
   * Update QC check (approve/reject/appeal)
   */
  async updateQCCheck(qcId: string, payload: { status?: string; result?: string; notes?: string }) {
    console.log('API: updateQCCheck called with:', { qcId, payload });
    const response = await fetch(`${API_CONFIG.baseURL}/vendor/qc/${qcId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to update QC check';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorData.msg || JSON.stringify(errorData) || errorMessage;
      } catch (e) {
        errorMessage = `Failed to update QC check (${response.status} ${response.statusText})`;
      }
      console.error('API: updateQCCheck failed:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('API: updateQCCheck success:', result);
    // Handle both { success: true, data: {...} } and direct object responses
    return result.data || result;
  },

  /**
   * Schedule audit
   */
  async scheduleAudit(auditData: { vendorId: string; vendor?: string; auditType?: string; date?: Date }) {
    if (!auditData.vendorId) {
      throw new Error('Vendor ID is required to schedule audit');
    }

    const response = await fetch(`${API_CONFIG.baseURL}/vendor/qc-compliance/audits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
      body: JSON.stringify({
        vendorId: auditData.vendorId,
        auditType: auditData.auditType || 'Routine',
        date: auditData.date ? (auditData.date instanceof Date ? auditData.date.toISOString() : auditData.date) : new Date().toISOString(),
        result: 'Pending',
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to schedule audit';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorData.msg || JSON.stringify(errorData) || errorMessage;
      } catch (e) {
        errorMessage = `Failed to schedule audit (${response.status} ${response.statusText})`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  /**
   * Update certificate (verify/renew)
   */
  async updateCertificate(certId: string, payload: { status?: string; expiresAt?: Date }) {
    const response = await fetch(`${API_CONFIG.baseURL}/vendor/certificates/${certId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
      body: JSON.stringify({
        ...payload,
        expiresAt: payload.expiresAt ? (payload.expiresAt instanceof Date ? payload.expiresAt.toISOString() : payload.expiresAt) : undefined,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to update certificate';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorData.msg || JSON.stringify(errorData) || errorMessage;
      } catch (e) {
        errorMessage = `Failed to update certificate (${response.status} ${response.statusText})`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  /**
   * Update temperature compliance (approve anyway/reject)
   */
  async updateTemperatureCompliance(tempId: string, payload: { compliant?: boolean; notes?: string }) {
    const response = await fetch(`${API_CONFIG.baseURL}/vendor/qc-compliance/temperature/${tempId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken() || ''}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to update temperature compliance';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorData.msg || JSON.stringify(errorData) || errorMessage;
      } catch (e) {
        errorMessage = `Failed to update temperature compliance (${response.status} ${response.statusText})`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },
};

// Named exports for direct imports
export const listVendors = vendorManagementApi.listVendors.bind(vendorManagementApi);
export const getVendors = vendorManagementApi.getVendors.bind(vendorManagementApi);
export const getVendorById = vendorManagementApi.getVendorById.bind(vendorManagementApi);
export const vendorAction = vendorManagementApi.vendorAction.bind(vendorManagementApi);
export const createVendor = vendorManagementApi.createVendor.bind(vendorManagementApi);
export const updateVendor = vendorManagementApi.updateVendor.bind(vendorManagementApi);
export const deleteVendor = vendorManagementApi.deleteVendor.bind(vendorManagementApi);
export const getVendorSummary = vendorManagementApi.getVendorSummary.bind(vendorManagementApi);
export const listVendorQCChecks = vendorManagementApi.listVendorQCChecks.bind(vendorManagementApi);
export const listQCChecks = vendorManagementApi.listQCChecks.bind(vendorManagementApi);
export const listVendorCertificates = vendorManagementApi.listVendorCertificates.bind(vendorManagementApi);
export const getAudits = vendorManagementApi.getAudits.bind(vendorManagementApi);
export const getTemperatureCompliance = vendorManagementApi.getTemperatureCompliance.bind(vendorManagementApi);
export const getVendorRatings = vendorManagementApi.getVendorRatings.bind(vendorManagementApi);
export const updateQCCheck = vendorManagementApi.updateQCCheck.bind(vendorManagementApi);
export const scheduleAudit = vendorManagementApi.scheduleAudit.bind(vendorManagementApi);
export const updateCertificate = vendorManagementApi.updateCertificate.bind(vendorManagementApi);
export const updateTemperatureCompliance = vendorManagementApi.updateTemperatureCompliance.bind(vendorManagementApi);

export default vendorManagementApi;
