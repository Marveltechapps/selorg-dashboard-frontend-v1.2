import React, { useState, useEffect } from 'react';
import { AdminModal } from './AdminModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Category, createCategory, updateCategory, fetchCategories } from '../catalogApi';
import { toast } from 'sonner';
import { FolderTree } from 'lucide-react';

interface AddCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void | Promise<void>;
  editCategory?: Category | null;
  /** When set, form opens in "add subcategory" mode with this parent pre-selected */
  initialParentId?: string | null;
  /** When true, dialog shows "Add Subcategory" and requires a parent category */
  subcategoryMode?: boolean;
}

export function AddCategoryModal({ open, onOpenChange, onSuccess, editCategory, initialParentId, subcategoryMode = false }: AddCategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parentId: '',
    description: '',
    imageUrl: '',
    link: '',
    status: 'active' as 'active' | 'inactive',
  });

  const isEditing = !!editCategory;
  const isSubcategoryFlow = subcategoryMode || !!initialParentId;

  useEffect(() => {
    if (open) {
      loadCategories();
      if (editCategory) {
        setFormData({
          name: editCategory.name,
          slug: editCategory.slug,
          parentId: editCategory.parentId || '',
          description: editCategory.description || '',
          imageUrl: editCategory.imageUrl || '',
          link: (editCategory as { link?: string }).link || '',
          status: editCategory.status,
        });
      } else if (initialParentId) {
        setFormData({
          name: '',
          slug: '',
          parentId: initialParentId,
          description: '',
          imageUrl: '',
          link: '',
          status: 'active',
        });
      } else {
        resetForm();
      }
    }
  }, [open, editCategory, initialParentId]);

  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      setCategories(data.filter(c => c.parentId === null)); // Only top-level for parent selection
    } catch (error) {
      toast.error('Failed to load categories');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      parentId: '',
      description: '',
      imageUrl: '',
      link: '',
      status: 'active',
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-generate slug from name
      if (field === 'name') {
        updated.slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }

      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error(isSubcategoryFlow ? 'Subcategory name is required' : 'Category name is required');
      return;
    }
    if (isSubcategoryFlow && !formData.parentId) {
      toast.error('Please select a parent category for the subcategory');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        parentId: formData.parentId || null,
        description: formData.description.trim(),
        imageUrl: formData.imageUrl.trim(),
        link: formData.link.trim() || undefined,
        status: formData.status,
      };

      if (isEditing) {
        await updateCategory(editCategory!.id, payload);
        toast.success(`Category "${formData.name}" updated successfully`);
      } else {
        await createCategory(payload);
        toast.success(`Category "${formData.name}" created successfully`);
      }

      await Promise.resolve(onSuccess?.());
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error(isEditing ? 'Failed to update category' : 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Category' : isSubcategoryFlow ? 'Add Subcategory' : 'Add New Category'}
      subtitle={isEditing
        ? 'Update category details'
        : isSubcategoryFlow
          ? 'Create a new subcategory. Select a parent category and enter the subcategory name.'
          : 'Create a new category or subcategory'}
      icon={<FolderTree size={20} />}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading
              ? (isEditing ? 'Updating...' : isSubcategoryFlow ? 'Creating subcategory...' : 'Creating...')
              : (isEditing ? 'Update Category' : isSubcategoryFlow ? 'Create Subcategory' : 'Create Category')}
          </Button>
        </>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
        <div className="space-y-4 py-4">
          {/* Category / Subcategory Name */}
          <div className="space-y-2">
            <Label htmlFor="cat-name">{isSubcategoryFlow ? 'Subcategory Name *' : 'Category Name *'}</Label>
            <Input
              id="cat-name"
              placeholder="e.g., Fresh Produce"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="cat-slug">Slug *</Label>
            <Input
              id="cat-slug"
              placeholder="e.g., fresh-produce"
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
            />
            <p className="text-xs text-gray-500">Auto-generated from name, can be customized</p>
          </div>

          {/* Parent Category */}
          <div className="space-y-2">
            <Label>Parent Category {isSubcategoryFlow ? '*' : '(Optional)'} {initialParentId ? '(pre-selected)' : ''}</Label>
            <Select
              value={formData.parentId || (isSubcategoryFlow ? '__required__' : '__none__')}
              onValueChange={(val) => handleChange('parentId', val === '__none__' || val === '__required__' ? '' : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={isSubcategoryFlow ? 'Select parent category...' : 'None (Top Level)'} />
              </SelectTrigger>
              <SelectContent>
                {isSubcategoryFlow && (
                  <SelectItem value="__required__" disabled>Select parent category...</SelectItem>
                )}
                {!isSubcategoryFlow && <SelectItem value="__none__">None (Top Level)</SelectItem>}
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {isSubcategoryFlow ? 'This will be a subcategory under the selected parent' : formData.parentId ? 'This will be a subcategory' : 'This will be a top-level category'}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="cat-description">Description</Label>
            <Textarea
              id="cat-description"
              placeholder="Brief description of the category..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="cat-image">Image URL (Optional)</Label>
            <Input
              id="cat-image"
              placeholder="https://example.com/category.jpg"
              value={formData.imageUrl}
              onChange={(e) => handleChange('imageUrl', e.target.value)}
            />
          </div>

          {/* On tap – link (home screen) */}
          <div className="space-y-2">
            <Label htmlFor="cat-link">On tap – navigate to (optional)</Label>
            <Input
              id="cat-link"
              placeholder="product:ID / category:ID / https://... / ScreenName:param=val"
              value={formData.link}
              onChange={(e) => handleChange('link', e.target.value)}
            />
            <p className="text-xs text-gray-500">When user taps this category on the app home: product:ID → Product detail, category:ID → Category page, https://... → External URL. Leave empty to open category products.</p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(val: any) => handleChange('status', val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </AdminModal>
  );
}
