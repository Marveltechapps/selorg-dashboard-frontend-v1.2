import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Save, Loader2, IndianRupee, MapPin, FileCheck, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  type PickerConfig,
  fetchPickerConfig,
  updatePickerConfig,
} from './pickerConfigApi';

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${bytes / (1024 * 1024)} MB`;
  if (bytes >= 1024) return `${bytes / 1024} KB`;
  return `${bytes} B`;
}

export function PickerConfigManagement() {
  const [config, setConfig] = useState<PickerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<PickerConfig>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPickerConfig();
      setConfig(data);
      setForm(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load Picker config');
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Partial<PickerConfig> = {
        basePayPerHour: Number(form.basePayPerHour) ?? config?.basePayPerHour,
        overtimeMultiplier: Number(form.overtimeMultiplier) ?? config?.overtimeMultiplier,
        currency: form.currency ?? config?.currency,
        shiftGeoRadiusKm: Number(form.shiftGeoRadiusKm) ?? config?.shiftGeoRadiusKm,
        walkInBufferMinutes: Number(form.walkInBufferMinutes) ?? config?.walkInBufferMinutes,
        defaultShiftDurationHours: Number(form.defaultShiftDurationHours) ?? config?.defaultShiftDurationHours,
        documentMaxSizeBytes: Number(form.documentMaxSizeBytes) || config?.documentMaxSizeBytes,
        documentMinDimensionPx: Number(form.documentMinDimensionPx) ?? config?.documentMinDimensionPx,
        documentAllowedExtensions: Array.isArray(form.documentAllowedExtensions)
          ? form.documentAllowedExtensions
          : (form.documentAllowedExtensions
              ? String(form.documentAllowedExtensions).split(',').map((x) => x.trim()).filter(Boolean)
              : config?.documentAllowedExtensions ?? []),
        heartbeatIntervalMs: Number(form.heartbeatIntervalMs) ?? config?.heartbeatIntervalMs,
        websocketTimeoutMs: Number(form.websocketTimeoutMs) ?? config?.websocketTimeoutMs,
        websocketReconnectionAttempts: Number(form.websocketReconnectionAttempts) ?? config?.websocketReconnectionAttempts,
        websocketReconnectionDelayMs: Number(form.websocketReconnectionDelayMs) ?? config?.websocketReconnectionDelayMs,
        websocketReconnectionDelayMaxMs: Number(form.websocketReconnectionDelayMaxMs) ?? config?.websocketReconnectionDelayMaxMs,
        defaultHubName: form.defaultHubName ?? config?.defaultHubName,
      };
      const updated = await updatePickerConfig(updates);
      setConfig(updated);
      setForm(updated);
      toast.success('Picker config saved successfully');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#e11d48]" />
      </div>
    );
  }

  const c = { ...config, ...form };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Picker App Config</h1>
          <p className="text-[#71717a] text-sm mt-1">
            Manage pay rates, geo-fence radius, document limits, and connection settings for the Picker app.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pay & Fees */}
        <div className="bg-white p-6 border border-[#e4e4e7] rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <IndianRupee className="w-5 h-5 text-[#e11d48]" />
            <h3 className="font-bold text-[#18181b]">Pay & Fees</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="basePayPerHour">Base Pay (₹/hour)</Label>
              <Input
                id="basePayPerHour"
                type="number"
                min={1}
                value={c.basePayPerHour ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, basePayPerHour: Number(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="overtimeMultiplier">Overtime Multiplier</Label>
              <Input
                id="overtimeMultiplier"
                type="number"
                step={0.05}
                min={1}
                value={c.overtimeMultiplier ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, overtimeMultiplier: Number(e.target.value) || 1 }))}
                className="mt-1"
              />
              <p className="text-xs text-[#71717a] mt-1">OT rate = base × multiplier (e.g. 1.25 = 25% extra)</p>
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={c.currency ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Operational Rules */}
        <div className="bg-white p-6 border border-[#e4e4e7] rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-[#e11d48]" />
            <h3 className="font-bold text-[#18181b]">Operational Rules</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="shiftGeoRadiusKm">Shift Geo Radius (km)</Label>
              <Input
                id="shiftGeoRadiusKm"
                type="number"
                min={1}
                max={50}
                value={c.shiftGeoRadiusKm ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, shiftGeoRadiusKm: Number(e.target.value) || 0 }))}
                className="mt-1"
              />
              <p className="text-xs text-[#71717a] mt-1">Radius for showing available shifts near picker</p>
            </div>
            <div>
              <Label htmlFor="walkInBufferMinutes">Walk-in Buffer (minutes)</Label>
              <Input
                id="walkInBufferMinutes"
                type="number"
                min={0}
                value={c.walkInBufferMinutes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, walkInBufferMinutes: Number(e.target.value) || 0 }))}
                className="mt-1"
              />
              <p className="text-xs text-[#71717a] mt-1">Allow arrival X minutes before/after shift start</p>
            </div>
            <div>
              <Label htmlFor="defaultShiftDurationHours">Default Shift Duration (hours)</Label>
              <Input
                id="defaultShiftDurationHours"
                type="number"
                min={1}
                max={24}
                value={c.defaultShiftDurationHours ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, defaultShiftDurationHours: Number(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="defaultHubName">Default Hub Name</Label>
              <Input
                id="defaultHubName"
                value={c.defaultHubName ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, defaultHubName: e.target.value }))}
                className="mt-1"
                placeholder="Downtown Hub"
              />
              <p className="text-xs text-[#71717a] mt-1">Shown on shift selection before location is set</p>
            </div>
          </div>
        </div>

        {/* Document Limits */}
        <div className="bg-white p-6 border border-[#e4e4e7] rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck className="w-5 h-5 text-[#e11d48]" />
            <h3 className="font-bold text-[#18181b]">Document Upload Limits</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="documentMaxSizeBytes">Max File Size (bytes)</Label>
              <Input
                id="documentMaxSizeBytes"
                type="number"
                min={1024}
                value={c.documentMaxSizeBytes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, documentMaxSizeBytes: Number(e.target.value) || 0 }))}
                className="mt-1"
                placeholder="10485760"
              />
              <p className="text-xs text-[#71717a] mt-1">
                {c.documentMaxSizeBytes ? formatBytes(c.documentMaxSizeBytes) : 'e.g. 10485760 = 10 MB'}
              </p>
            </div>
            <div>
              <Label htmlFor="documentMinDimensionPx">Min Image Dimension (px)</Label>
              <Input
                id="documentMinDimensionPx"
                type="number"
                min={100}
                value={c.documentMinDimensionPx ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, documentMinDimensionPx: Number(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="documentAllowedExtensions">Allowed Extensions (comma-separated)</Label>
              <Input
                id="documentAllowedExtensions"
                value={Array.isArray(c.documentAllowedExtensions) ? c.documentAllowedExtensions.join(', ') : ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    documentAllowedExtensions: e.target.value.split(',').map((x) => x.trim()).filter(Boolean),
                  }))
                }
                className="mt-1"
                placeholder=".jpg, .jpeg, .png, .pdf"
              />
            </div>
          </div>
        </div>

        {/* Connection Settings */}
        <div className="bg-white p-6 border border-[#e4e4e7] rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Wifi className="w-5 h-5 text-[#e11d48]" />
            <h3 className="font-bold text-[#18181b]">Connection Settings</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="heartbeatIntervalMs">Heartbeat Interval (ms)</Label>
              <Input
                id="heartbeatIntervalMs"
                type="number"
                min={10000}
                value={c.heartbeatIntervalMs ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, heartbeatIntervalMs: Number(e.target.value) || 0 }))}
                className="mt-1"
              />
              <p className="text-xs text-[#71717a] mt-1">e.g. 30000 = 30 seconds</p>
            </div>
            <div>
              <Label htmlFor="websocketTimeoutMs">WebSocket Timeout (ms)</Label>
              <Input
                id="websocketTimeoutMs"
                type="number"
                min={5000}
                value={c.websocketTimeoutMs ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, websocketTimeoutMs: Number(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="websocketReconnectionAttempts">Reconnection Attempts</Label>
              <Input
                id="websocketReconnectionAttempts"
                type="number"
                min={1}
                max={10}
                value={c.websocketReconnectionAttempts ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, websocketReconnectionAttempts: Number(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="websocketReconnectionDelayMs">Reconnection Delay (ms)</Label>
              <Input
                id="websocketReconnectionDelayMs"
                type="number"
                min={1000}
                value={c.websocketReconnectionDelayMs ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, websocketReconnectionDelayMs: Number(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="websocketReconnectionDelayMaxMs">Reconnection Delay Max (ms)</Label>
              <Input
                id="websocketReconnectionDelayMaxMs"
                type="number"
                min={5000}
                value={c.websocketReconnectionDelayMaxMs ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, websocketReconnectionDelayMaxMs: Number(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
