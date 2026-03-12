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
  fetchPages,
  createPage,
  updatePage,
  deletePage,
  getPage,
  type Page,
} from '@/api/cmsAdminApi';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, ChevronUp, ChevronDown } from 'lucide-react';

type BlockItem = { _id?: string; type: string; order: number; config?: Record<string, unknown>; dataSource?: Record<string, unknown> };

const BLOCK_TYPES = [
  { value: 'heroBanner', label: 'Hero Banner' },
  { value: 'bannerCarousel', label: 'Banner Carousel' },
  { value: 'categoryGrid', label: 'Category Grid' },
  { value: 'productCarousel', label: 'Product Carousel' },
  { value: 'collectionCarousel', label: 'Collection Carousel' },
  { value: 'lifestyleGrid', label: 'Lifestyle Grid' },
  { value: 'promoImage', label: 'Promo Image' },
  { value: 'organicTagline', label: 'Organic Tagline' },
] as const;

export function CmsPagesScreen() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ slug: '', title: '', status: 'draft' as const });
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [saving, setSaving] = useState(false);

  const loadPages = async () => {
    setLoading(true);
    try {
      const data = await fetchPages();
      setPages(data);
    } catch {
      toast.error('Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ slug: '', title: '', status: 'draft' });
    setBlocks([]);
    setDialogOpen(true);
  };

  const openEdit = async (p: Page) => {
    setEditingId(p._id);
    setFormData({ slug: p.slug, title: p.title || '', status: p.status as 'draft' });
    try {
      const full = await getPage(p._id);
      const blks = (full?.blocks ?? []) as BlockItem[];
      setBlocks(blks.map((b, i) => ({ ...b, order: b.order ?? i })));
    } catch {
      setBlocks((p.blocks ?? []) as BlockItem[]);
    }
    setDialogOpen(true);
  };

  const moveBlock = (idx: number, dir: 'up' | 'down') => {
    const next = [...blocks];
    const j = dir === 'up' ? idx - 1 : idx + 1;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setBlocks(next.map((b, i) => ({ ...b, order: i })));
  };

  const setBlockMaxItems = (idx: number, maxItems: number | '') => {
    const next = [...blocks];
    next[idx] = {
      ...next[idx],
      config: { ...(next[idx].config ?? {}), maxItems: maxItems === '' ? undefined : maxItems },
    };
    setBlocks(next);
  };

  const setBlockStyle = (idx: number, styleJson: string) => {
    const next = [...blocks];
    let style: Record<string, unknown> | undefined;
    if (styleJson.trim()) {
      try {
        style = JSON.parse(styleJson) as Record<string, unknown>;
      } catch {
        return;
      }
    }
    next[idx] = {
      ...next[idx],
      config: { ...(next[idx].config ?? {}), style: style ?? undefined },
    };
    setBlocks(next);
  };

  const addBlock = (type: string) => {
    setBlocks((prev) => [...prev, { type, order: prev.length, config: {}, dataSource: {} }]);
  };

  const removeBlock = (idx: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== idx).map((b, i) => ({ ...b, order: i })));
  };

  const handleSave = async () => {
    if (!formData.slug.trim()) {
      toast.error('Slug is required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...formData, blocks };
      if (editingId) {
        await updatePage(editingId, payload);
        toast.success('Page updated');
      } else {
        await createPage(payload);
        toast.success('Page created');
      }
      setDialogOpen(false);
      loadPages();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this page?')) return;
    try {
      await deletePage(id);
      toast.success('Page deleted');
      loadPages();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#18181b]">CMS Pages</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Page
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Manage dynamic pages (home, landing pages). Set status to &quot;published&quot; for the page to appear in the app.
      </p>
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Blocks</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.map((p) => (
              <TableRow key={p._id}>
                <TableCell className="font-mono">{p.slug}</TableCell>
                <TableCell>{p.title || '-'}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      p.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {p.status}
                  </span>
                </TableCell>
                <TableCell>{(p.blocks?.length ?? 0)} blocks</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {p.slug !== 'home' && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p._id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {pages.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No pages yet. Create one or run the seed script to create the default home page.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Page' : 'Create Page'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g. home, summer-sale"
                disabled={!!editingId && formData.slug === 'home'}
              />
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Page title"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            {(editingId || blocks.length > 0) && (
              <div className="border-t pt-4">
                <Label className="mb-2 block">Blocks (order & count)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Add blocks, reorder with arrows, set maxItems. Optional style JSON: {`{"borderRadius":8}`, `{"columns":4}`, `{"height":200}`}.
                </p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {BLOCK_TYPES.map((bt) => (
                    <Button
                      key={bt.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addBlock(bt.value)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {bt.label}
                    </Button>
                  ))}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {blocks.map((b, idx) => (
                    <div
                      key={b._id ?? `${b.type}-${idx}`}
                      className="flex items-center gap-2 p-2 rounded border bg-muted/30"
                    >
                      <div className="flex flex-col">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveBlock(idx, 'up')}
                          disabled={idx === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveBlock(idx, 'down')}
                          disabled={idx === blocks.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-mono text-sm flex-1">{b.type}</span>
                      <Input
                        type="number"
                        placeholder="maxItems"
                        className="w-20"
                        min={1}
                        value={String((b.config as Record<string, unknown>)?.maxItems ?? '')}
                        onChange={(e) =>
                          setBlockMaxItems(idx, e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)
                        }
                      />
                      <Input
                        placeholder='{"borderRadius":8}'
                        className="w-28 text-xs font-mono"
                        value={(() => {
                          const s = (b.config as Record<string, unknown>)?.style;
                          return s && typeof s === 'object' ? JSON.stringify(s) : '';
                        })()}
                        onChange={(e) => setBlockStyle(idx, e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeBlock(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
