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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { fetchHomeSections, createHomeSection, updateHomeSection, deleteHomeSection, type HomeSection } from '@/api/cmsAdminApi';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Layout } from 'lucide-react';

export function HomeSectionsScreen() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<HomeSection>>({
    sectionKey: '',
    sectionType: 'products',
    label: '',
    videoUrl: '',
    order: 0,
    isActive: true,
  });

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    setLoading(true);
    try {
      const data = await fetchHomeSections();
      setSections(data);
    } catch {
      toast.error('Failed to load home sections');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      sectionKey: '',
      sectionType: 'products',
      label: '',
      videoUrl: '',
      order: 0,
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (s: HomeSection) => {
    setEditingId(s._id);
    setFormData({
      sectionKey: s.sectionKey || '',
      sectionType: s.sectionType || 'products',
      label: s.label || '',
      videoUrl: s.videoUrl || '',
      order: s.order ?? 0,
      isActive: s.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.sectionKey?.trim()) {
      toast.error('Section Key is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        sectionKey: formData.sectionKey?.trim(),
        sectionType: formData.sectionType || 'products',
        label: formData.label?.trim() || undefined,
        videoUrl: formData.videoUrl?.trim() || undefined,
        order: formData.order ?? 0,
        isActive: formData.isActive ?? true,
      };

      if (editingId) {
        const updated = await updateHomeSection(editingId, payload);
        setSections((prev) => prev.map((s) => (s._id === editingId ? updated : s)));
        toast.success('Section updated');
      } else {
        const created = await createHomeSection(payload);
        setSections((prev) => [created, ...prev]);
        toast.success('Section created');
      }
      setDialogOpen(false);
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, key: string) => {
    if (!confirm(`Delete "${key}"?`)) return;
    try {
      await deleteHomeSection(id);
      setSections((prev) => prev.filter((s) => s._id !== id));
      toast.success('Section deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layout className="h-5 w-5 text-[#71717a]" />
          <h2 className="text-lg font-semibold text-[#18181b]">Home Page Content</h2>
        </div>
        <Button onClick={openCreate} className="bg-[#18181b] text-white hover:bg-[#27272a]">
          <Plus size={14} className="mr-2" /> Add Section
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
                <TableHead>Section Key</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((s) => (
                <TableRow key={s._id}>
                  <TableCell className="font-mono font-medium text-sm">{s.sectionKey}</TableCell>
                  <TableCell className="text-sm text-[#71717a]">{s.label ?? '—'}</TableCell>
                  <TableCell className="text-sm text-[#71717a]">{s.sectionType ?? 'products'}</TableCell>
                  <TableCell className="text-sm text-[#71717a]">{s.order ?? 0}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        s.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s._id, s.sectionKey)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sections.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[#71717a] py-12">
                    No sections found. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Section' : 'Add Section'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="sectionKey">Section Key *</Label>
              <Input
                id="sectionKey"
                value={formData.sectionKey ?? ''}
                onChange={(e) => setFormData({ ...formData, sectionKey: e.target.value })}
                placeholder="e.g. hero_section, deals"
              />
            </div>
            <div>
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={formData.label ?? ''}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Display label"
              />
            </div>
            <div>
              <Label htmlFor="sectionType">Section Type</Label>
              <select
                id="sectionType"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={formData.sectionType ?? 'products'}
                onChange={(e) => setFormData({ ...formData, sectionType: e.target.value })}
              >
                <option value="products">Products</option>
                <option value="banners">Banners</option>
                <option value="categories">Categories</option>
                <option value="video">Video</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input
                id="videoUrl"
                value={formData.videoUrl ?? ''}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="order">Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.order ?? 0}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
