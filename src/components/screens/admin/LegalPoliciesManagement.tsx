import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  Pencil,
  FileText,
  Shield,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface LegalConfig {
  _id?: string;
  loginLegal: {
    preamble: string;
    terms: { label: string; type: 'in_app' | 'url'; url: string | null };
    privacy: { label: string; type: 'in_app' | 'url'; url: string | null };
    connector: string;
  };
}

export function LegalPoliciesManagement() {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Partial<LegalDoc> | null>(null);
  const [previewDoc, setPreviewDoc] = useState<LegalDoc | null>(null);

  const [config, setConfig] = useState<LegalConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configDirty, setConfigDirty] = useState(false);

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

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: LegalConfig }>(
        API_ENDPOINTS.customerLegal.config
      );
      setConfig(res.data ?? null);
      setConfigDirty(false);
    } catch {
      toast.error('Failed to load legal config');
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
    loadConfig();
  }, [loadDocs, loadConfig]);

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

  const saveConfig = async () => {
    if (!config) return;
    try {
      await apiRequest(API_ENDPOINTS.customerLegal.updateConfig, {
        method: 'PUT',
        body: JSON.stringify({ loginLegal: config.loginLegal }),
      });
      toast.success('Legal config updated');
      setConfigDirty(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save config');
    }
  };

  const updateLoginLegal = (path: string, value: any) => {
    if (!config) return;
    const updated = { ...config, loginLegal: { ...config.loginLegal } };
    const parts = path.split('.');
    let target: any = updated.loginLegal;
    for (let i = 0; i < parts.length - 1; i++) {
      target[parts[i]] = { ...target[parts[i]] };
      target = target[parts[i]];
    }
    target[parts[parts.length - 1]] = value;
    setConfig(updated);
    setConfigDirty(true);
  };

  const termsDocs = docs.filter(d => d.type === 'terms');
  const privacyDocs = docs.filter(d => d.type === 'privacy');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Legal & Policies</h1>
          <p className="text-[#71717a] text-sm">
            Manage Terms of Service and Privacy Policy content displayed in the customer app
          </p>
        </div>
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="w-4 h-4" /> Documents
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5">
            <Shield className="w-4 h-4" /> Login Legal Config
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Legal Documents</CardTitle>
                <CardDescription>
                  Create and manage versioned Terms of Service and Privacy Policy documents.
                  The document marked as "Current" is what customers see in the app.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadDocs}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                </Button>
                <Button size="sm" onClick={() => { setEditing({ type: 'terms', contentFormat: 'plain', isCurrent: true }); setDialog(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> New Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : docs.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">No legal documents yet.</p>
                  <p className="text-xs text-muted-foreground">
                    Create your first Terms of Service or Privacy Policy document to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Terms of Service Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Terms of Service ({termsDocs.length})
                    </h3>
                    {termsDocs.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No terms documents yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Version</TableHead>
                            <TableHead>Format</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead className="w-28"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {termsDocs.map(d => (
                            <TableRow key={d._id}>
                              <TableCell className="font-medium">{d.title}</TableCell>
                              <TableCell>v{d.version}</TableCell>
                              <TableCell><Badge variant="outline">{d.contentFormat}</Badge></TableCell>
                              <TableCell>
                                {d.isCurrent ? (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Current</Badge>
                                ) : (
                                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setCurrent(d._id)}>
                                    Set Current
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell>{d.lastUpdated ? new Date(d.lastUpdated).toLocaleDateString() : '—'}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => setPreviewDoc(d)} title="Preview">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => { setEditing(d); setDialog(true); }} title="Edit">
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
                    )}
                  </div>

                  {/* Privacy Policy Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Privacy Policy ({privacyDocs.length})
                    </h3>
                    {privacyDocs.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No privacy documents yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Version</TableHead>
                            <TableHead>Format</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead className="w-28"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {privacyDocs.map(d => (
                            <TableRow key={d._id}>
                              <TableCell className="font-medium">{d.title}</TableCell>
                              <TableCell>v{d.version}</TableCell>
                              <TableCell><Badge variant="outline">{d.contentFormat}</Badge></TableCell>
                              <TableCell>
                                {d.isCurrent ? (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Current</Badge>
                                ) : (
                                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setCurrent(d._id)}>
                                    Set Current
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell>{d.lastUpdated ? new Date(d.lastUpdated).toLocaleDateString() : '—'}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => setPreviewDoc(d)} title="Preview">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => { setEditing(d); setDialog(true); }} title="Edit">
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
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Login Screen Legal Configuration</CardTitle>
              <CardDescription>
                Configure how the Terms of Service and Privacy Policy links appear on the customer app login screen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : !config ? (
                <p className="text-center text-muted-foreground py-8">No config found. It will be auto-created on first server startup.</p>
              ) : (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <Label>Preamble Text</Label>
                    <Input
                      value={config.loginLegal.preamble}
                      onChange={e => updateLoginLegal('preamble', e.target.value)}
                      placeholder="By continuing, you agree to our "
                    />
                    <p className="text-xs text-muted-foreground mt-1">Text shown before the legal links on the login screen</p>
                  </div>

                  <div>
                    <Label>Connector Text</Label>
                    <Input
                      value={config.loginLegal.connector}
                      onChange={e => updateLoginLegal('connector', e.target.value)}
                      placeholder=" and "
                    />
                    <p className="text-xs text-muted-foreground mt-1">Text shown between the Terms and Privacy links</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h4 className="font-semibold text-sm">Terms of Service Link</h4>
                      <div>
                        <Label>Label</Label>
                        <Input
                          value={config.loginLegal.terms.label}
                          onChange={e => updateLoginLegal('terms.label', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Link Type</Label>
                        <Select value={config.loginLegal.terms.type} onValueChange={v => updateLoginLegal('terms.type', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in_app">In-App Screen</SelectItem>
                            <SelectItem value="url">External URL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {config.loginLegal.terms.type === 'url' && (
                        <div>
                          <Label>URL</Label>
                          <Input
                            value={config.loginLegal.terms.url || ''}
                            onChange={e => updateLoginLegal('terms.url', e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 p-4 border rounded-lg">
                      <h4 className="font-semibold text-sm">Privacy Policy Link</h4>
                      <div>
                        <Label>Label</Label>
                        <Input
                          value={config.loginLegal.privacy.label}
                          onChange={e => updateLoginLegal('privacy.label', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Link Type</Label>
                        <Select value={config.loginLegal.privacy.type} onValueChange={v => updateLoginLegal('privacy.type', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in_app">In-App Screen</SelectItem>
                            <SelectItem value="url">External URL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {config.loginLegal.privacy.type === 'url' && (
                        <div>
                          <Label>URL</Label>
                          <Input
                            value={config.loginLegal.privacy.url || ''}
                            onChange={e => updateLoginLegal('privacy.url', e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-1">Preview</p>
                    <p className="text-sm text-muted-foreground">
                      {config.loginLegal.preamble}
                      <span className="text-blue-600 underline">{config.loginLegal.terms.label}</span>
                      {config.loginLegal.connector}
                      <span className="text-blue-600 underline">{config.loginLegal.privacy.label}</span>
                    </p>
                  </div>

                  <Button onClick={saveConfig} disabled={!configDirty}>
                    Save Configuration
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
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
                  <Select value={editing.type || 'terms'} onValueChange={v => setEditing({ ...editing, type: v as 'terms' | 'privacy' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="terms">Terms of Service</SelectItem>
                      <SelectItem value="privacy">Privacy Policy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Version</Label>
                  <Input value={editing.version || ''} onChange={e => setEditing({ ...editing, version: e.target.value })} placeholder="e.g. 1.0" />
                </div>
                <div>
                  <Label>Content Format</Label>
                  <Select value={editing.contentFormat || 'plain'} onValueChange={v => setEditing({ ...editing, contentFormat: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Terms of Service" />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea rows={14} value={editing.content || ''} onChange={e => setEditing({ ...editing, content: e.target.value })} placeholder="Enter the full document content..." />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.isCurrent !== false} onCheckedChange={v => setEditing({ ...editing, isCurrent: v })} />
                <Label>Set as Current Version (customers will see this)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={saveDoc}>Save Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewDoc?.title || 'Preview'}</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="space-y-3">
              <div className="flex gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{previewDoc.type === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</Badge>
                <span>v{previewDoc.version}</span>
                <span>·</span>
                <span>{previewDoc.contentFormat}</span>
                {previewDoc.isCurrent && <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Current</Badge>}
              </div>
              <div className="border rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                {previewDoc.contentFormat === 'html' ? (
                  <div dangerouslySetInnerHTML={{ __html: previewDoc.content }} className="prose prose-sm max-w-none" />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm font-sans">{previewDoc.content}</pre>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDoc(null)}>Close</Button>
            <Button onClick={() => { if (previewDoc) { setEditing(previewDoc); setPreviewDoc(null); setDialog(true); } }}>
              Edit Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
