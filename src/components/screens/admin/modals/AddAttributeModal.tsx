import React, { useState, useEffect } from 'react';
import { AdminModal } from './AdminModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductAttribute, createAttribute, updateAttribute } from '../catalogApi';
import { toast } from 'sonner';
import { Tag, X, Plus } from 'lucide-react';

interface AddAttributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void | Promise<void>;
  editAttribute?: ProductAttribute | null;
}

export function AddAttributeModal({ open, onOpenChange, onSuccess, editAttribute }: AddAttributeModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'text' as 'text' | 'select' | 'number' | 'boolean',
    options: [] as string[],
  });
  const [optionInput, setOptionInput] = useState('');

  const isEditing = !!editAttribute;

  useEffect(() => {
    if (open) {
      if (editAttribute) {
        setFormData({
          name: editAttribute.name,
          type: editAttribute.type,
          options: editAttribute.options || [],
        });
      } else {
        resetForm();
      }
    }
  }, [open, editAttribute]);

  const resetForm = () => {
    setFormData({ name: '', type: 'text', options: [] });
    setOptionInput('');
  };

  const handleAddOption = () => {
    const trimmed = optionInput.trim();
    if (!trimmed) return;
    if (formData.options.includes(trimmed)) {
      toast.error('Option already exists');
      return;
    }
    setFormData(prev => ({ ...prev, options: [...prev.options, trimmed] }));
    setOptionInput('');
  };

  const handleRemoveOption = (opt: string) => {
    setFormData(prev => ({ ...prev, options: prev.options.filter(o => o !== opt) }));
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOption();
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Attribute name is required');
      return;
    }
    if (formData.type === 'select' && formData.options.length === 0) {
      toast.error('Select type requires at least one option');
      return;
    }

    setLoading(true);
    try {
      const payload: Partial<ProductAttribute> = {
        name: formData.name.trim(),
        type: formData.type,
        options: formData.type === 'select' ? formData.options : [],
      };

      if (isEditing) {
        await updateAttribute(editAttribute!.id, payload);
        toast.success(`Attribute "${formData.name}" updated successfully`);
      } else {
        await createAttribute(payload);
        toast.success(`Attribute "${formData.name}" created successfully`);
      }

      await Promise.resolve(onSuccess?.());
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error(isEditing ? 'Failed to update attribute' : 'Failed to create attribute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Attribute' : 'Add New Attribute'}
      subtitle={isEditing ? 'Update attribute details' : 'Create a reusable product attribute'}
      icon={<Tag size={20} />}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
            {loading
              ? (isEditing ? 'Updating...' : 'Creating...')
              : (isEditing ? 'Update Attribute' : 'Create Attribute')}
          </Button>
        </>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="attr-name">Attribute Name *</Label>
            <Input
              id="attr-name"
              placeholder="e.g., Color, Size, Material"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(val: any) => setFormData(prev => ({ ...prev, type: val }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="select">Select (Dropdown)</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean (Yes/No)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {formData.type === 'text' && 'Free-form text input'}
              {formData.type === 'select' && 'Dropdown with predefined options'}
              {formData.type === 'number' && 'Numeric value input'}
              {formData.type === 'boolean' && 'Yes/No toggle'}
            </p>
          </div>

          {formData.type === 'select' && (
            <div className="space-y-2">
              <Label>Options *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add an option..."
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  onKeyDown={handleOptionKeyDown}
                  className="flex-1"
                />
                <Button type="button" size="sm" variant="outline" onClick={handleAddOption}>
                  <Plus size={14} />
                </Button>
              </div>
              {formData.options.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData.options.map(opt => (
                    <Badge key={opt} variant="secondary" className="text-xs gap-1 pr-1">
                      {opt}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(opt)}
                        className="ml-0.5 rounded-full hover:bg-[#e4e4e7] p-0.5"
                      >
                        <X size={10} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {formData.options.length === 0 && (
                <p className="text-xs text-amber-600">Add at least one option for this select attribute</p>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminModal>
  );
}
