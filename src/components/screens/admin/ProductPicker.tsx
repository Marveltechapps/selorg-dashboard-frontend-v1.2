/**
 * Multi-select product picker from catalog (for home sections).
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { fetchProducts, type Product } from '@/api/customerAppAdminApi';
import { Loader2, Search } from 'lucide-react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';

export interface ProductPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxHeight?: string;
}

export function ProductPicker({ selectedIds, onChange, maxHeight = '240px' }: ProductPickerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    fetchProducts()
      .then((data) => { if (mounted) setProducts(data); })
      .catch(() => { if (mounted) setProducts([]); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) => (p.name ?? '').toLowerCase().includes(q) || (String(p._id)).toLowerCase().includes(q));
  }, [products, search]);

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
      <p className="text-xs text-[#71717a]">Select products from Catalog. They will appear in this section on the home screen.</p>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a1a1aa]" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="border border-[#e4e4e7] rounded-lg overflow-auto bg-[#fafafa]" style={{ maxHeight }}>
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-[#71717a]">No products found. Add products in Catalog or Products tab.</p>
        ) : (
          <ul className="p-1 space-y-0.5">
            {filtered.map((p) => {
              const id = p._id;
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
                    <div className="w-8 h-8 rounded overflow-hidden bg-[#f4f4f5] flex-shrink-0">
                      {p.images?.[0] ? (
                        <ImageWithFallback src={p.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-[#a1a1aa] flex items-center justify-center w-full h-full">—</span>
                      )}
                    </div>
                    <span className="text-sm truncate flex-1">{p.name ?? id}</span>
                    <span className="text-xs text-[#71717a]">₹{p.price ?? 0}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {selectedIds.length > 0 && (
        <p className="text-xs text-[#71717a]">{selectedIds.length} product(s) selected.</p>
      )}
    </div>
  );
}
