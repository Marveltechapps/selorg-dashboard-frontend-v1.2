import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type RiderPermission =
  | 'dispatch.assign'
  | 'dispatch.auto_assign'
  | 'shift.manage'
  | 'hr.approve'
  | 'cash.view'
  | 'analytics.export'
  | 'audit.view';

const ROLE_DEFAULTS: Record<string, RiderPermission[]> = {
  super_admin: [
    'dispatch.assign',
    'dispatch.auto_assign',
    'shift.manage',
    'hr.approve',
    'cash.view',
    'analytics.export',
    'audit.view',
  ],
  admin: [
    'dispatch.assign',
    'dispatch.auto_assign',
    'shift.manage',
    'hr.approve',
    'cash.view',
    'analytics.export',
    'audit.view',
  ],
  rider: [
    'dispatch.assign',
    'dispatch.auto_assign',
    'shift.manage',
    'hr.approve',
    'cash.view',
    'analytics.export',
    'audit.view',
  ],
};

export function useRiderPermissions() {
  const { user } = useAuth();

  return useMemo(() => {
    const role = (user?.role || 'rider').toLowerCase();
    const fromRole = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.rider;
    const fromJwt = (user?.permissions || []) as string[];

    const granted = new Set<RiderPermission>(fromRole);
    for (const p of fromJwt) {
      if (p.startsWith('rider.') || p.includes('dispatch') || p.includes('shift')) {
        granted.add(p as RiderPermission);
      }
    }

    const can = (permission: RiderPermission) => granted.has(permission);

    return { can, role };
  }, [user?.role, user?.permissions]);
}
