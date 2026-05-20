import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminModal } from '@/components/screens/admin/modals/AdminModal';
import { AdminFormBody, AdminFormGrid, AdminField } from '@/components/screens/admin/modals/AdminForm';
import { fetchButtons, createButton, updateButton, deleteButton, type Button as ButtonType } from '@/api/cmsAdminApi';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Pointer } from 'lucide-react';

export function ButtonsScreen() {
  const [buttons, setButtons] = useState<ButtonType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<ButtonType>>({
    name: '',
    buttonId: '',
    label: '',
    type: 'action',
    action: '',
    icon: '',
    imageUrl: '',
    sectionCode: '',
    isActive: true,
    order: 0,
  });

  useEffect(() => {
    loadButtons();
  }, []);

  const loadButtons = async () => {
    setLoading(true);
    try {
      const data = await fetchButtons();
      setButtons(data);
    } catch {
      toast.error('Failed to load buttons');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      buttonId: '',
      label: '',
      type: 'action',
      action: '',
      icon: '',
      imageUrl: '',
      sectionCode: '',
      isActive: true,
      order: 0,
    });
    setDialogOpen(true);
  };

  const openEdit = (b: ButtonType) => {
    setEditingId(b._id);
    setFormData({
      name: b.name || '',
      buttonId: b.buttonId || '',
      label: b.label || '',
      type: b.type || 'action',
      action: b.action || '',
      icon: b.icon || '',
      imageUrl: b.imageUrl || '',
      sectionCode: b.sectionCode || '',
      isActive: b.isActive ?? true,
      order: b.order ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name?.trim(),
        buttonId: formData.buttonId?.trim() || undefined,
        label: formData.label?.trim() || undefined,
        type: formData.type || 'action',
        action: formData.action?.trim() || undefined,
        icon: formData.icon?.trim() || undefined,
        imageUrl: formData.imageUrl?.trim() || undefined,
        sectionCode: formData.sectionCode?.trim() || undefined,
        isActive: formData.isActive ?? true,
        order: formData.order ?? 0,
      };

      if (editingId) {
        const updated = await updateButton(editingId, payload);
        setButtons((prev) => prev.map((b) => (b._id === editingId ? updated : b)));
        toast.success('Button updated');
      } else {
        const created = await createButton(payload);
        setButtons((prev) => [created, ...prev]);
        toast.success('Button created');
      }
      setDialogOpen(false);
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteButton(id);
      setButtons((prev) => prev.filter((b) => b._id !== id));
      toast.success('Button deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pointer className="h-5 w-5 text-[#71717a]" />
          <h2 className="text-lg font-semibold text-[#18181b]">Buttons</h2>
        </div>
        <Button onClick={openCreate} className="bg-[#18181b] text-white hover:bg-[#27272a]">
          <Plus size={14} className="mr-2" /> Add Button
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#71717a]" />
        </div>
      ) : (
        <div className="rounded-lg border border-[#e4e4e7] bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Button ID</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buttons.map((b) => (
                <TableRow key={b._id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-sm text-[#71717a]">{b.buttonId ?? '—'}</TableCell>
                  <TableCell className="text-sm text-[#71717a]">{b.label ?? '—'}</TableCell>
                  <TableCell className="text-sm text-[#71717a]">{b.type ?? 'action'}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        b.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {b.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(b._id, b.name)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {buttons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[#71717a] py-12">
                    No buttons found. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AdminModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingId ? 'Edit Button' : 'Add Button'}
        icon={<Pointer className="h-5 w-5" />}
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </>
        }
      >
        <AdminFormBody>
          <AdminFormGrid>
            <AdminField label="Name *" htmlFor="name">
              <Input
                id="name"
                value={formData.name ?? ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Button name"
              />
            </AdminField>
            <AdminField label="Button ID" htmlFor="buttonId">
              <Input
                id="buttonId"
                value={formData.buttonId ?? ''}
                onChange={(e) => setFormData({ ...formData, buttonId: e.target.value })}
                placeholder="e.g. btn_001"
              />
            </AdminField>
            <AdminField label="Label" htmlFor="label">
              <Input
                id="label"
                value={formData.label ?? ''}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Display label"
              />
            </AdminField>
            <AdminField label="Type" htmlFor="type">
              <select
                id="type"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={formData.type || 'action'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="nav">Navigation</option>
                <option value="action">Action</option>
                <option value="link">Link</option>
                <option value="section">Section</option>
                <option value="other">Other</option>
              </select>
            </AdminField>
            <AdminField label="Action" htmlFor="action">
              <Input
                id="action"
                value={formData.action ?? ''}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                placeholder="Action to perform"
              />
            </AdminField>
            <AdminField label="Icon" htmlFor="icon">
              <Input
                id="icon"
                value={formData.icon ?? ''}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="Icon name/code"
              />
            </AdminField>
            <AdminField label="Image URL" htmlFor="imageUrl">
              <Input
                id="imageUrl"
                value={formData.imageUrl ?? ''}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </AdminField>
            <AdminField label="Section Code" htmlFor="sectionCode">
              <Input
                id="sectionCode"
                value={formData.sectionCode ?? ''}
                onChange={(e) => setFormData({ ...formData, sectionCode: e.target.value })}
                placeholder="e.g. section_code"
              />
            </AdminField>
            <AdminField label="Order" htmlFor="order">
              <Input
                id="order"
                type="number"
                value={formData.order ?? 0}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })}
              />
            </AdminField>
          </AdminFormGrid>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive ?? true}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-[#e4e4e7]"
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </AdminFormBody>
      </AdminModal>
    </div>
  );
}
