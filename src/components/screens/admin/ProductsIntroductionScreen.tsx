/**
 * Products Introduction – Single source of truth for products.
 * Full CRUD: category, sub-category, image, name, description, cost, selling price, GST, etc.
 * CMS (Banners, Categories, Collections, product carousels) uses this data.
 */
import React, { useState, useEffect, useCallback } from 'react';
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
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type Product,
} from '@/api/customerAppAdminApi';
import { fetchCategories, type Category } from './catalogApi';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Package } from 'lucide-react';

export function ProductsIntroductionScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    description: '',
    imageUrl: '',
    images: [],
    price: 0,
    originalPrice: undefined,
    costPrice: 0,
    gstRate: 0,
    quantity: '',
    brand: '',
    discount: '',
    stockQuantity: 0,
    lowStockThreshold: 10,
    status: 'active',
    featured: false,
    categoryId: '',
    subcategoryId: '',
    order: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([fetchProducts(), fetchCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Same source and shape as Admin → Catalog (catalogApi maps `_id` → `id`, `parentId`). */
  const topLevelCategories = categories.filter((c) => c.parentId === null);
  const subcategories = formData.categoryId
    ? categories.filter((c) => c.parentId === formData.categoryId)
    : [];

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      sku: '',
      description: '',
      imageUrl: '',
      images: [],
      price: 0,
      originalPrice: undefined,
      costPrice: 0,
      gstRate: 0,
      quantity: '',
      brand: '',
      discount: '',
      stockQuantity: 0,
      lowStockThreshold: 10,
      status: 'active',
      featured: false,
      categoryId: '',
      subcategoryId: '',
      order: 0,
    });
    setDialogOpen(true);
  };

  const resolveId = (val: unknown): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val !== null && '_id' in val) return String((val as { _id: string })._id);
    return '';
  };
  const resolveDesc = (val: unknown): string => {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val !== null) {
      const o = val as { about?: string; raw?: string };
      return o.about || o.raw || '';
    }
    return '';
  };

  const openEdit = (p: Product) => {
    setEditingId(p._id);
    setFormData({
      name: p.name,
      sku: p.sku ?? '',
      description: resolveDesc(p.description),
      imageUrl: p.imageUrl ?? (p.images?.[0] ?? ''),
      images: p.images ?? [],
      price: p.price,
      originalPrice: p.originalPrice,
      costPrice: p.costPrice ?? 0,
      gstRate: p.gstRate ?? 0,
      quantity: p.quantity ?? '',
      brand: p.brand ?? '',
      discount: p.discount ?? '',
      stockQuantity: p.stockQuantity ?? 0,
      lowStockThreshold: p.lowStockThreshold ?? 10,
      status: p.status ?? 'active',
      featured: p.featured ?? false,
      categoryId: resolveId(p.categoryId),
      subcategoryId: resolveId(p.subcategoryId),
      order: p.order ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    if (typeof formData.price !== 'number' || formData.price < 0) {
      toast.error('Valid price is required');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name?.trim(),
        sku: formData.sku?.trim() || undefined,
        description: formData.description?.toString().trim() || undefined,
        imageUrl: formData.imageUrl?.toString().trim() || undefined,
        images: formData.imageUrl ? [formData.imageUrl] : formData.images ?? [],
        price: formData.price,
        costPrice: formData.costPrice,
        originalPrice: formData.originalPrice,
        gstRate: formData.gstRate ?? 0,
        quantity: formData.quantity?.toString().trim() || undefined,
        brand: formData.brand?.toString().trim() || undefined,
        discount: formData.discount?.toString().trim() || undefined,
        stockQuantity: formData.stockQuantity ?? 0,
        lowStockThreshold: formData.lowStockThreshold ?? 10,
        status: formData.status ?? 'active',
        featured: formData.featured ?? false,
        categoryId: formData.categoryId || undefined,
        subcategoryId: formData.subcategoryId || undefined,
        order: formData.order ?? 0,
      };
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
      if (editingId) {
        await updateProduct(editingId, payload as Partial<Product>);
        toast.success('Product updated');
      } else {
        await createProduct(payload as Partial<Product>);
        toast.success('Product created');
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18181b] flex items-center gap-2">
          <Package className="h-7 w-7" />
          Products Introduction
        </h1>
        <p className="text-sm text-[#71717a] mt-1">
          Single source of truth for products. CMS (Banners, Categories, Collections, product carousels) uses this data.
          Category and subcategory options follow the taxonomy you maintain under Content Hub → Categories &amp; Subcategories.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
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
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>GST %</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-[#71717a] font-mono">{p.sku ?? '—'}</TableCell>
                  <TableCell className="text-sm text-[#71717a]">
                    {(() => {
                      const catId = typeof p.categoryId === 'object' && p.categoryId
                        ? (p.categoryId as { _id?: string })._id
                        : p.categoryId;
                      const name = typeof p.categoryId === 'object' && p.categoryId && 'name' in p.categoryId
                        ? (p.categoryId as { name?: string }).name
                        : categories.find((c) => c.id === catId)?.name;
                      return name ?? '—';
                    })()}
                  </TableCell>
                  <TableCell className="text-sm text-[#71717a]">{p.brand ?? '—'}</TableCell>
                  <TableCell>₹{p.price}</TableCell>
                  <TableCell>₹{p.costPrice ?? 0}</TableCell>
                  <TableCell>{p.gstRate ?? 0}%</TableCell>
                  <TableCell>{p.stockQuantity ?? 0}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {p.status ?? 'active'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p._id, p.name)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-[#71717a] py-12">
                    No products yet. Add products here — CMS will use this data.
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
            <DialogTitle>{editingId ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name ?? ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Product name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description ?? ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description"
              />
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="categoryId">Category</Label>
                  <select
                    id="categoryId"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={formData.categoryId ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        categoryId: e.target.value,
                        subcategoryId: '',
                      })
                    }
                  >
                    <option value="">— Select —</option>
                    {topLevelCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="subcategoryId">Sub-category</Label>
                  <select
                    id="subcategoryId"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={formData.subcategoryId ?? ''}
                    onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                    disabled={!formData.categoryId}
                  >
                    <option value="">— Select —</option>
                    {subcategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-[#a1a1aa]">
                Lists match Content Hub → Categories &amp; Subcategories (customer admin taxonomy API).
              </p>
            </div>
            <div>
              <Label htmlFor="imageUrl">Product Image URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl ?? ''}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="price">Selling Price *</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.price ?? 0}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="costPrice">Cost Price</Label>
                <Input
                  id="costPrice"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.costPrice ?? 0}
                  onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="originalPrice">Original Price (MRP)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.originalPrice ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      originalPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gstRate">GST %</Label>
                <Input
                  id="gstRate"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.gstRate ?? 0}
                  onChange={(e) => setFormData({ ...formData, gstRate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity/Unit</Label>
                <Input
                  id="quantity"
                  value={formData.quantity ?? ''}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="e.g. 500 g, 1 kg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku ?? ''}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Stock keeping unit"
                />
              </div>
              <div>
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={formData.brand ?? ''}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stockQuantity">Stock Quantity</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  min={0}
                  value={formData.stockQuantity ?? 0}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  min={0}
                  value={formData.lowStockThreshold ?? 10}
                  onChange={(e) =>
                    setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value, 10) || 10 })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                value={formData.discount ?? ''}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                placeholder="e.g. 20% OFF"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="featured"
                checked={formData.featured ?? false}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="rounded border-[#e4e4e7]"
              />
              <Label htmlFor="featured">Featured</Label>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={formData.status ?? 'active'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'draft' })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
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
