/**
 * Multi-select category picker (for super_category, lifestyle sections).
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { fetchCategories, type Category } from '@/api/customerAppAdminApi';
import { Loader2, Search } from 'lucide-react';

export interface CategoryPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxHeight?: string;
}

export function CategoryPicker({ selectedIds, onChange, maxHeight = '240px' }: CategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    fetchCategories()
      .then((data) => {
        if (mounted) {
          // Only show top-level categories (no subcategories)
          const topLevel = (data ?? []).filter((c) => !c.parentId || c.parentId === null);
          setCategories(topLevel);
        }
      })
      .catch(() => { if (mounted) setCategories([]); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((c) => (c.name ?? '').toLowerCase().includes(q) || (c.slug ?? '').toLowerCase().includes(q) || (String(c._id)).toLowerCase().includes(q));
  }, [categories, search]);

  const toggle = (id: string) => {
    const set = new Set(selectedIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange(Array.from(set));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-[#71717a]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a1a1aa]" />
        <Input
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="border border-[#e4e4e7] rounded-lg overflow-auto bg-[#fafafa]" style={{ maxHeight }}>
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-[#71717a]">No categories found.</p>
        ) : (
          <ul className="p-1 space-y-0.5">
            {filtered.map((c) => {
              const id = c._id;
              const checked = selectedIds.includes(id);
              return (
                <li key={id}>
                  <label className="flex items-center gap-2 p-2 rounded hover:bg-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(id)}
                      className="rounded border-[#e4e4e7]"
                    />
                    <span className="text-sm truncate flex-1">{c.name ?? c.slug ?? id}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {selectedIds.length > 0 && (
        <p className="text-xs text-[#71717a]">{selectedIds.length} categor{selectedIds.length !== 1 ? 'ies' : 'y'} selected.</p>
      )}
    </div>
  );
}
