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
import { Category, fetchCategories, deleteCategory } from './catalogApi';
import { AddCategoryModal } from './modals/AddCategoryModal';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, FolderTree, RefreshCw } from 'lucide-react';

export interface CategoryTaxonomyManagerProps {
  /** Increment to trigger a fresh fetch (e.g. global Refresh on Catalog page). */
  refreshToken?: number;
  /** Show a small refresh control in the panel header (Catalog uses a page-level Refresh instead). */
  showInlineRefresh?: boolean;
}

/**
 * Full CRUD for categories and subcategories via `/customer/admin/home/categories`.
 * Same data source as Products Introduction category dropdowns (`fetchCategories` in catalogApi).
 */
export function CategoryTaxonomyManager({
  refreshToken = 0,
  showInlineRefresh = false,
}: CategoryTaxonomyManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [addCategoryAsSubcategory, setAddCategoryAsSubcategory] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCategories();
      setCategories(data || []);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories, refreshToken]);

  const topLevelCategories = categories.filter((c) => c.parentId === null);
  const subcategories = categories.filter((c) => c.parentId !== null);

  return (
    <>
      <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center gap-2 flex-wrap">
          <h3 className="font-bold text-[#18181b]">Categories &amp; Subcategories</h3>
          <div className="flex gap-2 flex-wrap">
            {showInlineRefresh && (
              <Button size="sm" variant="outline" onClick={() => loadCategories()}>
                <RefreshCw size={14} className="mr-1.5" /> Refresh
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditCategory(null);
                setAddCategoryAsSubcategory(false);
                setAddCategoryOpen(true);
              }}
            >
              <Plus size={14} className="mr-1.5" /> Add Category
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditCategory(null);
                setAddCategoryAsSubcategory(true);
                setAddCategoryOpen(true);
              }}
            >
              <Plus size={14} className="mr-1.5" /> Add Subcategory
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <p className="text-sm text-[#71717a] py-8 text-center">Loading categories…</p>
          ) : (
            <>
              <div>
                <h4 className="text-sm font-semibold text-[#52525b] mb-3">Category Hierarchy</h4>
                <div className="space-y-4">
                  {topLevelCategories.map((category) => {
                    const subcats = categories.filter((c) => c.parentId === category.id);
                    const handleDeleteCategory = async (catId: string, catName: string) => {
                      if (!confirm(`Are you sure you want to delete "${catName}"? This will also delete all subcategories.`))
                        return;
                      try {
                        await deleteCategory(catId);
                        toast.success(`Category "${catName}" deleted`);
                        await loadCategories();
                      } catch (err: unknown) {
                        const e = err as { response?: { data?: { message?: string } }; message?: string };
                        const msg = e?.response?.data?.message || e?.message || 'Failed to delete category';
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
                              <div className="text-xs text-[#71717a]">
                                {category.productCount} products &middot; {subcats.length} subcategories
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setEditCategory(category);
                                setAddCategoryOpen(true);
                              }}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDeleteCategory(category.id, category.name)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                        {subcats.length > 0 && (
                          <div className="p-4 space-y-2 max-h-[280px] overflow-y-auto border-t border-[#e4e4e7]">
                            {subcats.map((subcat) => (
                              <div
                                key={subcat.id}
                                className="flex items-center justify-between py-2 px-3 rounded hover:bg-[#f4f4f5] group"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="w-1 h-1 rounded-full bg-[#a1a1aa] flex-shrink-0" />
                                  <span className="text-sm text-[#52525b]">{subcat.name}</span>
                                  <span className="text-xs text-[#71717a]">{subcat.productCount} products</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditCategory(subcat);
                                      setAddCategoryOpen(true);
                                    }}
                                  >
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
                                        await loadCategories();
                                      } catch (err: unknown) {
                                        const ex = err as { response?: { data?: { message?: string } }; message?: string };
                                        const msg = ex?.response?.data?.message || ex?.message || 'Failed to delete subcategory';
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

              <div>
                <h4 className="text-sm font-semibold text-[#52525b] mb-3">Subcategories</h4>
                {subcategories.length === 0 ? (
                  <p className="text-sm text-[#71717a] py-4">
                    No subcategories yet. Add a subcategory above (select a parent in the modal).
                  </p>
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
                        {subcategories.map((subcat) => {
                          const parent = categories.find((c) => c.id === subcat.parentId);
                          return (
                            <TableRow key={subcat.id} className="hover:bg-[#fcfcfc]">
                              <TableCell className="font-medium">{subcat.name}</TableCell>
                              <TableCell className="text-[#52525b]">{parent?.name ?? '—'}</TableCell>
                              <TableCell className="text-center">{subcat.productCount}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 mr-1"
                                  onClick={() => {
                                    setEditCategory(subcat);
                                    setAddCategoryOpen(true);
                                  }}
                                >
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
                                      await loadCategories();
                                    } catch (err: unknown) {
                                      const ex = err as { response?: { data?: { message?: string } }; message?: string };
                                      const msg = ex?.response?.data?.message || ex?.message || 'Failed to delete subcategory';
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
            </>
          )}
        </div>
      </div>

      <AddCategoryModal
        open={addCategoryOpen}
        onOpenChange={(open) => {
          setAddCategoryOpen(open);
          if (!open) {
            setEditCategory(null);
            setAddCategoryAsSubcategory(false);
          }
        }}
        onSuccess={loadCategories}
        editCategory={editCategory}
        subcategoryMode={addCategoryAsSubcategory}
      />
    </>
  );
}
