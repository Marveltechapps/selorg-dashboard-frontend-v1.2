/**
 * Products Introduction – Single source of truth for products.
 * Full CRUD: category, sub-category, image, name, description, cost, selling price, GST, etc.
 * CMS (Banners, Categories, Collections, product carousels) uses this data.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import {
  fetchProductsByQueryPaged,
  createProduct,
  updateProduct,
  deleteProduct,
  type Product,
  type PaginationMeta,
} from '@/api/customerAppAdminApi';
import { fetchCategories, type Category } from './catalogApi';
import { toast } from 'sonner';
import { BulkProductOperationsModal } from './modals/BulkProductOperationsModal';
import { Plus, Pencil, Trash2, Loader2, Package, Search } from 'lucide-react';

const PAGE_SIZE = 20;

export function ProductsIntroductionScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);

  // Table controls
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'draft'>('all');
  const [classificationFilter, setClassificationFilter] = useState<'All' | 'Style' | 'Variant'>('All');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'true' | 'false'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [gstMin, setGstMin] = useState('');
  const [gstMax, setGstMax] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [advancedJson, setAdvancedJson] = useState<string>('{}');
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

  const loadCategories = useCallback(async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats);
    } catch {
      toast.error('Failed to load categories');
    }
  }, []);

  const loadProducts = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) setLoading(true);
    setSelectedIds(new Set());
    try {
      const res = await fetchProductsByQueryPaged({
        search: searchDebounced || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        classification: classificationFilter,
        featured: featuredFilter,
        stock: stockFilter,
        categoryId: categoryFilter || undefined,
        brand: brandFilter || undefined,
        priceMin: priceMin || undefined,
        priceMax: priceMax || undefined,
        gstMin: gstMin || undefined,
        gstMax: gstMax || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setProducts(res.data);
      setPagination(res.meta);
    } catch {
      toast.error('Failed to load products');
      setProducts([]);
      setPagination(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [
    searchDebounced,
    statusFilter,
    classificationFilter,
    featuredFilter,
    stockFilter,
    categoryFilter,
    brandFilter,
    priceMin,
    priceMax,
    gstMin,
    gstMax,
    page,
  ]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(searchQuery), 300);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  // Reset pagination when filters/search change
  useEffect(() => {
    setPage(1);
  }, [
    searchDebounced,
    statusFilter,
    classificationFilter,
    featuredFilter,
    stockFilter,
    categoryFilter,
    brandFilter,
    priceMin,
    priceMax,
    gstMin,
    gstMax,
  ]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  /** Same source and shape as Admin → Catalog (catalogApi maps `_id` → `id`, `parentId`). */
  const topLevelCategories = categories.filter((c) => c.parentId === null);
  const subcategories = formData.categoryId
    ? categories.filter((c) => c.parentId === formData.categoryId)
    : [];

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // For "Category" filter we only expose level-1 and level-2 categories (matches how products are linked).
  const categoryFilterOptions = useMemo(() => {
    return categories
      .filter((c) => {
        if (!c.parentId) return true; // level-1
        const parent = categoriesById.get(c.parentId);
        return Boolean(parent && parent.parentId === null); // level-2
      })
      .map((c) => {
        const parent = c.parentId ? categoriesById.get(c.parentId) : null;
        const label = parent ? `${parent.name} / ${c.name}` : c.name;
        return { value: c.id, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categories, categoriesById]);

  const displayedIds = useMemo(() => products.map((p) => p._id), [products]);
  const allDisplayedSelected = displayedIds.length > 0 && displayedIds.every((id) => selectedIds.has(id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allDisplayedSelected) {
        displayedIds.forEach((id) => next.delete(id));
      } else {
        displayedIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const applyBulkUpdatesLocally = useCallback((ids: string[], updates: Record<string, unknown>) => {
    const idSet = new Set(ids);
    setProducts((prev) =>
      prev.map((p) => {
        if (!idSet.has(p._id)) return p;
        const next: Product = { ...p };

        if (typeof updates.status === 'string') next.status = updates.status as Product['status'];
        if (typeof updates.featured === 'boolean') next.featured = updates.featured;
        if (typeof updates.categoryId === 'string') next.categoryId = updates.categoryId;
        if ('subcategoryId' in updates) {
          const v = updates.subcategoryId;
          next.subcategoryId = (typeof v === 'string' ? v : undefined) as Product['subcategoryId'];
        }
        if (typeof updates.stockQuantity === 'number') next.stockQuantity = updates.stockQuantity;
        if (typeof updates.stockIncrement === 'number') next.stockQuantity = (next.stockQuantity ?? 0) + updates.stockIncrement;
        if (typeof updates.priceIncrement === 'number') next.price = (next.price ?? 0) + updates.priceIncrement;
        if (typeof updates.priceMultiplier === 'number') next.price = (next.price ?? 0) * updates.priceMultiplier;

        return next;
      })
    );
  }, []);

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
    setAdvancedJson('{}');
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
    const extractAdvancedFields = (prod: Product) => ({
      // Mastersheet / enrichment structured fields.
      associatedClientName: prod.associatedClientName,
      styleAttributes: prod.styleAttributes,
      style: prod.style,
      skuSource: prod.skuSource,
      colour: prod.colour,
      material: prod.material,
      upcEan: prod.upcEan,
      taxCategory: prod.taxCategory,

      washAndCare: prod.washAndCare,
      shippingAndReturns: prod.shippingAndReturns,
      lottableValidation: prod.lottableValidation,
      recvValidationCode: prod.recvValidationCode,
      pickingInstructions: prod.pickingInstructions,
      shippingInstructions: prod.shippingInstructions,
      shippingCharges: prod.shippingCharges,
      handlingCharges: prod.handlingCharges,
      isArsApplicable: prod.isArsApplicable,
      followStyle: prod.followStyle,
      arsCalculationMethod: prod.arsCalculationMethod,
      fixedStock: prod.fixedStock,
      modelStock: prod.modelStock,
      imageDescriptions: prod.imageDescriptions,
      isUniqueBarcode: prod.isUniqueBarcode,

      dimensions: prod.dimensions,
      taxBreakup: prod.taxBreakup,
      shelfLife: prod.shelfLife,
      meta: prod.meta,
      udf: prod.udf,

      // Compliance / operational flags.
      qcRequired: prod.qcRequired,
      backOrderAllowed: prod.backOrderAllowed,
      backOrderQty: prod.backOrderQty,
      serialTracking: prod.serialTracking,
      stackable: prod.stackable,
      hazardous: prod.hazardous,
      poisonous: prod.poisonous,
      skuRotation: prod.skuRotation,
      rotateBy: prod.rotateBy,
      thresholdAlertRequired: prod.thresholdAlertRequired,
      thresholdQty: prod.thresholdQty,
    });
    setAdvancedJson(JSON.stringify(extractAdvancedFields(p), null, 2));
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

      let advancedUpdates: Record<string, unknown> = {};
      const trimmed = advancedJson.trim();
      if (trimmed && trimmed !== '{}') {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object') advancedUpdates = parsed as Record<string, unknown>;
        } catch {
          toast.error('Advanced Fields JSON is invalid');
          return;
        }
      }

      const finalPayload: Record<string, unknown> = { ...payload, ...advancedUpdates };
      Object.keys(finalPayload).forEach((k) => finalPayload[k] === undefined && delete finalPayload[k]);
      if (editingId) {
        const updated = await updateProduct(editingId, finalPayload as Partial<Product>);
        setProducts((prev) => prev.map((p) => (p._id === editingId ? { ...p, ...updated } : p)));
        toast.success('Product updated');
      } else {
        const created = await createProduct(finalPayload as Partial<Product>);
        setProducts((prev) => [created, ...prev].slice(0, PAGE_SIZE));
        toast.success('Product created');
      }
      setDialogOpen(false);
      void loadProducts({ silent: true });
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
      setProducts((prev) => prev.filter((p) => p._id !== id));
      toast.success('Product deleted');
      void loadProducts({ silent: true });
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
          Single source of truth for products. CMS uses this data.
        </p>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" size={14} />
              <input
                type="text"
                placeholder="Search products (name, SKU, brand)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-6 rounded-lg bg-white border border-[#e4e4e7] text-sm w-72"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                className="h-9 pl-3 pr-12 rounded-lg bg-white border border-[#e4e4e7] text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>

              <select
                className="h-9 pl-3 pr-12 rounded-lg bg-white border border-[#e4e4e7] text-sm"
                value={classificationFilter}
                onChange={(e) => setClassificationFilter(e.target.value as typeof classificationFilter)}
              >
                <option value="All">All Types</option>
                <option value="Style">Style</option>
                <option value="Variant">Variant</option>
              </select>

              <select
                className="h-9 pl-3 pr-12 rounded-lg bg-white border border-[#e4e4e7] text-sm"
                value={featuredFilter}
                onChange={(e) => setFeaturedFilter(e.target.value as typeof featuredFilter)}
              >
                <option value="all">All Featured</option>
                <option value="true">Featured: Yes</option>
                <option value="false">Featured: No</option>
              </select>

              <select
                className="h-9 pl-3 pr-12 rounded-lg bg-white border border-[#e4e4e7] text-sm"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
              >
                <option value="all">All Stock</option>
                <option value="in_stock">In stock</option>
                <option value="low_stock">Low stock</option>
                <option value="out_of_stock">Out of stock</option>
              </select>

              <select
                className="h-9 pl-3 pr-12 rounded-lg bg-white border border-[#e4e4e7] text-sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categoryFilterOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Keep button isolated on the far end (separate partition). */}
            <div className="shrink-0 flex items-center pl-3 border-l border-[#e4e4e7]">
              <Button
                onClick={openCreate}
                className="h-9 px-4 bg-[#18181b] text-white text-sm font-medium rounded-lg hover:bg-[#27272a] flex items-center gap-2"
              >
                <Plus size={14} /> Add Product
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#71717a]">Brand</span>
                <Input
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  placeholder="e.g. Amul"
                  className="h-9 w-52 pr-6"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#71717a]">Price</span>
                <Input
                  type="number"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder="Min"
                  className="h-9 w-24 pr-6"
                />
                <Input
                  type="number"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder="Max"
                  className="h-9 w-24 pr-6"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#71717a]">GST</span>
                <Input
                  type="number"
                  value={gstMin}
                  onChange={(e) => setGstMin(e.target.value)}
                  placeholder="Min %"
                  className="h-9 w-24 pr-6"
                />
                <Input
                  type="number"
                  value={gstMax}
                  onChange={(e) => setGstMax(e.target.value)}
                  placeholder="Max %"
                  className="h-9 w-24 pr-6"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button variant="outline" onClick={() => setBulkModalOpen(true)}>
                  Bulk actions ({selectedIds.size})
                </Button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#71717a]" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={products.length > 0 && allDisplayedSelected} onCheckedChange={toggleSelectAll} />
                  </TableHead>
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
                    <TableCell>
                      <Checkbox checked={selectedIds.has(p._id)} onCheckedChange={() => toggleSelect(p._id)} />
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm text-[#71717a] font-mono">{p.sku ?? '—'}</TableCell>
                    <TableCell className="text-sm text-[#71717a]">
                      {(() => {
                        const catId =
                          typeof p.categoryId === 'object' && p.categoryId
                            ? (p.categoryId as { _id?: string })._id
                            : p.categoryId;
                        const name =
                          typeof p.categoryId === 'object' && p.categoryId && 'name' in p.categoryId
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
                          p.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-700'
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
                    <TableCell colSpan={11} className="text-center text-[#71717a] py-12">
                      No products found matching your filters. Add products here — CMS will use this data.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {pagination && pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[#e4e4e7] flex justify-between text-sm text-[#71717a]">
                <span>
                  Showing {products.length} of {pagination.total}
                </span>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-2 py-1 disabled:opacity-50 rounded border border-[#e4e4e7] bg-white"
                  >
                    Prev
                  </button>
                  <span>
                    Page {page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="px-2 py-1 disabled:opacity-50 rounded border border-[#e4e4e7] bg-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BulkProductOperationsModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        selectedIds={Array.from(selectedIds)}
        onSuccess={async (updates, ids) => {
          applyBulkUpdatesLocally(ids, updates);
          void loadProducts({ silent: true });
        }}
      />

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
                Lists match CMS → Categories &amp; Subcategories (customer admin taxonomy API).
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

          <div className="space-y-2 border-t border-[#e4e4e7] pt-4 px-4">
            <Label>Advanced Fields (JSON)</Label>
            <Textarea
              value={advancedJson}
              onChange={(e) => setAdvancedJson(e.target.value)}
              className="min-h-[180px] font-mono text-xs"
            />
            <p className="text-xs text-[#71717a]">
              Edit structured mastersheet fields (dimensions, taxBreakup, shipping, flags, etc.). Save persists these values.
            </p>
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
