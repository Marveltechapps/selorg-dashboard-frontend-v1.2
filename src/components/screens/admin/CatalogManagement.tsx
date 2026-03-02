import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Product,
  Category,
  ProductAttribute,
  fetchProducts,
  fetchCategories,
  fetchAttributes,
  deleteProduct,
  updateProduct,
  createProduct,
  publishProduct,
  deleteCategory,
  deleteAttribute,
  getStockStatus,
  resolveCategoryIds,
} from './catalogApi';
import { AddProductModal } from './modals/AddProductModal';
import { AddCategoryModal } from './modals/AddCategoryModal';
import { AddAttributeModal } from './modals/AddAttributeModal';
import { BulkProductOperationsModal } from './modals/BulkProductOperationsModal';
import { toast } from 'sonner';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Star,
  StarOff,
  FolderTree,
  Tag,
  FileSpreadsheet,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Zap,
  Send,
} from 'lucide-react';

export function CatalogManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('products');
  const [stockFilter, setStockFilter] = useState<string>('all');
  // Pagination (server-side)
  const [productsPage, setProductsPage] = useState(1);
  const [productsMeta, setProductsMeta] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  
  // Modals
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addAttributeOpen, setAddAttributeOpen] = useState(false);
  const [bulkOpsOpen, setBulkOpsOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editAttribute, setEditAttribute] = useState<ProductAttribute | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  /** When true, Add Category modal opens in "Add Subcategory" mode (title + require parent) */
  const [addCategoryAsSubcategory, setAddCategoryAsSubcategory] = useState(false);
  /** Product delete confirmation: { id, name } when open */
  const [deleteProductConfirm, setDeleteProductConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteProductLoading, setDeleteProductLoading] = useState(false);
  
  // Selection
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: { categoryId?: string; status?: string; stock?: 'in_stock' | 'low_stock' | 'out_of_stock'; page?: number; limit?: number; search?: string } = {};
      if (categoryFilter !== 'all') params.categoryId = categoryFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (stockFilter !== 'all') params.stock = stockFilter as 'in_stock' | 'low_stock' | 'out_of_stock';
      params.page = productsPage;
      params.limit = 20;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [productsResult, categoriesData, attributesData] = await Promise.all([
        fetchProducts(params),
        fetchCategories(),
        fetchAttributes(),
      ]);

      const productsData = Array.isArray(productsResult) ? productsResult : (productsResult as { data: Product[] }).data;
      const meta = Array.isArray(productsResult) ? null : (productsResult as { meta?: typeof productsMeta })?.meta || null;

      setProducts(productsData || []);
      setProductsMeta(meta);
      setCategories(categoriesData || []);
      setAttributes(attributesData || []);
    } catch (error) {
      toast.error('Failed to load catalog data');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, stockFilter, productsPage, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset to page 1 when search changes (server-side search)
  useEffect(() => {
    setProductsPage(1);
  }, [searchQuery]);

  const handleDeleteProductClick = (id: string, name: string) => {
    setDeleteProductConfirm({ id, name });
  };

  const handleDeleteProductConfirm = async () => {
    if (!deleteProductConfirm) return;
    const { id, name } = deleteProductConfirm;
    setDeleteProductLoading(true);
    try {
      await deleteProduct(id);
      toast.success(`Product "${name}" deleted successfully`);
      setDeleteProductConfirm(null);
      await loadData(); // wait for list refresh so deleted item disappears immediately
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message ?? 'Failed to delete product';
      toast.error(msg);
    } finally {
      setDeleteProductLoading(false);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    try {
      await updateProduct(product.id, { status: newStatus });
      toast.success(`Product ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      await loadData();
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message ?? 'Failed to update product status';
      toast.error(msg);
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    try {
      await updateProduct(product.id, { featured: !product.featured });
      toast.success(product.featured ? 'Removed from featured' : 'Added to featured');
      await loadData();
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message ?? 'Failed to update product';
      toast.error(msg);
    }
  };

  const handlePublishProduct = async (product: Product) => {
    try {
      await publishProduct(product.id);
      toast.success(`Product "${product.name}" published. Sync to warehouse and dark store initiated.`);
      await loadData();
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message ?? 'Failed to publish product';
      toast.error(msg);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditProduct(product);
    setAddProductOpen(true);
  };

  const handleDuplicateProduct = async (product: Product) => {
    try {
      const duplicateData: Partial<Product> = {
        ...product,
        name: `${product.name} (Copy)`,
        sku: `${product.sku}-COPY-${Date.now()}`,
        id: undefined, // Let backend generate new ID
      };
      delete duplicateData.id;
      delete duplicateData.createdAt;
      delete duplicateData.updatedAt;
      
      await createProduct(duplicateData);
      toast.success(`Product "${product.name}" duplicated successfully`);
      await loadData();
    } catch (error: unknown) {
      console.error('Duplicate product error:', error);
      const msg = (error as { message?: string })?.message ?? 'Failed to duplicate product';
      toast.error(msg);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, id]);
    } else {
      setSelectedProducts(selectedProducts.filter(pid => pid !== id));
    }
  };

  const handleExport = () => {
    try {
      if (filteredProducts.length === 0) {
        toast.warning('No products to export');
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const csvData = [
        ['Catalog Export', `Generated: ${new Date().toLocaleString()}`],
        [''],
        ['Product Details'],
        ['Name', 'SKU', 'Category', 'Subcategory', 'Brand', 'Price', 'Stock', 'Status', 'Featured'],
        ...filteredProducts.map(product => [
          product.name || '',
          product.sku || '',
          product.category || '',
          product.subcategory || '',
          product.brand || '',
          product.price.toString() || '0',
          product.stockQuantity.toString() || '0',
          product.status || '',
          product.featured ? 'Yes' : 'No'
        ]),
      ];

      const csv = csvData.map(row => row.map(cell => {
        const cellStr = String(cell).replace(/"/g, '""');
        return `"${cellStr}"`;
      }).join(',')).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `catalog-export-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Exported ${filteredProducts.length} product(s) successfully`);
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error(`Failed to export products: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleImport = () => {
    console.log('Import clicked');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: Event) => {
      console.log('File selected for import');
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        toast.info('Import feature - CSV parsing in progress');
        // TODO: Implement CSV parsing and product creation
        console.log('CSV content:', text);
      } catch (error: any) {
        console.error('Import failed:', error);
        toast.error(`Failed to import products: ${error.message || 'Unknown error'}`);
      }
    };
    input.click();
  };

  const handleDownloadTemplate = () => {
    try {
      const template = [
        ['Product Name', 'SKU', 'Category', 'Subcategory', 'Brand', 'Price', 'Cost Price', 'Stock Quantity', 'Low Stock Threshold', 'Status', 'Featured', 'Description', 'Image URL', 'Tags'],
        ['Example Product', 'SKU-001', 'Fruits', 'Fresh Fruits', 'Brand Name', '100.00', '80.00', '50', '10', 'active', 'false', 'Product description', 'https://example.com/image.jpg', 'tag1,tag2'],
      ];

      const csv = template.map(row => row.map(cell => {
        const cellStr = String(cell).replace(/"/g, '""');
        return `"${cellStr}"`;
      }).join(',')).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'product-import-template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Template downloaded successfully');
    } catch (error: any) {
      console.error('Template download failed:', error);
      toast.error(`Failed to download template: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleBulkImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          toast.error('CSV file must have at least a header row and one data row');
          return;
        }

        // Parse CSV (simple parser - handles quoted fields)
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // Skip next quote
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseCSVLine(lines[0]);
        const dataRows = lines.slice(1).map(parseCSVLine);
        
        // Resolve category names to IDs before import
        const categoriesList = await fetchCategories();
        let successCount = 0;
        let errorCount = 0;

        for (const row of dataRows) {
          if (row.length < headers.length) continue;
          
          try {
            const categoryName = row[2] || '';
            const subcategoryName = row[3] || '';
            const { categoryId: resolvedCategoryId, subcategoryId: resolvedSubcategoryId } = resolveCategoryIds(
              categoriesList,
              categoryName,
              subcategoryName
            );

            const productData: Partial<Product> = {
              name: row[0] || '',
              sku: row[1] || '',
              brand: row[4] || '',
              price: parseFloat(row[5]) || 0,
              costPrice: parseFloat(row[6]) || 0,
              stockQuantity: parseInt(row[7]) || 0,
              lowStockThreshold: parseInt(row[8]) || 10,
              status: (row[9] || 'active') as 'active' | 'inactive' | 'draft',
              featured: row[10] === 'true',
              description: row[11] || '',
              imageUrl: row[12] || '',
              images: row[12] ? [row[12]] : [],
              tags: row[13] ? row[13].split(',').map(t => t.trim()) : [],
            };
            if (resolvedCategoryId) productData.categoryId = resolvedCategoryId;
            if (resolvedSubcategoryId) productData.subcategoryId = resolvedSubcategoryId;

            if (productData.name && productData.sku) {
              await createProduct(productData);
              successCount++;
            }
          } catch (error) {
            console.error('Error importing product:', error);
            errorCount++;
          }
        }

        toast.success(`Imported ${successCount} product(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
        await loadData();
      } catch (error: any) {
        console.error('Import failed:', error);
        toast.error(`Failed to import products: ${error.message || 'Unknown error'}`);
      }
    };
    input.click();
  };

  // Filtering
  const filteredProducts = products.filter(product => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (statusFilter !== 'all' && product.status !== statusFilter) return false;
    
    // Category filter - match by category ID or category name
    if (categoryFilter !== 'all') {
      const matchesCategory = product.categoryId === categoryFilter || product.category === categoryFilter;
      if (!matchesCategory) return false;
    }
    
    // Stock filter
    if (stockFilter !== 'all') {
      const stockStatus = getStockStatus(product);
      if (stockFilter !== stockStatus) return false;
    }
    
    return true;
  });

  // Statistics (use meta.total when server-side pagination; else from current products)
  const stats = {
    total: productsMeta?.total ?? products.length,
    active: products.filter(p => p.status === 'active').length,
    lowStock: products.filter(p => getStockStatus(p) === 'low_stock').length,
    outOfStock: products.filter(p => getStockStatus(p) === 'out_of_stock').length,
    featured: products.filter(p => p.featured).length,
  };

  const topLevelCategories = categories.filter(c => c.parentId === null);
  const subcategories = categories.filter(c => c.parentId !== null);

  const getStockBadge = (product: Product) => {
    const status = getStockStatus(product);
    if (status === 'out_of_stock') {
      return <Badge variant="destructive" className="gap-1"><AlertCircle size={12} />Out of Stock</Badge>;
    }
    if (status === 'low_stock') {
      return <Badge className="bg-amber-500 hover:bg-amber-600 gap-1"><AlertCircle size={12} />Low Stock</Badge>;
    }
    return <Badge className="bg-emerald-500 hover:bg-emerald-600">In Stock</Badge>;
  };

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Catalog Management</h1>
          <p className="text-[#71717a] text-sm">Manage products, categories, and inventory</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
          >
            <Download size={14} className="mr-1.5" /> Export
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleImport}
          >
            <Upload size={14} className="mr-1.5" /> Import
          </Button>
          <Button size="sm" onClick={loadData} variant="outline">
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#71717a] uppercase tracking-wider">Total Products</p>
              <p className="text-2xl font-bold text-[#18181b] mt-1">{stats?.total ?? 0}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Package className="text-blue-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#71717a] uppercase tracking-wider">Active</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats?.active ?? 0}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-emerald-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#71717a] uppercase tracking-wider">Low Stock</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats?.lowStock ?? 0}</p>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <AlertCircle className="text-amber-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#71717a] uppercase tracking-wider">Out of Stock</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">{stats?.outOfStock ?? 0}</p>
            </div>
            <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
              <AlertCircle className="text-rose-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#71717a] uppercase tracking-wider">Featured</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats?.featured ?? 0}</p>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Star className="text-purple-600" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="products" id="products-tab">
            <Package size={14} className="mr-1.5" /> Products
          </TabsTrigger>
          <TabsTrigger value="categories">
            <FolderTree size={14} className="mr-1.5" /> Categories
          </TabsTrigger>
          <TabsTrigger value="attributes">
            <Tag size={14} className="mr-1.5" /> Attributes
          </TabsTrigger>
          <TabsTrigger value="import">
            <FileSpreadsheet size={14} className="mr-1.5" /> Bulk Import
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            {/* Controls */}
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" size={14} />
                <Input
                  placeholder="Search by name, SKU, or brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select
                value={categoryFilter}
                onValueChange={(v) => {
                  setCategoryFilter(v);
                  setProductsPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {topLevelCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setProductsPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={stockFilter}
                onValueChange={(v) => {
                  setStockFilter(v);
                  setProductsPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              {selectedProducts.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setBulkOpsOpen(true)}
                  className="ml-auto"
                >
                  <Zap size={14} className="mr-1.5" />
                  Bulk Actions ({selectedProducts.length})
                </Button>
              )}

              <Button size="sm" onClick={() => {
                setEditProduct(null);
                setAddProductOpen(true);
              }}>
                <Plus size={14} className="mr-1.5" /> Add Product
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-auto max-h-[600px] overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-[#f9fafb] z-10">
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-[#71717a]">
                        Loading products...
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-[#71717a]">
                        No products found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id} className="hover:bg-[#fcfcfc]">
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-[#f4f4f5] rounded-lg border border-[#e4e4e7] overflow-hidden flex-shrink-0">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package size={16} className="text-[#a1a1aa]" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-[#18181b] flex items-center gap-1.5">
                                {product.name}
                                {product.featured && <Star size={12} className="text-amber-500 fill-amber-500 flex-shrink-0" />}
                              </div>
                              <div className="text-xs text-[#71717a] truncate">
                                {product.attributes.weight || 'No weight specified'}
                              </div>
                              {product.tags && product.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1 max-w-[200px] overflow-x-auto">
                                  {product.tags.slice(0, 3).map((tag, idx) => (
                                    <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                                      {tag}
                                    </span>
                                  ))}
                                  {product.tags.length > 3 && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-50 text-gray-600 rounded">
                                      +{product.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-[#52525b]">{product.sku}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-[#52525b]">{product.category}</div>
                          {product.subcategory && (
                            <div className="text-xs text-[#a1a1aa]">{product.subcategory}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-[#52525b]">{product.brand || '-'}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium text-[#18181b]">₹{product.price.toFixed(2)}</div>
                          {product.costPrice > 0 && (
                            <div className="text-xs text-[#a1a1aa]">Cost: ₹{product.costPrice.toFixed(2)}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium text-[#18181b]">{product.stockQuantity}</div>
                          {getStockBadge(product)}
                        </TableCell>
                        <TableCell>
                          {product.status === 'active' && <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>}
                          {product.status === 'inactive' && <Badge variant="secondary">Inactive</Badge>}
                          {product.status === 'draft' && <Badge variant="outline">Draft</Badge>}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                              >
                                <MoreVertical size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onSelect={() => handleEditProduct(product)}>
                                <Edit size={14} className="mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDuplicateProduct(product)}>
                                <Copy size={14} className="mr-2" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleToggleFeatured(product)}>
                                {product.featured ? (
                                  <><StarOff size={14} className="mr-2" /> Remove Featured</>
                                ) : (
                                  <><Star size={14} className="mr-2" /> Set Featured</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleToggleStatus(product)}>
                                {product.status === 'active' ? (
                                  <><EyeOff size={14} className="mr-2" /> Deactivate</>
                                ) : (
                                  <><Eye size={14} className="mr-2" /> Activate</>
                                )}
                              </DropdownMenuItem>
                              {product.status === 'draft' && (
                                <DropdownMenuItem onSelect={() => handlePublishProduct(product)}>
                                  <Send size={14} className="mr-2" /> Publish
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => handleDeleteProductClick(product.id, product.name)}
                                className="text-rose-600"
                              >
                                <Trash2 size={14} className="mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <p className="text-sm text-[#71717a]">
                {productsMeta
                  ? `Showing ${(productsMeta.page - 1) * productsMeta.limit + 1}-${Math.min(productsMeta.page * productsMeta.limit, productsMeta.total)} of ${productsMeta.total} products`
                  : `Showing ${filteredProducts.length} of ${products.length} products`}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!productsMeta || productsMeta.page <= 1}
                  onClick={() => setProductsPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!productsMeta || productsMeta.page >= productsMeta.totalPages}
                  onClick={() => setProductsPage((p) => Math.min(productsMeta?.totalPages ?? p, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <h3 className="font-bold text-[#18181b]">Categories &amp; Subcategories</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditCategory(null); setAddCategoryAsSubcategory(false); setAddCategoryOpen(true); }}>
                  <Plus size={14} className="mr-1.5" /> Add Category
                </Button>
                <Button size="sm" onClick={() => { setEditCategory(null); setAddCategoryAsSubcategory(true); setAddCategoryOpen(true); }}>
                  <Plus size={14} className="mr-1.5" /> Add Subcategory
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Category hierarchy (top-level + nested subcategories) */}
              <div>
                <h4 className="text-sm font-semibold text-[#52525b] mb-3">Category Hierarchy</h4>
                <div className="space-y-4">
                  {topLevelCategories.map(category => {
                    const subcats = categories.filter(c => c.parentId === category.id);
                    const handleDeleteCategory = async (catId: string, catName: string) => {
                      if (!confirm(`Are you sure you want to delete "${catName}"? This will also delete all subcategories.`)) return;
                      try {
                        await deleteCategory(catId);
                        toast.success(`Category "${catName}" deleted`);
                        await loadData();
                      } catch (err: any) {
                        const msg = err?.response?.data?.message || err?.message || 'Failed to delete category';
                        toast.error(msg);
                      }
                    };
                    return (
                      <div key={category.id} className="border border-[#e4e4e7] rounded-lg overflow-hidden">
                        <div className="p-4 bg-[#f9fafb] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FolderTree className="text-blue-600" size={20} />
                            <div>
                              <div className="font-bold text-[#18181b]">{category.name}</div>
                              <div className="text-xs text-[#71717a]">{category.productCount} products &middot; {subcats.length} subcategories</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditCategory(category); setAddCategoryOpen(true); }}>
                              <Edit size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDeleteCategory(category.id, category.name)}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                        {subcats.length > 0 && (
                          <div className="p-4 space-y-2 max-h-[280px] overflow-y-auto border-t border-[#e4e4e7]">
                            {subcats.map(subcat => (
                              <div
                                key={subcat.id}
                                className="flex items-center justify-between py-2 px-3 rounded hover:bg-[#f4f4f5] group"
                              >
                                <div
                                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                                  onClick={() => { setCategoryFilter(subcat.id); setProductsPage(1); setActiveTab('products'); }}
                                >
                                  <div className="w-1 h-1 rounded-full bg-[#a1a1aa] flex-shrink-0" />
                                  <span className="text-sm text-[#52525b]">{subcat.name}</span>
                                  <span className="text-xs text-[#71717a]">{subcat.productCount} products</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setEditCategory(subcat); setAddCategoryOpen(true); }}>
                                    <Edit size={12} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!confirm(`Delete subcategory "${subcat.name}"?`)) return;
                                      try {
                                        await deleteCategory(subcat.id);
                                        toast.success(`Subcategory "${subcat.name}" deleted`);
                                        await loadData();
                                      } catch (err: any) {
                                        const msg = err?.response?.data?.message || err?.message || 'Failed to delete subcategory';
                                        toast.error(msg);
                                      }
                                    }}
                                  >
                                    <Trash2 size={12} />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Subcategories list (CRUD view near category section) */}
              <div>
                <h4 className="text-sm font-semibold text-[#52525b] mb-3">Subcategories</h4>
                {subcategories.length === 0 ? (
                  <p className="text-sm text-[#71717a] py-4">No subcategories yet. Add a subcategory above (select a parent in the modal).</p>
                ) : (
                  <div className="border border-[#e4e4e7] rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f9fafb]">
                          <TableHead>Subcategory</TableHead>
                          <TableHead>Parent Category</TableHead>
                          <TableHead className="text-center">Products</TableHead>
                          <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subcategories.map(subcat => {
                          const parent = categories.find(c => c.id === subcat.parentId);
                          return (
                            <TableRow key={subcat.id} className="hover:bg-[#fcfcfc]">
                              <TableCell className="font-medium">{subcat.name}</TableCell>
                              <TableCell className="text-[#52525b]">{parent?.name ?? '—'}</TableCell>
                              <TableCell className="text-center">{subcat.productCount}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" className="h-7 mr-1" onClick={() => { setEditCategory(subcat); setAddCategoryOpen(true); }}>
                                  <Edit size={12} className="mr-1" /> Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-rose-600 hover:bg-rose-50"
                                  onClick={async () => {
                                    if (!confirm(`Delete subcategory "${subcat.name}"?`)) return;
                                    try {
                                      await deleteCategory(subcat.id);
                                      toast.success(`Subcategory "${subcat.name}" deleted`);
                                      await loadData();
                                    } catch (err: any) {
                                      const msg = err?.response?.data?.message || err?.message || 'Failed to delete subcategory';
                                      toast.error(msg);
                                    }
                                    }}
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Attributes Tab */}
        <TabsContent value="attributes">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#18181b]">Product Attributes</h3>
                <p className="text-xs text-[#71717a] mt-1">Reusable attributes for product variants</p>
              </div>
              <Button size="sm" onClick={() => {
                setEditAttribute(null);
                setAddAttributeOpen(true);
              }}>
                <Plus size={14} className="mr-1.5" /> Add Attribute
              </Button>
            </div>

            <div className="p-6">
              {attributes.length === 0 ? (
                <div className="text-center py-12 text-[#71717a]">
                  <Tag size={32} className="mx-auto mb-3 text-[#a1a1aa]" />
                  <p className="font-medium">No attributes yet</p>
                  <p className="text-sm mt-1">Create your first product attribute to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attributes.map(attr => (
                    <div key={attr.id} className="border border-[#e4e4e7] rounded-lg p-4 hover:border-[#a1a1aa] transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-bold text-[#18181b]">{attr.name}</div>
                          <Badge variant="outline" className="text-xs mt-1">{attr.type}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setEditAttribute(attr);
                              setAddAttributeOpen(true);
                            }}
                          >
                            <Edit size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={async () => {
                              if (!confirm(`Delete attribute "${attr.name}"?`)) return;
                              try {
                                await deleteAttribute(attr.id);
                                toast.success(`Attribute "${attr.name}" deleted`);
                                await loadData();
                              } catch {
                                toast.error('Failed to delete attribute');
                              }
                            }}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                      {attr.options && attr.options.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {attr.options.map(opt => (
                            <Badge key={opt} variant="secondary" className="text-xs">{opt}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Bulk Import Tab */}
        <TabsContent value="import">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-[#f4f4f5] rounded-full flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet size={32} className="text-[#a1a1aa]" />
              </div>
              <h3 className="text-xl font-bold text-[#18181b] mb-2">Bulk Import Products</h3>
              <p className="text-[#71717a] mb-6 max-w-md mx-auto">
                Upload a CSV file to add multiple products at once. Download the template to get started.
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  variant="outline" 
                  onClick={handleDownloadTemplate}
                >
                  <Download size={14} className="mr-1.5" /> Download Template
                </Button>
                <Button onClick={handleBulkImport}>
                  <Upload size={14} className="mr-1.5" /> Upload CSV
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddProductModal
        open={addProductOpen}
        onOpenChange={(open) => {
          setAddProductOpen(open);
          if (!open) setEditProduct(null);
        }}
        onSuccess={loadData}
        editProduct={editProduct}
      />

      <AddCategoryModal
        open={addCategoryOpen}
        onOpenChange={(open) => {
          setAddCategoryOpen(open);
          if (!open) { setEditCategory(null); setAddCategoryAsSubcategory(false); }
        }}
        onSuccess={loadData}
        editCategory={editCategory}
        subcategoryMode={addCategoryAsSubcategory}
      />

      <AddAttributeModal
        open={addAttributeOpen}
        onOpenChange={(open) => {
          setAddAttributeOpen(open);
          if (!open) setEditAttribute(null);
        }}
        onSuccess={loadData}
        editAttribute={editAttribute}
      />

      <BulkProductOperationsModal
        open={bulkOpsOpen}
        onOpenChange={setBulkOpsOpen}
        selectedIds={selectedProducts}
        onSuccess={async () => {
          await loadData();
          setSelectedProducts([]);
        }}
      />

      {/* Delete product confirmation — themed dialog instead of browser confirm */}
      <AlertDialog open={!!deleteProductConfirm} onOpenChange={(open) => !open && setDeleteProductConfirm(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <AlertDialogTitle className="text-[#18181b]">Delete product?</AlertDialogTitle>
                <AlertDialogDescription className="mt-2 text-[#71717a]">
                  Are you sure you want to delete &quot;{deleteProductConfirm?.name}&quot;? This action cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              onClick={() => setDeleteProductConfirm(null)}
              disabled={deleteProductLoading}
              className="border-[#e4e4e7] text-[#52525b] hover:bg-[#f4f4f5]"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={handleDeleteProductConfirm}
              disabled={deleteProductLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteProductLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
