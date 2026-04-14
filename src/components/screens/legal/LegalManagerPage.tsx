import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  RefreshCcw,
  Trash2,
  CheckCircle2,
  Clock,
  Eye,
  Pencil,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import {
  listLegalDocs,
  createLegalDoc,
  updateLegalDoc,
  deleteLegalDoc,
  setCurrentLegalDoc,
  type AppTarget,
  type DocType,
  type LegalDocument,
} from '@/api/legal/legalApi';

function formatDisplayDate(value: string): string {
  if (!value) return '—';
  const d = value.length <= 10 ? parseISO(`${value}T12:00:00`) : parseISO(value);
  if (!isValid(d)) return value;
  return value.length <= 10 ? format(d, 'MMM d, yyyy') : format(d, 'MMM d, yyyy h:mm a');
}

export function LegalManagerPage() {
  const [activeApp, setActiveApp] = useState<AppTarget>('picker');
  const [activeType, setActiveType] = useState<DocType>('terms');
  const [docs, setDocs] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editDoc, setEditDoc] = useState<LegalDocument | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formVersion, setFormVersion] = useState('');
  const [formEffectiveDate, setFormEffectiveDate] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formIsCurrent, setFormIsCurrent] = useState(true);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listLegalDocs(activeApp, activeType);
      setDocs(data ?? []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load documents';
      toast.error(message);
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [activeApp, activeType]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  const openCreateModal = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const hasCurrent = docs.some((d) => d.isCurrent);
    setEditDoc(null);
    setFormTitle('');
    setFormVersion('');
    setFormEffectiveDate(today);
    setFormContent('');
    setFormIsCurrent(!hasCurrent);
    setShowForm(true);
  };

  const openEditModal = (doc: LegalDocument) => {
    setEditDoc(doc);
    const eff =
      doc.effectiveDate && doc.effectiveDate.length >= 10
        ? doc.effectiveDate.slice(0, 10)
        : format(new Date(), 'yyyy-MM-dd');
    setFormTitle(doc.title);
    setFormVersion(doc.version);
    setFormEffectiveDate(eff || format(new Date(), 'yyyy-MM-dd'));
    setFormContent(doc.content);
    setFormIsCurrent(doc.isCurrent);
    setShowForm(true);
  };

  const closeFormModal = (open: boolean) => {
    setShowForm(open);
    if (!open) {
      setEditDoc(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editDoc) {
        await updateLegalDoc(activeApp, editDoc._id, {
          title: formTitle,
          version: formVersion,
          effectiveDate: formEffectiveDate,
          lastUpdated: new Date().toISOString(),
          contentFormat: editDoc.contentFormat,
          content: formContent,
          isCurrent: formIsCurrent,
        });
        toast.success('Document updated');
      } else {
        await createLegalDoc(activeApp, {
          type: activeType,
          version: formVersion,
          title: formTitle,
          effectiveDate: formEffectiveDate,
          lastUpdated: new Date().toISOString(),
          contentFormat: 'plain',
          content: formContent,
          isCurrent: formIsCurrent,
        });
        toast.success('Document created');
      }
      setShowForm(false);
      setEditDoc(null);
      await loadDocs();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Save failed';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await setCurrentLegalDoc(activeApp, id);
      toast.success('Version is now live');
      await loadDocs();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Publish failed';
      toast.error(message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deleteLegalDoc(activeApp, deleteId);
      toast.success('Document deleted');
      setDeleteId(null);
      await loadDocs();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const appTabs: { id: AppTarget; label: string }[] = [
    { id: 'picker', label: 'Picker' },
    { id: 'customer', label: 'Customer' },
    { id: 'rider', label: 'Rider' },
  ];

  const typeTabs: { id: DocType; label: string }[] = [
    { id: 'terms', label: 'Terms & Conditions' },
    { id: 'privacy', label: 'Privacy Policy' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* A) Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Legal Document Manager</h1>
          <p className="text-[#757575] text-sm max-w-2xl">
            Manage Terms & Conditions and Privacy Policy for each app. Publishing a version sets it
            live immediately.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => void loadDocs()} disabled={loading}>
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button
            className="bg-[#5B4EFF] hover:bg-[#4a3fee] text-white"
            onClick={openCreateModal}
          >
            <Plus size={16} className="mr-2" />
            New Version
          </Button>
        </div>
      </div>

      {/* B) Filter bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {appTabs.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              variant={activeApp === tab.id ? 'default' : 'outline'}
              size="sm"
              className={
                activeApp === tab.id
                  ? 'bg-[#5B4EFF] text-white hover:bg-[#4a3fee] border-transparent'
                  : ''
              }
              onClick={() => setActiveApp(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {typeTabs.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              variant={activeType === tab.id ? 'default' : 'outline'}
              size="sm"
              className={
                activeType === tab.id
                  ? 'bg-[#5B4EFF] text-white hover:bg-[#4a3fee] border-transparent'
                  : ''
              }
              onClick={() => setActiveType(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* C) Documents table */}
      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
          <h3 className="font-bold text-[#212121]">Documents</h3>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-12 w-full rounded-md bg-[#E0E0E0] animate-pulse"
                  aria-hidden
                />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-[#757575]">
              <div className="flex items-center gap-2 mb-3 text-[#9E9E9E]">
                <FileText className="size-10" strokeWidth={1.25} />
                <Eye className="size-8 opacity-60" strokeWidth={1.25} />
              </div>
              <p className="text-sm">No documents yet. Create your first version.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E0E0E0] bg-[#FAFAFA] text-left text-[#757575]">
                  <th className="px-4 py-3 font-semibold">Version</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Effective Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Last Updated</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc._id} className="border-b border-[#E0E0E0] last:border-0">
                    <td className="px-4 py-3 font-mono text-[#212121]">{doc.version}</td>
                    <td className="px-4 py-3 text-[#212121]">{doc.title}</td>
                    <td className="px-4 py-3 text-[#424242]">{formatDisplayDate(doc.effectiveDate)}</td>
                    <td className="px-4 py-3">
                      {doc.isCurrent ? (
                        <Badge className="border-transparent bg-emerald-600 text-white gap-1">
                          <CheckCircle2 className="size-3" />
                          Live
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-[#616161]">
                          <Clock className="size-3" />
                          Draft
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#424242]">{formatDisplayDate(doc.lastUpdated)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end items-center gap-2 flex-wrap">
                        {!doc.isCurrent && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-[#5B4EFF] text-[#5B4EFF] hover:bg-[#5B4EFF]/10"
                            onClick={() => void handlePublish(doc._id)}
                          >
                            Publish
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label="Edit document"
                          onClick={() => openEditModal(doc)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label="Delete document"
                          onClick={() => setDeleteId(doc._id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* D) Form modal */}
      <Dialog open={showForm} onOpenChange={closeFormModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDoc ? 'Edit Document' : 'New Version'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#212121]">Title</label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#212121]">Version</label>
              <Input
                value={formVersion}
                onChange={(e) => setFormVersion(e.target.value)}
                placeholder="e.g. 1.0.0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#212121]">Effective Date</label>
              <Input
                type="date"
                value={formEffectiveDate}
                onChange={(e) => setFormEffectiveDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#212121]">Content</label>
              <Textarea
                rows={12}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Paste your document content here..."
                className="font-mono text-sm min-h-[240px]"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formIsCurrent}
                onCheckedChange={(v) => setFormIsCurrent(v === true)}
              />
              <span className="text-sm text-[#212121]">Set as current (live) version</span>
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => closeFormModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#5B4EFF] hover:bg-[#4a3fee] text-white"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* E) Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && !saving && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete version?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#757575]">
            Are you sure you want to delete this version? This cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
