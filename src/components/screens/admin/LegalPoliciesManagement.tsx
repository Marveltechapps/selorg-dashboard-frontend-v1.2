import React, { useCallback, useEffect, useState } from 'react';
import { Eye, FileText, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AdminModal } from '@/components/screens/admin/modals/AdminModal';
import { adminFormClass } from '@/components/screens/admin/modals/adminFormLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { apiRequest } from '@/api/apiClient';
import { API_ENDPOINTS } from '@/config/api';

interface LegalDoc {
  _id: string;
  type: 'terms' | 'privacy';
  version: string;
  title: string;
  effectiveDate?: string;
  lastUpdated?: string;
  contentFormat: string;
  content: string;
  isCurrent: boolean;
}

function normalizeLegalDoc(raw: Record<string, unknown> | LegalDoc | null | undefined): LegalDoc {
  const doc = (raw ?? {}) as Record<string, unknown>;
  const idRaw = doc._id ?? doc.id;
  const _id = idRaw != null ? String(idRaw) : '';
  const isCurrent =
    doc.isCurrent === true || doc.isCurrent === 'true' || doc.isCurrent === 1;
  return {
    _id,
    type: doc.type === 'privacy' ? 'privacy' : 'terms',
    version: String(doc.version ?? ''),
    title: String(doc.title ?? ''),
    effectiveDate: doc.effectiveDate as string | undefined,
    lastUpdated: doc.lastUpdated as string | undefined,
    contentFormat: String(doc.contentFormat ?? 'plain'),
    content: String(doc.content ?? ''),
    isCurrent,
  };
}

/** Keep table status in sync when current version changes for a document type. */
function applyCurrentToDocList(
  docs: LegalDoc[],
  targetId: string,
  type: LegalDoc['type'],
  isCurrent: boolean
): LegalDoc[] {
  return docs.map((d) => {
    if (d.type !== type) return d;
    if (isCurrent) {
      return { ...d, isCurrent: d._id === targetId };
    }
    if (d._id === targetId) {
      return { ...d, isCurrent: false };
    }
    return d;
  });
}

export function LegalPoliciesManagement() {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Partial<LegalDoc> | null>(null);
  const [previewDoc, setPreviewDoc] = useState<LegalDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentToggleLoading, setCurrentToggleLoading] = useState(false);

  const syncEditingFromDocs = useCallback((list: LegalDoc[], docId?: string) => {
    if (!docId) return;
    const fresh = list.find((d) => d._id === docId);
    if (fresh) {
      setEditing(fresh);
    }
  }, []);

  const loadDocs = useCallback(
    async (opts?: { silent?: boolean }): Promise<LegalDoc[]> => {
      if (!opts?.silent) setLoading(true);
      try {
        const res = await apiRequest<{ success: boolean; data: Record<string, unknown>[] }>(
          API_ENDPOINTS.customerLegal.documents
        );
        const normalized = (res.data ?? []).map((d) => normalizeLegalDoc(d));
        setDocs(normalized);
        return normalized;
      } catch {
        toast.error('Failed to load legal documents');
        return [];
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const buildDocPayload = (doc: Partial<LegalDoc>) => ({
    type: doc.type || 'terms',
    version: doc.version?.trim() || '',
    title: doc.title?.trim() || '',
    effectiveDate: doc.effectiveDate || new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    contentFormat: doc.contentFormat || 'plain',
    content: doc.content?.trim() || '',
    isCurrent: doc.isCurrent === true,
  });

  const handleCurrentToggle = async (checked: boolean) => {
    const docId = editing?._id;
    const docType = editing?.type ?? 'terms';
    if (!docId) {
      setEditing((prev) => (prev ? { ...prev, isCurrent: checked } : null));
      return;
    }

    const previousDocs = docs;
    setDocs((prev) => applyCurrentToDocList(prev, docId, docType, checked));
    setEditing((prev) => (prev ? { ...prev, isCurrent: checked } : null));

    setCurrentToggleLoading(true);
    try {
      let updated: LegalDoc;
      if (checked) {
        const res = await apiRequest<{ success: boolean; data: Record<string, unknown> }>(
          API_ENDPOINTS.customerLegal.setCurrentDocument(docId),
          { method: 'POST' }
        );
        updated = normalizeLegalDoc(res.data);
        toast.success('Set as current version');
      } else {
        const res = await apiRequest<{ success: boolean; data: Record<string, unknown> }>(
          API_ENDPOINTS.customerLegal.updateDocument(docId),
          {
            method: 'PUT',
            body: JSON.stringify({ isCurrent: false }),
          }
        );
        updated = normalizeLegalDoc(res.data);
        toast.success('Removed from current version');
      }

      setDocs((prev) => applyCurrentToDocList(prev, docId, updated.type, checked));
      setEditing(updated);
      if (previewDoc?._id === docId) {
        setPreviewDoc(updated);
      }

      const fresh = await loadDocs({ silent: true });
      syncEditingFromDocs(fresh, docId);
      if (previewDoc?._id === docId) {
        const previewFresh = fresh.find((d) => d._id === docId);
        if (previewFresh) setPreviewDoc(previewFresh);
      }
    } catch (err: any) {
      setDocs(previousDocs);
      setEditing((prev) => {
        if (!prev) return null;
        const rollback = previousDocs.find((d) => d._id === docId);
        return rollback ?? { ...prev, isCurrent: !checked };
      });
      toast.error(err.message || 'Failed to update current version');
    } finally {
      setCurrentToggleLoading(false);
    }
  };

  const saveDoc = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editing) return;
    if (!editing.title?.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!editing.version?.trim()) {
      toast.error('Version is required');
      return;
    }
    if (!editing.content?.trim()) {
      toast.error('Content is required');
      return;
    }
    const payload = buildDocPayload(editing);
    setSaving(true);
    try {
      if (editing._id) {
        const res = await apiRequest<{ success: boolean; data: LegalDoc }>(
          API_ENDPOINTS.customerLegal.updateDocument(editing._id),
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          }
        );
        const updated = normalizeLegalDoc(res.data as Record<string, unknown>);
        if (payload.isCurrent) {
          await apiRequest(API_ENDPOINTS.customerLegal.setCurrentDocument(editing._id), {
            method: 'POST',
          });
          setDocs((prev) => applyCurrentToDocList(prev, editing._id, updated.type, true));
          toast.success('Document updated and set as current');
        } else {
          setDocs((prev) =>
            prev.map((d) => (d._id === editing._id ? { ...d, ...updated, isCurrent: false } : d))
          );
          toast.success('Document updated');
        }
      } else {
        const res = await apiRequest<{ success: boolean; data: Record<string, unknown> }>(
          API_ENDPOINTS.customerLegal.createDocument,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );
        const created = normalizeLegalDoc(res.data);
        if (payload.isCurrent && created._id) {
          await apiRequest(API_ENDPOINTS.customerLegal.setCurrentDocument(created._id), {
            method: 'POST',
          });
          setDocs((prev) => applyCurrentToDocList(prev, created._id, created.type, true));
        }
        toast.success(
          payload.isCurrent ? 'Document created and set as current' : 'Document created'
        );
      }
      setDialog(false);
      setEditing(null);
      await loadDocs({ silent: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const deleteDoc = async (id: string) => {
    try {
      await apiRequest(API_ENDPOINTS.customerLegal.deleteDocument(id), { method: 'DELETE' });
      toast.success('Document deleted');
      loadDocs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const setCurrent = async (id: string) => {
    const previousDocs = docs;
    const target = docs.find((d) => d._id === id);
    if (target) {
      setDocs((prev) => applyCurrentToDocList(prev, id, target.type, true));
    }
    try {
      const res = await apiRequest<{ success: boolean; data: Record<string, unknown> }>(
        API_ENDPOINTS.customerLegal.setCurrentDocument(id),
        { method: 'POST' }
      );
      const updated = normalizeLegalDoc(res.data);
      setDocs((prev) => applyCurrentToDocList(prev, id, updated.type, true));
      if (editing?._id === id) setEditing(updated);
      if (previewDoc?._id === id) setPreviewDoc(updated);
      toast.success('Set as current version');
      await loadDocs({ silent: true });
    } catch (err: any) {
      setDocs(previousDocs);
      toast.error(err.message || 'Failed to set current');
    }
  };

  const termsDocs = docs.filter(d => d.type === 'terms');
  const privacyDocs = docs.filter(d => d.type === 'privacy');
  const allDocs = [...termsDocs, ...privacyDocs];
  const currentDocsCount = docs.filter((d) => d.isCurrent === true).length;

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Legal & Policies</h1>
          <p className="text-[#71717a] text-sm">
            Manage legal documents for Terms of Service and Privacy Policy across apps
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Total Documents</p>
            <FileText className="text-[#e11d48]" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{docs.length}</p>
          <p className="text-xs text-[#71717a] mt-1">versioned docs</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Terms of Service</p>
            <FileText className="text-blue-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{termsDocs.length}</p>
          <p className="text-xs text-[#71717a] mt-1">terms versions</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Privacy Policy</p>
            <FileText className="text-emerald-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{privacyDocs.length}</p>
          <p className="text-xs text-[#71717a] mt-1">privacy versions</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Current in Apps</p>
            <Eye className="text-purple-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{currentDocsCount}</p>
          <p className="text-xs text-[#71717a] mt-1">active documents</p>
        </div>
      </div>

      <Tabs defaultValue="documents" className="space-y-4 min-w-0">
        <TabsList className="w-fit justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap px-[10px]">
          <TabsTrigger value="documents" className="shrink-0">
            <FileText size={14} className="mr-1.5" /> Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#18181b]">Documents</h3>
                <p className="text-xs text-[#71717a] mt-1">
                  Create and manage versioned Terms of Service and Privacy Policy documents.
                  The document marked as "Current" is what apps will display.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadDocs}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditing({ type: 'terms', contentFormat: 'plain', isCurrent: true });
                    setDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" /> New Document
                </Button>
              </div>
            </div>
            <div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : docs.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">No legal documents yet.</p>
                  <p className="text-xs text-muted-foreground">
                    Create your first Terms of Service or Privacy Policy document to get started.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="w-28"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allDocs.map(d => (
                        <TableRow key={d._id}>
                          <TableCell>
                            <Badge variant="secondary">
                              {d.type === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{d.title}</TableCell>
                          <TableCell>v{d.version}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{d.contentFormat}</Badge>
                          </TableCell>
                          <TableCell>
                            {d.isCurrent === true ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                Current
                              </Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => setCurrent(d._id)}
                              >
                                Set Current
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            {d.lastUpdated ? new Date(d.lastUpdated).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPreviewDoc(normalizeLegalDoc(d))}
                                title="Preview"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditing(normalizeLegalDoc(d));
                                  setDialog(true);
                                }}
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteDoc(d._id)} title="Delete">
                                <Trash2 className="w-4 h-4 text-destructive" />
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
          </div>
        </TabsContent>
      </Tabs>

      <AdminModal
        open={dialog}
        onOpenChange={(open) => {
          setDialog(open);
          if (!open) {
            setEditing(null);
            setSaving(false);
            setCurrentToggleLoading(false);
          }
        }}
        title={editing?._id ? 'Edit Document' : 'New Legal Document'}
        subtitle="Create or update a versioned Terms of Service or Privacy Policy"
        icon={<FileText className="h-5 w-5" />}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="legal-doc-form" disabled={saving}>
              {saving ? 'Saving...' : editing?._id ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        {editing && (
          <form id="legal-doc-form" onSubmit={saveDoc} className={adminFormClass}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Type *</Label>
                <Select
                  value={editing.type || 'terms'}
                  onValueChange={v =>
                    setEditing(prev => (prev ? { ...prev, type: v as 'terms' | 'privacy' } : null))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="terms">Terms of Service</SelectItem>
                    <SelectItem value="privacy">Privacy Policy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Version *</Label>
                <Input
                  value={editing.version || ''}
                  onChange={e =>
                    setEditing(prev => (prev ? { ...prev, version: e.target.value } : null))
                  }
                  placeholder="e.g. 1.0"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Content Format</Label>
                <Select
                  value={editing.contentFormat || 'plain'}
                  onValueChange={v =>
                    setEditing(prev => (prev ? { ...prev, contentFormat: v } : null))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plain">Plain Text</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="markdown">Markdown</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">How apps render this document</p>
              </div>
              <div>
                <Label>Title *</Label>
                <Input
                  value={editing.title || ''}
                  onChange={e =>
                    setEditing(prev => (prev ? { ...prev, title: e.target.value } : null))
                  }
                  placeholder="e.g. Terms of Service"
                />
              </div>
            </div>
            <div>
              <Label>Content *</Label>
              <Textarea
                rows={14}
                value={editing.content || ''}
                onChange={e =>
                  setEditing(prev => (prev ? { ...prev, content: e.target.value } : null))
                }
                placeholder="Enter the full document content..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="legal-doc-current"
                checked={editing.isCurrent === true}
                disabled={saving || currentToggleLoading}
                onCheckedChange={v => void handleCurrentToggle(v)}
              />
              <Label htmlFor="legal-doc-current" className="cursor-pointer">
                Set as Current Version (apps will use this)
                {currentToggleLoading && (
                  <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-[#6B7280]" />
                )}
              </Label>
            </div>
          </form>
        )}
      </AdminModal>

      <AdminModal
        open={!!previewDoc}
        onOpenChange={(open) => {
          if (!open) setPreviewDoc(null);
        }}
        title={previewDoc?.title || 'Document Preview'}
        subtitle={
          previewDoc
            ? `${previewDoc.type === 'terms' ? 'Terms of Service' : 'Privacy Policy'} · v${previewDoc.version}`
            : undefined
        }
        icon={<Eye className="h-5 w-5" />}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setPreviewDoc(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewDoc) {
                  setEditing(normalizeLegalDoc(previewDoc));
                  setPreviewDoc(null);
                  setDialog(true);
                }
              }}
            >
              Edit Document
            </Button>
          </>
        }
      >
        {previewDoc && (
          <div className={`${adminFormClass} space-y-3`}>
              <div className="flex gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">
                  {previewDoc.type === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                </Badge>
                <span>v{previewDoc.version}</span>
                <span>·</span>
                <span>{previewDoc.contentFormat}</span>
                {previewDoc.isCurrent === true && (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Current</Badge>
                )}
              </div>
              <div className="max-h-[50vh] overflow-y-auto rounded-lg border p-4">
                {previewDoc.contentFormat === 'html' ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: previewDoc.content }}
                    className="prose prose-sm max-w-none"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm font-sans">{previewDoc.content}</pre>
                )}
              </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
