import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createQCCheck,
  updateQCCheckApi,
  createAudit,
  updateAudit,
  createCertificate,
  updateCertificateApi,
  createTemperature,
  updateTemperature,
  createLabelForTab,
  recalculateRating,
  updateRating,
  type QcCrudTab,
} from '../../../api/vendor/vendorQcCompliance.api';

export type CrudMode = 'create' | 'edit';

interface VendorOption {
  id: string;
  name: string;
}

interface QcComplianceCrudModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: QcCrudTab;
  mode: CrudMode;
  editItem?: Record<string, unknown> | null;
  vendors: VendorOption[];
  onSaved: () => void;
}

const inputClass =
  'w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]';
const labelClass = 'block text-xs font-bold text-[#6B7280] uppercase mb-1';

export function QcComplianceCrudModal({
  open,
  onOpenChange,
  tab,
  mode,
  editItem,
  vendors,
  onSaved,
}: QcComplianceCrudModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const item = editItem || {};
    if (tab === 'qc') {
      setForm({
        vendorId: String(item.vendorId || ''),
        batchId: String(item.batchId || ''),
        productName: String(item.product || item.productName || ''),
        checkType: String(item.checkType || 'Visual'),
        status: String(item.status || 'pending').toLowerCase(),
        inspectorName: String(item.inspector || item.inspectorName || ''),
        notes: String(item.notes || ''),
      });
    } else if (tab === 'audits') {
      setForm({
        vendorId: String(item.vendorId || ''),
        auditType: String(item.auditType || 'Routine'),
        date: item.date ? new Date(String(item.date)).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        result: String(item.result || 'Pending'),
        score: String(item.score ?? 0),
        inspectorName: String(item.inspectorName || ''),
      });
    } else if (tab === 'certs') {
      setForm({
        vendorId: String(item.vendorId || ''),
        type: String(item.certificateType || item.type || ''),
        issuedBy: String(item.issuedBy || ''),
        issuedAt: new Date().toISOString().slice(0, 10),
        expiresAt: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        status: String(item.status || 'valid').toLowerCase(),
        licenseNumber: String(item.licenseNumber || ''),
      });
    } else if (tab === 'temp') {
      setForm({
        vendorId: String(item.vendorId || ''),
        shipmentId: String(item.shipmentId || ''),
        productName: String(item.product || item.productName || ''),
        requirement: String(item.requirement || '2-8°C'),
        avgTemp: String(item.avgTemp ?? 5),
        minTemp: String(item.minTemp ?? 4),
        maxTemp: String(item.maxTemp ?? 6),
        compliant: item.compliant === false ? 'false' : 'true',
      });
    } else if (tab === 'ratings') {
      setForm({
        vendorId: String(item.vendorId || item.id || ''),
        overallRating: String(item.overallRating ?? 4),
        qcPassRate: String(item.qcPassRate ?? 90),
        complianceScore: String(item.complianceScore ?? 85),
        auditScore: String(item.auditScore ?? 88),
        trend: String(item.trend || 'stable'),
      });
    }
  }, [open, tab, editItem, mode]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vendorId && tab !== 'qc') {
      toast.error('Select a vendor');
      return;
    }
    if (tab === 'qc' && !form.vendorId) {
      toast.error('Select a vendor');
      return;
    }

    setSaving(true);
    try {
      const id = String(editItem?.id || '');

      if (tab === 'qc') {
        const payload = {
          vendorId: form.vendorId,
          batchId: form.batchId,
          productName: form.productName,
          checkType: form.checkType,
          status: form.status,
          inspectorName: form.inspectorName,
          notes: form.notes,
        };
        if (mode === 'create') await createQCCheck(payload);
        else await updateQCCheckApi(id, payload);
      } else if (tab === 'audits') {
        const auditType =
          form.auditType === 'Complaint-based'
            ? 'Follow-up'
            : form.auditType === 'Certification'
              ? 'Routine'
              : form.auditType;
        const payload = {
          vendorId: form.vendorId,
          auditType,
          date: new Date(form.date).toISOString(),
          result: form.result,
          score: Number(form.score),
          inspectorName: form.inspectorName,
        };
        if (mode === 'create') await createAudit(payload);
        else await updateAudit(id, payload);
      } else if (tab === 'certs') {
        const payload = {
          vendorId: form.vendorId,
          type: form.type,
          issuedBy: form.issuedBy,
          issuedAt: new Date(form.issuedAt).toISOString(),
          expiresAt: new Date(form.expiresAt).toISOString(),
          status: form.status,
          metadata: { licenseNumber: form.licenseNumber },
        };
        if (mode === 'create') await createCertificate(payload);
        else await updateCertificateApi(id, payload);
      } else if (tab === 'temp') {
        const payload = {
          vendorId: form.vendorId,
          shipmentId: form.shipmentId,
          productName: form.productName,
          requirement: form.requirement,
          avgTemp: Number(form.avgTemp),
          minTemp: Number(form.minTemp),
          maxTemp: Number(form.maxTemp),
          compliant: form.compliant === 'true',
        };
        if (mode === 'create') await createTemperature(payload);
        else await updateTemperature(id, payload);
      } else if (tab === 'ratings') {
        if (mode === 'create') {
          await recalculateRating(form.vendorId);
        } else {
          await updateRating(form.vendorId, {
            overallRating: Number(form.overallRating),
            qcPassRate: Number(form.qcPassRate),
            complianceScore: Number(form.complianceScore),
            auditScore: Number(form.auditScore),
            trend: form.trend,
          });
        }
      }

      toast.success(`${createLabelForTab(tab)} ${mode === 'create' ? 'created' : 'updated'}`);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const title = `${mode === 'create' ? 'Create' : 'Edit'} ${createLabelForTab(tab)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? `Add a new ${createLabelForTab(tab).toLowerCase()} to the hub.`
              : `Update this ${createLabelForTab(tab).toLowerCase()}.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <label className={labelClass}>Vendor</label>
            <select
              className={inputClass}
              value={form.vendorId || ''}
              onChange={(e) => set('vendorId', e.target.value)}
              required
              disabled={mode === 'edit' && tab === 'ratings'}
            >
              <option value="">Select vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {tab === 'qc' && (
            <>
              <div><label className={labelClass}>Batch ID</label><input className={inputClass} value={form.batchId || ''} onChange={(e) => set('batchId', e.target.value)} required /></div>
              <div><label className={labelClass}>Product</label><input className={inputClass} value={form.productName || ''} onChange={(e) => set('productName', e.target.value)} required /></div>
              <div><label className={labelClass}>Check Type</label>
                <select className={inputClass} value={form.checkType || 'Visual'} onChange={(e) => set('checkType', e.target.value)}>
                  {['Visual', 'Temperature', 'Packaging', 'Labeling', 'Weight', 'Chemical', 'Microbiological'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Status</label>
                <select className={inputClass} value={form.status || 'pending'} onChange={(e) => set('status', e.target.value)}>
                  <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
                </select>
              </div>
              <div><label className={labelClass}>Inspector</label><input className={inputClass} value={form.inspectorName || ''} onChange={(e) => set('inspectorName', e.target.value)} /></div>
              <div><label className={labelClass}>Notes</label><textarea className={inputClass} rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></div>
            </>
          )}

          {tab === 'audits' && (
            <>
              <div><label className={labelClass}>Audit Type</label>
                <select className={inputClass} value={form.auditType || 'Routine'} onChange={(e) => set('auditType', e.target.value)}>
                  {['Routine', 'Follow-up', 'Full Audit', 'Spot Check'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Date</label><input type="date" className={inputClass} value={form.date || ''} onChange={(e) => set('date', e.target.value)} required /></div>
              <div><label className={labelClass}>Result</label>
                <select className={inputClass} value={form.result || 'Pending'} onChange={(e) => set('result', e.target.value)}>
                  <option value="Pending">Pending</option><option value="Passed">Passed</option><option value="Failed">Failed</option>
                </select>
              </div>
              <div><label className={labelClass}>Score (0-100)</label><input type="number" min={0} max={100} className={inputClass} value={form.score || ''} onChange={(e) => set('score', e.target.value)} /></div>
            </>
          )}

          {tab === 'certs' && (
            <>
              <div><label className={labelClass}>Certificate Type</label><input className={inputClass} value={form.type || ''} onChange={(e) => set('type', e.target.value)} required /></div>
              <div><label className={labelClass}>Issued By</label><input className={inputClass} value={form.issuedBy || ''} onChange={(e) => set('issuedBy', e.target.value)} /></div>
              <div><label className={labelClass}>Issued Date</label><input type="date" className={inputClass} value={form.issuedAt || ''} onChange={(e) => set('issuedAt', e.target.value)} /></div>
              <div><label className={labelClass}>Expiry Date</label><input type="date" className={inputClass} value={form.expiresAt || ''} onChange={(e) => set('expiresAt', e.target.value)} /></div>
              <div><label className={labelClass}>Status</label>
                <select className={inputClass} value={form.status || 'valid'} onChange={(e) => set('status', e.target.value)}>
                  <option value="valid">Valid</option><option value="expiring_soon">Expiring Soon</option><option value="expired">Expired</option>
                </select>
              </div>
            </>
          )}

          {tab === 'temp' && (
            <>
              <div><label className={labelClass}>Shipment ID</label><input className={inputClass} value={form.shipmentId || ''} onChange={(e) => set('shipmentId', e.target.value)} required /></div>
              <div><label className={labelClass}>Product</label><input className={inputClass} value={form.productName || ''} onChange={(e) => set('productName', e.target.value)} required /></div>
              <div><label className={labelClass}>Requirement</label><input className={inputClass} placeholder="2-8°C" value={form.requirement || ''} onChange={(e) => set('requirement', e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className={labelClass}>Min °C</label><input type="number" className={inputClass} value={form.minTemp || ''} onChange={(e) => set('minTemp', e.target.value)} /></div>
                <div><label className={labelClass}>Avg °C</label><input type="number" className={inputClass} value={form.avgTemp || ''} onChange={(e) => set('avgTemp', e.target.value)} /></div>
                <div><label className={labelClass}>Max °C</label><input type="number" className={inputClass} value={form.maxTemp || ''} onChange={(e) => set('maxTemp', e.target.value)} /></div>
              </div>
              <div><label className={labelClass}>Compliant</label>
                <select className={inputClass} value={form.compliant || 'true'} onChange={(e) => set('compliant', e.target.value)}>
                  <option value="true">Yes</option><option value="false">No</option>
                </select>
              </div>
            </>
          )}

          {tab === 'ratings' && mode === 'edit' && (
            <>
              <div><label className={labelClass}>Overall Rating (0-5)</label><input type="number" step="0.1" min={0} max={5} className={inputClass} value={form.overallRating || ''} onChange={(e) => set('overallRating', e.target.value)} /></div>
              <div><label className={labelClass}>QC Pass Rate %</label><input type="number" className={inputClass} value={form.qcPassRate || ''} onChange={(e) => set('qcPassRate', e.target.value)} /></div>
              <div><label className={labelClass}>Compliance Score</label><input type="number" className={inputClass} value={form.complianceScore || ''} onChange={(e) => set('complianceScore', e.target.value)} /></div>
              <div><label className={labelClass}>Audit Score</label><input type="number" className={inputClass} value={form.auditScore || ''} onChange={(e) => set('auditScore', e.target.value)} /></div>
              <div><label className={labelClass}>Trend</label>
                <select className={inputClass} value={form.trend || 'stable'} onChange={(e) => set('trend', e.target.value)}>
                  <option value="up">Up</option><option value="down">Down</option><option value="stable">Stable</option>
                </select>
              </div>
            </>
          )}

          {tab === 'ratings' && mode === 'create' && (
            <p className="text-sm text-[#6B7280]">Ratings are calculated from QC checks, audits, and certificates for the selected vendor.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 border border-[#E5E7EB] rounded-md text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#4F46E5] text-white rounded-md text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
