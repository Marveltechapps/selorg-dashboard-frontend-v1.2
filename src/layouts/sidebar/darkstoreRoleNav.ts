import type { OpsRole } from '@/components/darkstore/darkstorePreferences';

/** Nav item ids visible per ops role. Empty set = all items. */
const ROLE_NAV_IDS: Record<OpsRole, Set<string> | null> = {
  manager: null,
  floor_lead: new Set([
    'my-shift',
    'overview',
    'liveorders',
    'exception-inbox',
    'slamonitor',
    'fulfillment',
    'pickpackops',
    'packing-station',
    'livepickingmonitor',
    'livepickerboard',
    'pickerperformance',
    'missingitems',
    'issues',
    'outbound',
    'hsd',
    'reports',
  ]),
  inventory: new Set([
    'my-shift',
    'overview',
    'exception-inbox',
    'inventory',
    'inbound',
    'outbound',
    'replenishment',
    'missingitems',
    'qc',
    'reports',
    'store-settings',
  ]),
  support: new Set([
    'my-shift',
    'overview',
    'liveorders',
    'exception-inbox',
    'slamonitor',
    'issues',
    'missingitems',
    'reports',
    'store-settings',
  ]),
};

/** Regional command and ops analytics only for managers / multi-store users */
const MANAGER_ONLY_IDS = new Set(['regional', 'ops-analytics']);

export function isNavItemVisible(
  itemId: string,
  opsRole: OpsRole,
  options?: { isMultiStore?: boolean; isManagerRole?: boolean }
): boolean {
  const isManager = options?.isManagerRole ?? opsRole === 'manager';
  if (MANAGER_ONLY_IDS.has(itemId) && !isManager && !options?.isMultiStore) {
    return false;
  }
  const allowed = ROLE_NAV_IDS[opsRole];
  if (!allowed) return true;
  return allowed.has(itemId);
}
