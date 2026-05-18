import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  Pencil,
  Loader2,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const APP_TABS: { id: AppTarget; label: string }[] = [
  { id: 'picker', label: 'Picker' },
  { id: 'customer', label: 'Customer' },
  { id: 'rider', label: 'Rider' },
];

const TYPE_TABS: { id: DocType; label: string }[] = [
  { id: 'terms', label: 'Terms & Conditions' },
  { id: 'privacy', label: 'Privacy Policy' },
];

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

  const liveCount = useMemo(() => docs.filter((d) => d.isCurrent).length, [docs]);
  const draftCount = docs.length - liveCount;

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
    if (!open) setEditDoc(null);
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

  const activeAppLabel = APP_TABS.find((t) => t.id === activeApp)?.label ?? activeApp;
  const activeTypeLabel = TYPE_TABS.find((t) => t.id === activeType)?.label ?? activeType;

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Legal Documents</h1>
          <p className="text-[#71717a] text-sm mt-1">
            Manage Terms & Conditions and Privacy Policy for Picker, Customer, and Rider apps.
            Publishing a version sets it live immediately.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => void loadDocs()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin mr-1.5' : 'mr-1.5'} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreateModal}>
            <Plus size={14} className="mr-1.5" />
            New Version
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Active App</p>
            <Smartphone className="text-[#e11d48]" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{activeAppLabel}</p>
          <p className="text-xs text-[#71717a] mt-1">{activeTypeLabel}</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Versions</p>
            <FileText className="text-blue-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{docs.length}</p>
          <p className="text-xs text-[#71717a] mt-1">in current filter</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Live</p>
            <CheckCircle2 className="text-emerald-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{liveCount}</p>
          <p className="text-xs text-[#71717a] mt-1">published versions</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Drafts</p>
            <Clock className="text-amber-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{draftCount}</p>
          <p className="text-xs text-[#71717a] mt-1">awaiting publish</p>
        </div>
      </div>

      <Tabs
        value={activeApp}
        onValueChange={(v) => setActiveApp(v as AppTarget)}
        className="space-y-4 min-w-0"
      >
        <TabsList className="w-fit justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap px-[10px]">
          {APP_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="shrink-0">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {APP_TABS.map((appTab) => (
          <TabsContent key={appTab.id} value={appTab.id} className="space-y-4 mt-0">
            <Tabs
              value={activeType}
              onValueChange={(v) => setActiveType(v as DocType)}
              className="space-y-4"
            >
              <TabsList className="w-fit justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap px-[10px]">
                {TYPE_TABS.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="shrink-0">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {TYPE_TABS.map((typeTab) => (
                <TabsContent key={typeTab.id} value={typeTab.id} className="mt-0">
                  <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
                      <h3 className="font-bold text-[#18181b]">Documents</h3>
                      <p className="text-xs text-[#71717a] mt-1">
                        {appTab.label} · {typeTab.label}
                      </p>
                    </div>

                    {loading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-[#71717a]" />
                      </div>
                    ) : docs.length === 0 ? (
                      <div className="text-center py-12 space-y-3">
                        <FileText className="w-12 h-12 text-[#a1a1aa] mx-auto" />
                        <p className="text-[#71717a]">No documents yet.</p>
                        <p className="text-xs text-[#a1a1aa]">
                          Create your first version for this app and document type.
                        </p>
                        <Button size="sm" className="mt-2" onClick={openCreateModal}>
                          <Plus size={14} className="mr-1.5" />
                          New Version
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Version</TableHead>
                              <TableHead>Title</TableHead>
                              <TableHead>Effective Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Last Updated</TableHead>
                              <TableHead className="w-36 text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {docs.map((doc) => (
                              <TableRow key={doc._id}>
                                <TableCell className="font-mono text-sm">v{doc.version}</TableCell>
                                <TableCell className="font-medium">{doc.title}</TableCell>
                                <TableCell className="text-[#71717a]">
                                  {formatDisplayDate(doc.effectiveDate)}
                                </TableCell>
                                <TableCell>
                                  {doc.isCurrent ? (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                      Live
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[#71717a]">
                                      Draft
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-[#71717a]">
                                  {formatDisplayDate(doc.lastUpdated)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end items-center gap-1">
                                    {!doc.isCurrent && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs"
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
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={showForm} onOpenChange={closeFormModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDoc ? 'Edit Document' : 'New Version'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Version</Label>
                <Input
                  value={formVersion}
                  onChange={(e) => setFormVersion(e.target.value)}
                  placeholder="e.g. 1.0.0"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={formEffectiveDate}
                onChange={(e) => setFormEffectiveDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
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
              <span className="text-sm text-[#18181b]">Set as current (live) version</span>
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => closeFormModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
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

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && !saving && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete version?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#71717a]">
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