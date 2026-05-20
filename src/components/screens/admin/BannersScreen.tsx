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
import { fetchBanners, createBanner, updateBanner, deleteBanner, type Banner } from '@/api/cmsAdminApi';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Image } from 'lucide-react';

export function BannersScreen() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Banner>>({
    name: '',
    bannerId: '',
    imageUrl: '',
    bannerType: '',
    sectionCode: '',
    isActive: true,
    order: 0,
  });

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const data = await fetchBanners();
      setBanners(data);
    } catch {
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      bannerId: '',
      imageUrl: '',
      bannerType: '',
      sectionCode: '',
      isActive: true,
      order: 0,
    });
    setDialogOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditingId(b._id);
    setFormData({
      name: b.name || '',
      bannerId: b.bannerId || '',
      imageUrl: b.imageUrl || '',
      bannerType: b.bannerType || '',
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
        bannerId: formData.bannerId?.trim() || undefined,
        imageUrl: formData.imageUrl?.trim() || undefined,
        bannerType: formData.bannerType?.trim() || undefined,
        sectionCode: formData.sectionCode?.trim() || undefined,
        isActive: formData.isActive ?? true,
        order: formData.order ?? 0,
      };

      if (editingId) {
        const updated = await updateBanner(editingId, payload);
        setBanners((prev) => prev.map((b) => (b._id === editingId ? updated : b)));
        toast.success('Banner updated');
      } else {
        const created = await createBanner(payload);
        setBanners((prev) => [created, ...prev]);
        toast.success('Banner created');
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
      await deleteBanner(id);
      setBanners((prev) => prev.filter((b) => b._id !== id));
      toast.success('Banner deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="h-5 w-5 text-[#71717a]" />
          <h2 className="text-lg font-semibold text-[#18181b]">Banner Details</h2>
        </div>
        <Button onClick={openCreate} className="bg-[#18181b] text-white hover:bg-[#27272a]">
          <Plus size={14} className="mr-2" /> Add Banner
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
                <TableHead>Banner ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Section Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((b) => (
                <TableRow key={b._id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-sm text-[#71717a]">{b.bannerId ?? '—'}</TableCell>
                  <TableCell className="text-sm text-[#71717a]">{b.bannerType ?? '—'}</TableCell>
                  <TableCell className="text-sm text-[#71717a]">{b.sectionCode ?? '—'}</TableCell>
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
              {banners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[#71717a] py-12">
                    No banners found. Create one to get started.
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
        title={editingId ? 'Edit Banner' : 'Add Banner'}
        icon={<Image className="h-5 w-5" />}
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
                placeholder="Banner name"
              />
            </AdminField>
            <AdminField label="Banner ID" htmlFor="bannerId">
              <Input
                id="bannerId"
                value={formData.bannerId ?? ''}
                onChange={(e) => setFormData({ ...formData, bannerId: e.target.value })}
                placeholder="e.g. banner_001"
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
            <AdminField label="Banner Type" htmlFor="bannerType">
              <Input
                id="bannerType"
                value={formData.bannerType ?? ''}
                onChange={(e) => setFormData({ ...formData, bannerType: e.target.value })}
                placeholder="e.g. hero, mid"
              />
            </AdminField>
            <AdminField label="Section Code" htmlFor="sectionCode">
              <Input
                id="sectionCode"
                value={formData.sectionCode ?? ''}
                onChange={(e) => setFormData({ ...formData, sectionCode: e.target.value })}
                placeholder="e.g. hero_section"
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
