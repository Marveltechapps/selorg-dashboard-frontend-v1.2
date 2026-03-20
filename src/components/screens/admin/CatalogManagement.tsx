import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Product,
  ProductAttribute,
  fetchCategories,
  fetchAttributes,
  deleteAttribute,
  createProduct,
  resolveCategoryIds,
} from './catalogApi';
import { AddAttributeModal } from './modals/AddAttributeModal';
import { CategoryTaxonomyManager } from './CategoryTaxonomyManager';
import { toast } from 'sonner';
import {
  Plus,
  Download,
  Upload,
  Edit,
  Trash2,
  FolderTree,
  Tag,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';

export function CatalogManagement() {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryRefreshToken, setCategoryRefreshToken] = useState(0);

  const [activeTab, setActiveTab] = useState<string>('categories');

  const [addAttributeOpen, setAddAttributeOpen] = useState(false);
  const [editAttribute, setEditAttribute] = useState<ProductAttribute | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const attributesData = await fetchAttributes();
      setAttributes(attributesData || []);
    } catch {
      toast.error('Failed to load catalog data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshAll = useCallback(() => {
    loadData();
    setCategoryRefreshToken((t) => t + 1);
  }, [loadData]);

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
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Template download failed:', error);
      toast.error(`Failed to download template: ${err?.message || 'Unknown error'}`);
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

        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
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
        setCategoryRefreshToken((t) => t + 1);
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error('Import failed:', error);
        toast.error(`Failed to import products: ${err.message || 'Unknown error'}`);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Catalog Management</h1>
          <p className="text-[#71717a] text-sm">Manage categories, attributes, and bulk product import</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={refreshAll} variant="outline">
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
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

        <TabsContent value="categories">
          <CategoryTaxonomyManager refreshToken={categoryRefreshToken} />
        </TabsContent>

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
              {loading ? (
                <p className="text-sm text-[#71717a] py-12 text-center">Loading attributes…</p>
              ) : attributes.length === 0 ? (
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

      <AddAttributeModal
        open={addAttributeOpen}
        onOpenChange={(open) => {
          setAddAttributeOpen(open);
          if (!open) setEditAttribute(null);
        }}
        onSuccess={loadData}
        editAttribute={editAttribute}
      />
    </div>
  );
}
