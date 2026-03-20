/**
 * Collections – Product sets for carousels.
 * Manual: pick products from Products Introduction. Rule-based: filter by category, tags, etc.
 */
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  fetchCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  type Collection,
} from '@/api/cmsAdminApi';
import { ProductPicker } from './ProductPicker';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Layers } from 'lucide-react';

export function CollectionsScreen() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'manual' as 'manual' | 'rule-based',
    productIds: [] as string[],
    sortBy: 'manual',
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchCollections();
      setCollections(data);
    } catch {
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      slug: '',
      type: 'manual',
      productIds: [],
      sortBy: 'manual',
    });
    setDialogOpen(true);
  };

  const openEdit = (c: Collection) => {
    setEditingId(c._id);
    setFormData({
      name: c.name ?? '',
      slug: c.slug ?? '',
      type: (c.type as 'manual' | 'rule-based') ?? 'manual',
      productIds: c.productIds ?? [],
      sortBy: c.sortBy ?? 'manual',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
        type: formData.type,
        productIds: formData.productIds,
        sortBy: formData.sortBy,
      };
      if (editingId) {
        await updateCollection(editingId, payload);
        toast.success('Collection updated');
      } else {
        await createCollection(payload);
        toast.success('Collection created');
      }
      setDialogOpen(false);
      load();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteCollection(id);
      toast.success('Collection deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18181b] flex items-center gap-2">
          <Layers className="h-7 w-7" />
          Collections
        </h1>
        <p className="text-sm text-[#71717a] mt-1">
          Product sets for carousels. Pick products from Products Introduction. Used by productCarousel and collectionCarousel blocks.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Collection
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#71717a]" />
        </div>
      ) : (
        <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Products</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((c) => (
                <TableRow key={c._id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-sm">{c.slug}</TableCell>
                  <TableCell>
                    <span className="px-2 py-0.5 rounded text-xs bg-[#f4f4f5]">
                      {c.type}
                    </span>
                  </TableCell>
                  <TableCell>{(c.productIds?.length ?? 0)} products</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c._id, c.name)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {collections.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-[#71717a] py-12">
                    No collections yet. Create collections to use in product carousel blocks.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Collection' : 'Add Collection'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Top Deals"
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g. top-deals (auto from name if empty)"
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as 'manual' | 'rule-based' })
                }
              >
                <option value="manual">Manual (pick products)</option>
                <option value="rule-based">Rule-based (filter by category, etc.)</option>
              </select>
            </div>
            {formData.type === 'manual' && (
              <div>
                <Label>Products (from Products Introduction)</Label>
                <ProductPicker
                  selectedIds={formData.productIds}
                  onChange={(ids) => setFormData({ ...formData, productIds: ids })}
                />
              </div>
            )}
            <div>
              <Label htmlFor="sortBy">Sort By</Label>
              <select
                id="sortBy"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={formData.sortBy}
                onChange={(e) => setFormData({ ...formData, sortBy: e.target.value })}
              >
                <option value="manual">Manual</option>
                <option value="price">Price (low to high)</option>
                <option value="priceDesc">Price (high to low)</option>
                <option value="createdAt">Newest first</option>
                <option value="name">Name</option>
              </select>
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
