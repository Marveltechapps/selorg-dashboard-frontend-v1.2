import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Eye,
  EyeOff,
  GripVertical,
  Smartphone,
  ChevronRight,
  RefreshCw,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  type OnboardingScreen,
  fetchOnboardingScreens,
  createOnboardingScreen,
  updateOnboardingScreen,
  deleteOnboardingScreen,
  reorderOnboardingScreens,
} from './appCmsApi';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';

type FormData = {
  title: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
};

const emptyForm: FormData = {
  title: '',
  description: '',
  imageUrl: '',
  isActive: true,
};

export function OnboardingManagement() {
  const [screens, setScreens] = useState<OnboardingScreen[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<OnboardingScreen | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOnboardingScreens();
      setScreens(data.sort((a, b) => a.position - b.position));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load onboarding pages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (s: OnboardingScreen) => {
    setEditingId(s.id);
    setForm({
      title: s.title,
      description: s.description,
      imageUrl: s.imageUrl,
      isActive: s.isActive,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateOnboardingScreen(editingId, form);
        toast.success('Onboarding page updated');
      } else {
        await createOnboardingScreen(form);
        toast.success('Onboarding page created');
      }
      setShowForm(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteOnboardingScreen(deleteTarget.id);
      toast.success('Onboarding page deleted');
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (s: OnboardingScreen) => {
    try {
      await updateOnboardingScreen(s.id, { isActive: !s.isActive });
      toast.success(`Page ${!s.isActive ? 'activated' : 'deactivated'}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to toggle status');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newScreens = [...screens];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newScreens.length) return;
    [newScreens[index], newScreens[swapIndex]] = [newScreens[swapIndex], newScreens[index]];
    setScreens(newScreens);
    try {
      const orderedIds = newScreens.map((s) => s.id);
      await reorderOnboardingScreens(orderedIds);
      toast.success('Order updated');
    } catch (e) {
      toast.error('Failed to reorder');
      await load();
    }
  };

  const activeScreens = screens.filter((s) => s.isActive);

  if (loading && screens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading onboarding pages…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Onboarding Screens</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the onboarding pages shown to new customers in the app.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
          {activeScreens.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPreviewIndex(0); setShowPreview(true); }}
            >
              <Smartphone className="h-4 w-4" />
              <span className="ml-2">Preview</span>
            </Button>
          )}
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            <span className="ml-2">Add Page</span>
          </Button>
        </div>
      </div>

      {/* Main layout: table + live preview */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Table */}
        <div className="flex-1 min-w-0">
          {screens.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed border-border rounded-xl p-12 bg-white">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-[#18181b] mb-1">No onboarding pages yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first onboarding page to guide new customers.
              </p>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Page
              </Button>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="w-24 text-center">Status</TableHead>
                    <TableHead className="w-20 text-center">Order</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {screens.map((s, idx) => (
                    <TableRow key={s.id} className="group">
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                          {idx + 1}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {s.imageUrl ? (
                            <ImageWithFallback
                              src={s.imageUrl}
                              alt={s.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-[#18181b]">{s.title}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground line-clamp-2 max-w-[300px]">
                          {s.description}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleToggleActive(s)}
                          className="inline-flex"
                          title={s.isActive ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <Badge variant={s.isActive ? 'default' : 'secondary'}>
                            {s.isActive ? (
                              <><Eye className="h-3 w-3 mr-1" /> Active</>
                            ) : (
                              <><EyeOff className="h-3 w-3 mr-1" /> Inactive</>
                            )}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={idx === 0}
                            onClick={() => handleMove(idx, 'up')}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={idx === screens.length - 1}
                            onClick={() => handleMove(idx, 'down')}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(s)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Live Phone Preview - side panel */}
        {activeScreens.length > 0 && (
          <div className="hidden xl:flex flex-col items-center flex-shrink-0">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Live Preview</h3>
            <PhonePreview
              screens={activeScreens}
              currentIndex={previewIndex}
              onChangeIndex={setPreviewIndex}
            />
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Onboarding Page' : 'Add Onboarding Page'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the onboarding page details below.'
                : 'Fill in the details for the new onboarding page.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ob-title">Title *</Label>
              <Input
                id="ob-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Welcome to Selorg Organic"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-desc">Description *</Label>
              <Textarea
                id="ob-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Get fresh organic groceries delivered to your door"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-img">Image URL</Label>
              <Input
                id="ob-img"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://..."
              />
              {form.imageUrl && (
                <div className="w-full h-32 rounded-lg border border-border overflow-hidden bg-muted">
                  <ImageWithFallback
                    src={form.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="ob-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
              <Label htmlFor="ob-active">Active (visible in app)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Save Changes' : 'Create Page'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Onboarding Page</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;? This action
              cannot be undone. Remaining pages will be renumbered automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full-screen Phone Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-transparent border-0 shadow-none">
          <div className="flex flex-col items-center py-6">
            <PhonePreview
              screens={activeScreens}
              currentIndex={previewIndex}
              onChangeIndex={setPreviewIndex}
              large
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhonePreview({
  screens,
  currentIndex,
  onChangeIndex,
  large = false,
}: {
  screens: OnboardingScreen[];
  currentIndex: number;
  onChangeIndex: (i: number) => void;
  large?: boolean;
}) {
  const s = screens[currentIndex] ?? screens[0];
  if (!s) return null;
  const width = large ? 320 : 260;
  const height = large ? 640 : 520;

  return (
    <div
      className="relative rounded-[2rem] border-[5px] border-[#27272a] overflow-hidden bg-[#F5F5F5] shadow-2xl"
      style={{ width, height }}
    >
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-[#27272a] rounded-b-xl z-20" />

      <div className="flex flex-col h-full">
        {/* Image area */}
        <div
          className="relative flex-1 bg-[#034703] flex items-center justify-center overflow-hidden"
          style={{ minHeight: height * 0.55 }}
        >
          {s.imageUrl ? (
            <ImageWithFallback
              src={s.imageUrl}
              alt={s.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-white/60">
              <ImageIcon className="h-12 w-12" />
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="bg-white px-5 py-4 flex flex-col gap-2">
          <h3
            className="font-bold text-[#18181b] leading-tight"
            style={{ fontSize: large ? 18 : 14 }}
          >
            {s.title}
          </h3>
          <p
            className="text-muted-foreground leading-snug"
            style={{ fontSize: large ? 13 : 11 }}
          >
            {s.description}
          </p>

          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {screens.map((_, idx) => (
              <button
                key={idx}
                onClick={() => onChangeIndex(idx)}
                className={`rounded-full transition-all ${
                  idx === currentIndex
                    ? 'bg-[#034703] w-5 h-2'
                    : 'bg-[#d4d4d8] w-2 h-2 hover:bg-[#a1a1aa]'
                }`}
              />
            ))}
          </div>

          {/* Navigation arrows */}
          {screens.length > 1 && (
            <div className="flex items-center justify-between mt-1">
              <button
                onClick={() => onChangeIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="text-xs text-muted-foreground hover:text-[#18181b] disabled:opacity-30"
              >
                ← Back
              </button>
              <button
                onClick={() => onChangeIndex(Math.min(screens.length - 1, currentIndex + 1))}
                disabled={currentIndex === screens.length - 1}
                className="text-xs font-medium text-[#034703] hover:text-[#023602] disabled:opacity-30 flex items-center gap-0.5"
              >
                Next <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
