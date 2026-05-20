import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { AdminModal } from '@/components/screens/admin/modals/AdminModal';
import { AdminFormBody, AdminFormGrid, AdminField } from '@/components/screens/admin/modals/AdminForm';
import { toast } from 'sonner';
import { Loader2, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import {
  fetchPlatformConfigs,
  savePlatformConfig,
  deletePlatformConfig,
  type PlatformConfigRow,
} from './platformConfigApi';

function formatValue(v: unknown, valueType: string): string {
  if (valueType === 'json' && v !== null && typeof v === 'object') {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

export function PlatformConfigScreen() {
  const [rows, setRows] = useState<PlatformConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefix, setPrefix] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formType, setFormType] = useState<PlatformConfigRow['valueType']>('string');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPlatformConfigs(prefix || undefined);
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load configs');
    } finally {
      setLoading(false);
    }
  }, [prefix]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingKey(null);
    setFormKey('');
    setFormValue('');
    setFormType('string');
    setFormDescription('');
    setDialogOpen(true);
  }

  function openEdit(row: PlatformConfigRow) {
    setEditingKey(row.key);
    setFormKey(row.key);
    setFormValue(formatValue(row.value, row.valueType));
    setFormType(row.valueType || 'string');
    setFormDescription(row.description || '');
    setDialogOpen(true);
  }

  async function handleSave() {
    const key = editingKey ?? formKey.trim();
    if (!key) {
      toast.error('Key is required');
      return;
    }
    let parsedValue: unknown = formValue;
    if (formType === 'number') {
      parsedValue = Number(formValue);
      if (Number.isNaN(parsedValue)) {
        toast.error('Invalid number');
        return;
      }
    }
    if (formType === 'boolean') {
      const lower = formValue.trim().toLowerCase();
      if (!['true', 'false', '1', '0'].includes(lower)) {
        toast.error('Use true or false');
        return;
      }
      parsedValue = lower === 'true' || lower === '1';
    }
    if (formType === 'json') {
      try {
        parsedValue = JSON.parse(formValue);
      } catch {
        toast.error('Invalid JSON');
        return;
      }
    }

    setSaving(true);
    try {
      await savePlatformConfig(key, {
        value: parsedValue,
        valueType: formType,
        description: formDescription.trim() || undefined,
      });
      toast.success('Saved');
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(key: string) {
    if (!confirm(`Delete config "${key}"?`)) return;
    try {
      await deletePlatformConfig(key);
      toast.success('Deleted');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b] flex items-center gap-2">
            <SlidersHorizontal className="w-7 h-7 text-[#e11d48]" />
            Platform configuration
          </h1>
          <p className="text-[#71717a] text-sm mt-1">
            Operational tunables stored in MongoDB and cached in Redis (key prefix{' '}
            <code className="text-xs bg-[#f4f4f5] px-1 rounded">platform:cfg:v1:</code>). Use dotted keys
            such as <code className="text-xs">delivery.radius_km</code>.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Add key
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#71717a]">Filter by prefix</label>
          <Input
            placeholder="e.g. delivery"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className="w-[220px]"
          />
        </div>
        <Button variant="outline" type="button" onClick={() => load()} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16 text-[#71717a]">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-[#71717a] text-sm">
            No keys yet. Add delivery radius, surge multipliers, SLA targets, etc.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-mono text-sm">{row.key}</TableCell>
                  <TableCell>{row.valueType}</TableCell>
                  <TableCell className="max-w-[280px] truncate font-mono text-xs">
                    {formatValue(row.value, row.valueType)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-[#52525b] max-w-[200px] truncate">
                    {row.description || '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#e11d48]"
                      onClick={() => handleDelete(row.key)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AdminModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingKey ? 'Edit config' : 'New config key'}
        icon={<SlidersHorizontal className="h-5 w-5" />}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </>
        }
      >
        <AdminFormBody>
          <AdminField label="Key">
            <Input
              value={formKey}
              onChange={(e) => setFormKey(e.target.value)}
              disabled={!!editingKey}
              placeholder="delivery.radius_km"
              className="font-mono"
            />
          </AdminField>
          <AdminField label="Type">
            <Select value={formType} onValueChange={(v) => setFormType(v as PlatformConfigRow['valueType'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">string</SelectItem>
                <SelectItem value="number">number</SelectItem>
                <SelectItem value="boolean">boolean</SelectItem>
                <SelectItem value="json">json</SelectItem>
              </SelectContent>
            </Select>
          </AdminField>
          <AdminField label="Value">
            <Textarea
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              rows={formType === 'json' ? 8 : 3}
              className="font-mono text-sm"
              placeholder={formType === 'json' ? '{ "mode": "surge" }' : ''}
            />
          </AdminField>
          <AdminField label="Description (optional)">
            <Input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="What this controls"
            />
          </AdminField>
        </AdminFormBody>
      </AdminModal>
    </div>
  );
}
