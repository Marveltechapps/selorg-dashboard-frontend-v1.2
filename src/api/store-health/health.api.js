/**
 * Store Health API Service
 * Handles all API calls for Store Health screen
 */

import { get, post, put } from '../inventory-management/apiClient';

const BASE_URL = '/api/v1/darkstore/health';

/**
 * Get Store Health Summary
 */
export async function getHealthSummary(params = {}) {
  return get(`${BASE_URL}/summary`, params);
}

/**
 * Get Checklists
 */
export async function getChecklists(params = {}) {
  return get(`${BASE_URL}/checklists`, params);
}

/**
 * Update Checklist Item
 */
export async function updateChecklistItem(checklistId, itemId, data) {
  return put(`${BASE_URL}/checklists/${checklistId}/items/${itemId}`, data);
}

/**
 * Submit Checklist
 */
export async function submitChecklist(checklistId, data = {}) {
  return post(`${BASE_URL}/checklists/${checklistId}/submit`, data);
}

/**
 * Get Equipment Status
 */
export async function getEquipment(params = {}) {
  return get(`${BASE_URL}/equipment`, params);
}

/**
 * Get Incidents
 */
export async function getIncidents(params = {}) {
  return get(`${BASE_URL}/incidents`, params);
}

/**
 * Report Incident
 */
export async function reportIncident(data) {
  return post(`${BASE_URL}/incidents`, data);
}

/**
 * Resolve Incident
 */
export async function resolveIncident(incidentId, data = {}) {
  return put(`${BASE_URL}/incidents/${incidentId}/resolve`, data);
}

