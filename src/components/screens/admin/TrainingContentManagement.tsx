import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Video,
  Loader2,
  Eye,
  EyeOff,
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
  type TrainingVideo,
  type TrainingVideoFormData,
  fetchTrainingVideos,
  createTrainingVideo,
  updateTrainingVideo,
  deleteTrainingVideo,
} from './trainingVideoAdminApi';

const emptyForm: TrainingVideoFormData = {
  videoId: '',
  title: '',
  description: '',
  duration: 300,
  durationDisplay: '5 min',
  videoUrl: '',
  thumbnailUrl: '',
  order: 0,
  minimumWatchPercentage: 80,
  isActive: true,
};

function durationSecondsToDisplay(sec: number): string {
  if (sec < 60) return `${sec} sec`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m} min ${s} sec` : `${m} min`;
}

export function TrainingContentManagement() {
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TrainingVideoFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<TrainingVideo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTrainingVideos();
      setVideos(data.sort((a, b) => a.order - b.order));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load training videos');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      order: videos.length > 0 ? Math.max(...videos.map((v) => v.order)) + 1 : 1,
    });
    setShowForm(true);
  };

  const openEdit = (v: TrainingVideo) => {
    setEditingId(v._id);
    setForm({
      videoId: v.videoId,
      title: v.title,
      description: v.description ?? '',
      duration: v.duration,
      durationDisplay: v.durationDisplay,
      videoUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailUrl ?? '',
      order: v.order,
      minimumWatchPercentage: v.minimumWatchPercentage ?? 80,
      isActive: v.isActive,
    });
    setShowForm(true);
  };

  const handleDurationChange = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    setForm((prev) => ({
      ...prev,
      duration: num,
      durationDisplay: durationSecondsToDisplay(num),
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.videoUrl.trim()) {
      toast.error('Title and video URL are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        duration: form.duration || 300,
        durationDisplay: form.durationDisplay || durationSecondsToDisplay(form.duration || 300),
        order: form.order ?? 0,
        minimumWatchPercentage: form.minimumWatchPercentage ?? 80,
      };
      if (editingId) {
        await updateTrainingVideo(editingId, payload);
        toast.success('Training video updated');
      } else {
        const videoId = form.videoId?.trim() || `video${Date.now()}`;
        await createTrainingVideo({ ...payload, videoId });
        toast.success('Training video created');
      }
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTrainingVideo(deleteTarget._id);
      toast.success('Training video deleted');
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Training Content</h1>
          <p className="text-[#71717a] text-sm">
            Manage Picker app training videos (What is Picking?, HSD usage, Safety, etc.)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} />
            Add Video
          </Button>
        </div>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-[#71717a]" />
          </div>
        ) : videos.length === 0 ? (
          <div className="py-16 text-center text-[#71717a]">
            <Video size={48} className="mx-auto mb-4 text-[#d4d4d8]" />
            <p className="font-medium">No training videos yet</p>
            <p className="text-sm mt-1">Add a video to get started</p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus size={16} />
              Add Video
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f4f5]">
                <TableHead>Order</TableHead>
                <TableHead>Video ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Min Watch %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((v) => (
                <TableRow key={v._id} className="hover:bg-[#fafafa]">
                  <TableCell className="font-mono text-sm">{v.order}</TableCell>
                  <TableCell className="font-mono text-sm text-[#52525b]">{v.videoId}</TableCell>
                  <TableCell className="font-medium">{v.title}</TableCell>
                  <TableCell>{v.durationDisplay}</TableCell>
                  <TableCell>{v.minimumWatchPercentage ?? 80}%</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        v.isActive
                          ? 'bg-green-50 text-green-700 border-green-200 gap-1'
                          : 'bg-gray-50 text-gray-600 border-gray-200 gap-1'
                      }
                    >
                      {v.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                      {v.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => openEdit(v)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-red-600 hover:text-red-700"
                      onClick={() => setDeleteTarget(v)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Video' : 'Add Training Video'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update training video metadata. Changes apply to the Picker app.'
                : 'Create a new training video for the Picker app.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editingId && (
              <div>
                <Label>Video ID</Label>
                <Input
                  placeholder="e.g. video1"
                  value={form.videoId ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, videoId: e.target.value }))}
                />
                <p className="text-xs text-[#71717a] mt-1">
                  Leave blank to auto-generate
                </p>
              </div>
            )}
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="e.g. What is Picking?"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description"
                value={form.description ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (seconds)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.duration}
                  onChange={(e) => handleDurationChange(e.target.value)}
                />
              </div>
              <div>
                <Label>Order</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, order: parseInt(e.target.value, 10) || 0 }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Video URL *</Label>
              <Input
                placeholder="https://..."
                value={form.videoUrl}
                onChange={(e) => setForm((p) => ({ ...p, videoUrl: e.target.value }))}
              />
            </div>
            <div>
              <Label>Thumbnail URL</Label>
              <Input
                placeholder="https://... (optional)"
                value={form.thumbnailUrl ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, thumbnailUrl: e.target.value }))}
              />
            </div>
            <div>
              <Label>Min. watch % to complete</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.minimumWatchPercentage ?? 80}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    minimumWatchPercentage: Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 80)),
                  }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(c) => setForm((p) => ({ ...p, isActive: c }))}
              />
              <Label>Active (visible in Picker app)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin" />}
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => !deleting && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete training video</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 size={16} className="animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
