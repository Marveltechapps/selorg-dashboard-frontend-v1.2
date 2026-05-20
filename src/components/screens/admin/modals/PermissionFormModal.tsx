import React, { useEffect, useState } from 'react';
import { AdminModal } from './AdminModal';
import { AdminFormBody, AdminFormGrid, AdminField } from './AdminForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  CreatePermissionPayload,
  createPermission,
  updatePermission,
  fetchPermissionById,
  fetchPermissions,
} from '../userManagementApi';

interface PermissionFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  editingPermissionId?: string | null;
  defaultModule?: string;
}

const ACTION_OPTIONS = ['view', 'create', 'update', 'delete', 'manage'] as const;
const CATEGORY_OPTIONS = ['read', 'write', 'delete', 'admin'] as const;
const RISK_OPTIONS = ['low', 'medium', 'high'] as const;

const emptyForm: CreatePermissionPayload = {
  name: '',
  displayName: '',
  module: '',
  description: '',
  action: 'view',
  category: 'read',
  riskLevel: 'low',
};

export function PermissionFormModal({
  open,
  onClose,
  onSaved,
  editingPermissionId,
  defaultModule,
}: PermissionFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingModules, setExistingModules] = useState<string[]>([]);
  const [form, setForm] = useState<CreatePermissionPayload>({ ...emptyForm, module: defaultModule ?? '' });

  const isEdit = Boolean(editingPermissionId);

  useEffect(() => {
    if (!open) return;
    setForm({ ...emptyForm, module: defaultModule ?? '' });
    void fetchPermissions().then((list) => {
      setExistingModules([...new Set(list.map((p) => p.module))].sort());
    });
    if (editingPermissionId) {
      void loadPermission(editingPermissionId);
    }
  }, [open, editingPermissionId, defaultModule]);

  const loadPermission = async (id: string) => {
    setLoading(true);
    try {
      const perm = await fetchPermissionById(id);
      if (!perm) {
        toast.error('Permission not found');
        onClose();
        return;
      }
      setForm({
        name: perm.name,
        displayName: perm.displayName,
        module: perm.module,
        description: perm.description ?? '',
        action: perm.action ?? 'view',
        category: perm.category ?? 'read',
        riskLevel: perm.riskLevel ?? 'low',
        dependsOn: perm.dependsOn ?? [],
      });
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load permission');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.displayName.trim() || !form.module.trim()) {
      toast.error('Display name and module are required');
      return;
    }
    if (!isEdit && !form.name.trim()) {
      toast.error('Permission name is required');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && editingPermissionId) {
        await updatePermission(editingPermissionId, {
          displayName: form.displayName.trim(),
          module: form.module.trim(),
          description: form.description?.trim() ?? '',
          action: form.action,
          category: form.category,
          riskLevel: form.riskLevel,
          dependsOn: form.dependsOn,
        });
        toast.success('Permission updated');
      } else {
        await createPermission({
          name: form.name.trim().toLowerCase(),
          displayName: form.displayName.trim(),
          module: form.module.trim(),
          description: form.description?.trim() ?? '',
          action: form.action,
          category: form.category,
          riskLevel: form.riskLevel,
          dependsOn: form.dependsOn,
        });
        toast.success('Permission created');
      }
      onSaved?.();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save permission');
    } finally {
      setSaving(false);
    }
  };

  const dependsOnValue = (form.dependsOn ?? []).join(', ');

  return (
    <AdminModal
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={isEdit ? 'Edit Permission' : 'Create Permission'}
      subtitle={isEdit ? 'Name cannot be changed after creation' : 'Define a new permission for the matrix'}
      icon={<Lock className="h-5 w-5" />}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="permission-form" disabled={saving || loading}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create permission'}
          </Button>
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-[#6B7280] py-8 text-center">Loading permission…</p>
      ) : (
        <form id="permission-form" onSubmit={handleSubmit}>
          <AdminFormBody>
            {!isEdit && (
              <AdminField label="Permission name" required hint="e.g. orders:create (lowercase, unique)">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="module:action"
                  autoComplete="off"
                />
              </AdminField>
            )}
            {isEdit && (
              <AdminField label="Permission name">
                <Input value={form.name} disabled className="bg-[#F9FAFB]" />
              </AdminField>
            )}
            <AdminField label="Display name" required>
              <Input
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Create Orders"
              />
            </AdminField>
            <AdminField label="Module" required>
              <Input
                value={form.module}
                onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}
                placeholder="orders"
              />
            </AdminField>
            <AdminFormGrid>
              <AdminField label="Action">
                <Select
                  value={form.action ?? 'view'}
                  onValueChange={(v) => setForm((f) => ({ ...f, action: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </AdminField>
              <AdminField label="Category">
                <Select
                  value={form.category ?? 'read'}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v as CreatePermissionPayload['category'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </AdminField>
            </AdminFormGrid>
            <AdminField label="Risk level">
              <Select
                value={form.riskLevel ?? 'low'}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, riskLevel: v as CreatePermissionPayload['riskLevel'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AdminField>
            <AdminField label="Depends on" hint="Comma-separated permission names (e.g. orders:view)">
              <Input
                value={dependsOnValue}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    dependsOn: e.target.value
                      .split(',')
                      .map((s) => s.trim().toLowerCase())
                      .filter(Boolean),
                  }))
                }
                placeholder="orders:view"
              />
            </AdminField>
            <AdminField label="Description">
              <Textarea
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="What this permission allows"
              />
            </AdminField>
            {existingModules.length > 0 && !isEdit && (
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <Label className="text-xs text-[#6B7280]">Existing modules</Label>
                <p className="text-xs mt-1 text-[#374151]">{existingModules.join(', ')}</p>
              </div>
            )}
          </AdminFormBody>
        </form>
      )}
    </AdminModal>
  );
}
