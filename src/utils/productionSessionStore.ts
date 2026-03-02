/**
 * Production dashboard in-memory state store.
 * Keeps state in a module-level Map for the lifetime of the SPA session.
 */
const PREFIX = 'production_';

function getKey(key: string): string {
  return PREFIX + key;
}

const _store = new Map<string, any>();

export function getProductionSession<T>(key: string, fallback: T): T {
  const k = getKey(key);
  return _store.has(k) ? (_store.get(k) as T) : fallback;
}

export function setProductionSession<T>(key: string, value: T): void {
  _store.set(getKey(key), value);
}

export const PRODUCTION_KEYS = {
  overviewLines: 'overview_lines',
  rawMaterials: 'raw_materials',
  rawReceipts: 'raw_receipts',
  rawRequisitions: 'raw_requisitions',
  workOrders: 'work_orders',
  qcLabTests: 'qc_lab_tests',
  qcInspections: 'qc_inspections',
  maintenanceTasks: 'maintenance_tasks',
  maintenanceEquipment: 'maintenance_equipment',
  maintenanceIot: 'maintenance_iot',
  workforceStaff: 'workforce_staff',
  workforceShifts: 'workforce_shifts',
  workforceAttendance: 'workforce_attendance',
  alerts: 'alerts',
  alertHistory: 'alert_history',
  incidents: 'incidents',
  utilitiesSettings: 'utilities_settings',
  auditLogs: 'audit_logs',
  reportsDateRange: 'reports_date_range',
} as const;
