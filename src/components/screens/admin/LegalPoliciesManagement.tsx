import React, { useCallback, useEffect, useState } from 'react';
import { Eye, FileText, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

export function LegalPoliciesManagement() {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Partial<LegalDoc> | null>(null);
  const [previewDoc, setPreviewDoc] = useState<LegalDoc | null>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: LegalDoc[] }>(
        API_ENDPOINTS.customerLegal.documents
      );
      setDocs(res.data ?? []);
    } catch {
      toast.error('Failed to load legal documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const saveDoc = async () => {
    if (!editing) return;
    try {
      if (editing._id) {
        await apiRequest(API_ENDPOINTS.customerLegal.updateDocument(editing._id), {
          method: 'PUT',
          body: JSON.stringify(editing),
        });
        toast.success('Document updated');
      } else {
        await apiRequest(API_ENDPOINTS.customerLegal.createDocument, {
          method: 'POST',
          body: JSON.stringify(editing),
        });
        toast.success('Document created');
      }
      setDialog(false);
      setEditing(null);
      loadDocs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save document');
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
    try {
      await apiRequest(API_ENDPOINTS.customerLegal.setCurrentDocument(id), { method: 'POST' });
      toast.success('Set as current version');
      loadDocs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to set current');
    }
  };

  const termsDocs = docs.filter(d => d.type === 'terms');
  const privacyDocs = docs.filter(d => d.type === 'privacy');
  const allDocs = [...termsDocs, ...privacyDocs];
  const currentDocsCount = docs.filter(d => d.isCurrent).length;

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
                            {d.isCurrent ? (
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
                              <Button variant="ghost" size="icon" onClick={() => setPreviewDoc(d)} title="Preview">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditing(d);
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

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?._id ? 'Edit Document' : 'New Legal Document'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={editing.type || 'terms'}
                    onValueChange={v => setEditing({ ...editing, type: v as 'terms' | 'privacy' })}
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
                  <Label>Version</Label>
                  <Input
                    value={editing.version || ''}
                    onChange={e => setEditing({ ...editing, version: e.target.value })}
                    placeholder="e.g. 1.0"
                  />
                </div>
                <div>
                  <Label>Content Format</Label>
                  <Select
                    value={editing.contentFormat || 'plain'}
                    onValueChange={v => setEditing({ ...editing, contentFormat: v })}
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
                </div>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={editing.title || ''}
                  onChange={e => setEditing({ ...editing, title: e.target.value })}
                  placeholder="e.g. Terms of Service"
                />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  rows={14}
                  value={editing.content || ''}
                  onChange={e => setEditing({ ...editing, content: e.target.value })}
                  placeholder="Enter the full document content..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.isCurrent !== false}
                  onCheckedChange={v => setEditing({ ...editing, isCurrent: v })}
                />
                <Label>Set as Current Version (apps will use this)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveDoc}>Save Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewDoc?.title || 'Preview'}</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="space-y-3">
              <div className="flex gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">
                  {previewDoc.type === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                </Badge>
                <span>v{previewDoc.version}</span>
                <span>·</span>
                <span>{previewDoc.contentFormat}</span>
                {previewDoc.isCurrent && (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Current</Badge>
                )}
              </div>
              <div className="border rounded-lg p-4 max-h-[60vh] overflow-y-auto">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDoc(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewDoc) {
                  setEditing(previewDoc);
                  setPreviewDoc(null);
                  setDialog(true);
                }
              }}
            >
              Edit Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
