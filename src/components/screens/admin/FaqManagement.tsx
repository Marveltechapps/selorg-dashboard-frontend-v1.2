import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  Pencil,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
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
import { apiRequest } from '@/api/apiClient';
import { API_ENDPOINTS } from '@/config/api';

interface FaqItem {
  _id: string;
  question: string;
  answer: string;
  order: number;
  category: string;
  isActive: boolean;
}

export function FaqManagement() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Partial<FaqItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: FaqItem[] }>(
        API_ENDPOINTS.customerFaq.list
      );
      setItems((res.data ?? []).sort((a, b) => a.order - b.order));
    } catch {
      toast.error('Failed to load FAQ');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing({
      question: '',
      answer: '',
      order: items.length > 0 ? Math.max(...items.map((i) => i.order)) + 1 : 0,
      category: '',
      isActive: true,
    });
    setDialog(true);
  };

  const openEdit = (item: FaqItem) => {
    setEditing({ ...item });
    setDialog(true);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing._id) {
        await apiRequest(API_ENDPOINTS.customerFaq.update(editing._id), {
          method: 'PUT',
          body: JSON.stringify({
            question: editing.question,
            answer: editing.answer,
            order: editing.order,
            category: editing.category,
            isActive: editing.isActive,
          }),
        });
        toast.success('FAQ updated');
      } else {
        await apiRequest(API_ENDPOINTS.customerFaq.create, {
          method: 'POST',
          body: JSON.stringify({
            question: editing.question,
            answer: editing.answer,
            order: editing.order ?? 0,
            category: editing.category ?? '',
            isActive: editing.isActive !== false,
          }),
        });
        toast.success('FAQ created');
      }
      setDialog(false);
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(API_ENDPOINTS.customerFaq.delete(deleteTarget._id), {
        method: 'DELETE',
      });
      toast.success('FAQ deleted');
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18181b]">FAQ Management</h1>
        <p className="text-[#71717a] mt-1">
          Manage Frequently Asked Questions displayed in the Customer app
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>FAQ Items</CardTitle>
            <CardDescription>Create and edit FAQ questions and answers</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> New FAQ
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#71717a]" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#e4e4e7] rounded-lg">
              <HelpCircle className="w-12 h-12 mx-auto text-[#a1a1aa] mb-3" />
              <p className="text-[#71717a] font-medium">No FAQ items yet</p>
              <p className="text-sm text-[#a1a1aa] mt-1">Add your first FAQ to get started</p>
              <Button size="sm" className="mt-4" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" /> Add FAQ
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell className="font-mono text-sm">{item.order}</TableCell>
                    <TableCell className="max-w-xs truncate" title={item.question}>
                      {item.question}
                    </TableCell>
                    <TableCell>{item.category || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? 'default' : 'secondary'}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(item)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialog} onOpenChange={(v) => { if (!v) setEditing(null); setDialog(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?._id ? 'Edit FAQ' : 'New FAQ'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Question</Label>
                <Input
                  value={editing.question ?? ''}
                  onChange={(e) => setEditing({ ...editing, question: e.target.value })}
                  placeholder="e.g. How fast is delivery?"
                />
              </div>
              <div>
                <Label>Answer</Label>
                <Textarea
                  rows={4}
                  value={editing.answer ?? ''}
                  onChange={(e) => setEditing({ ...editing, answer: e.target.value })}
                  placeholder="e.g. We deliver in 10-15 minutes..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Order</Label>
                  <Input
                    type="number"
                    value={editing.order ?? 0}
                    onChange={(e) => setEditing({ ...editing, order: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
                <div>
                  <Label>Category (optional)</Label>
                  <Input
                    value={editing.category ?? ''}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    placeholder="e.g. Delivery"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.isActive !== false}
                  onCheckedChange={(v) => setEditing({ ...editing, isActive: v })}
                />
                <Label>Active (visible in app)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !editing?.question?.trim() || !editing?.answer?.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete FAQ</DialogTitle>
            <p className="text-sm text-[#71717a]">
              Are you sure you want to delete this FAQ? This cannot be undone.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
