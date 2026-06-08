import React, { useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { getOrderWorkflow, type OrderWorkflowData } from '@/api/darkstore/operations.api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SlaPostMortemPanelProps {
  orderId: string;
  className?: string;
}

export function SlaPostMortemPanel({ orderId, className }: SlaPostMortemPanelProps) {
  const [workflow, setWorkflow] = useState<OrderWorkflowData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getOrderWorkflow(orderId)
      .then((res) => setWorkflow(res?.data ?? null))
      .catch(() => setWorkflow(null))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleExport = () => {
    if (!workflow) return;
    const lines = [
      'SLA BREACH POST-MORTEM',
      '======================',
      `Order: ${workflow.orderId}`,
      `Status: ${workflow.status}`,
      `SLA Timer: ${workflow.slaTimer}`,
      `SLA Status: ${workflow.slaStatus}`,
      `Picker: ${workflow.pickerName || '—'}`,
      `Rider: ${workflow.riderName || '—'} (${workflow.riderStatus || '—'})`,
      '',
      'TIMELINE',
      ...(workflow.timeline || []).map(
        (t) => `  ${t.timestamp ? new Date(t.timestamp).toLocaleString() : '—'} — ${t.status}${t.updatedBy ? ` (${t.updatedBy})` : ''}`
      ),
      '',
      'ROOT CAUSE (fill in):',
      '  [ ] Unassigned too long',
      '  [ ] Picker delay',
      '  [ ] Missing items',
      '  [ ] Rider wait',
      '',
      'CORRECTIVE ACTION:',
      '  ___________________________',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sla-postmortem-${orderId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Post-mortem template downloaded');
  };

  if (loading) {
    return <p className="text-xs text-slate-400">Loading post-mortem data…</p>;
  }

  if (!workflow) return null;

  return (
    <div className={`darkstore-card-elevated p-4 border-l-4 border-l-red-400 ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-red-600" />
          <h4 className="text-sm font-semibold text-slate-800">SLA Post-Mortem</h4>
        </div>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={handleExport}>
          <Download size={12} className="mr-1" />
          Export
        </Button>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-slate-500">Order</dt>
        <dd className="font-mono font-semibold">{workflow.orderId}</dd>
        <dt className="text-slate-500">Picker</dt>
        <dd>{workflow.pickerName || 'Unassigned'}</dd>
        <dt className="text-slate-500">SLA</dt>
        <dd className="text-red-600 font-semibold">{workflow.slaTimer} ({workflow.slaStatus})</dd>
        <dt className="text-slate-500">Rider</dt>
        <dd>{workflow.riderName || '—'}</dd>
      </dl>
      {workflow.timeline.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Timeline</p>
          <ul className="text-xs text-slate-600 space-y-0.5 max-h-24 overflow-y-auto">
            {workflow.timeline.slice(-5).map((t, i) => (
              <li key={i}>
                {t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : '—'} — {t.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
