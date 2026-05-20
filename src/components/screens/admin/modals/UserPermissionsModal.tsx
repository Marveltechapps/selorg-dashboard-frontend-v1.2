import React, { useMemo } from 'react';
import { AdminModal } from './AdminModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Role, Permission } from '../userManagementApi';
import { Shield, CheckCircle } from 'lucide-react';

interface UserPermissionsModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  roles: Role[];
  permissions: Permission[];
}

export function UserPermissionsModal({
  open,
  onClose,
  user,
  roles,
  permissions,
}: UserPermissionsModalProps) {
  const role = useMemo(
    () => roles.find((r) => r.id === user?.roleId),
    [roles, user?.roleId]
  );

  const rolePermissions = useMemo(() => {
    if (!role) return [];
    return permissions.filter(
      (p) => role.permissions.includes(p.id) || role.permissions.includes(p.name)
    );
  }, [role, permissions]);

  const permissionsByModule = useMemo(() => {
    return rolePermissions.reduce(
      (acc, perm) => {
        if (!acc[perm.module]) acc[perm.module] = [];
        acc[perm.module].push(perm);
        return acc;
      },
      {} as Record<string, Permission[]>
    );
  }, [rolePermissions]);

  return (
    <AdminModal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="User Permissions"
      subtitle={user ? `${user.name} · ${user.roleName || 'No role'}` : undefined}
      icon={<Shield size={20} />}
      maxWidth="max-w-lg"
      footer={
        <div className="flex w-full justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      }
    >
      {!user ? null : (
        <div className="space-y-4 p-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#4F46E5] text-white">{user.roleName || 'Unassigned'}</Badge>
            <Badge variant="outline">{user.accessLevel}</Badge>
            <Badge variant="secondary" className="capitalize">
              {user.status}
            </Badge>
          </div>

          {role ? (
            <p className="text-sm text-[#6B7280]">{role.description}</p>
          ) : (
            <p className="text-sm text-amber-700">No role assigned to this user.</p>
          )}

          {Object.keys(permissionsByModule).length > 0 ? (
            <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module}>
                  <h4 className="mb-2 text-sm font-semibold capitalize text-[#374151]">{module}</h4>
                  <ul className="space-y-1.5 pl-1">
                    {perms.map((perm) => (
                      <li key={perm.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle size={14} className="shrink-0 text-emerald-500" />
                        <span>{perm.displayName}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-[#6B7280]">No permissions configured for this role.</p>
          )}
        </div>
      )}
    </AdminModal>
  );
}
