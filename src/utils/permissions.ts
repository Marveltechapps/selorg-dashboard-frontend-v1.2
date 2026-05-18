/**
 * Mirrors backend `config/permissions.js` matching rules for UI gating.
 */

export function permissionMatches(granted: string, required: string): boolean {
  if (!granted || !required) return false;
  if (granted === '*') return true;
  if (granted === required) return true;
  if (granted.endsWith('.*')) {
    const prefix = granted.slice(0, -1);
    return required.startsWith(prefix);
  }
  return false;
}

/** Legacy JWT seed names → canonical (subset used by dashboard nav). */
const LEGACY_ALIASES: Record<string, string[]> = {
  view_users: ['admin.users.read'],
  manage_roles: ['admin.roles.read', 'admin.roles.write'],
  view_access_logs: ['compliance.audit.read'],
};

function legacyMatches(granted: string, required: string): boolean {
  const aliases = LEGACY_ALIASES[granted];
  if (!aliases) return false;
  return aliases.some((r) => r === required);
}

export function userHasPermission(
  userPermissions: string[] | undefined,
  required: string
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  return userPermissions.some(
    (p) => permissionMatches(p, required) || legacyMatches(p, required)
  );
}

/** When JWT omits permissions, infer super access for admin roles only (matches backend defaults intent). */
export function resolveEffectivePermissions(
  permissions: string[] | undefined,
  role: string | undefined
): string[] {
  if (permissions && permissions.length > 0) return permissions;
  const r = (role || '').toLowerCase();
  if (r === 'super_admin' || r === 'superadmin' || r === 'admin') {
    return ['*'];
  }
  return [];
}
