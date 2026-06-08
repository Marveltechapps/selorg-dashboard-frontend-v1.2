import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
export interface PlaybookStep {
  label: string;
  description?: string;
}

const PLAYBOOKS: Record<string, { title: string; steps: PlaybookStep[] }> = {
  sla_breach: {
    title: 'SLA Breach SOP',
    steps: [
      { label: 'Check picker assignment', description: 'Reassign if unassigned > 2 min' },
      { label: 'Escalate to floor lead', description: 'Notify via radio if critical' },
      { label: 'Prioritize express orders', description: 'Move to front of queue' },
      { label: 'Document breach reason', description: 'Log in order notes' },
    ],
  },
  missing_item: {
    title: 'Missing Item SOP',
    steps: [
      { label: 'Verify shelf stock', description: 'Physical check at location' },
      { label: 'Offer substitution', description: 'Contact customer if needed' },
      { label: 'Update inventory', description: 'Mark SKU for cycle count' },
      { label: 'Complete partial pick', description: 'Proceed with available items' },
    ],
  },
  rto: {
    title: 'RTO Risk SOP',
    steps: [
      { label: 'Call customer', description: 'Attempt contact twice' },
      { label: 'Wait 2 minutes', description: 'Allow callback window' },
      { label: 'Mark RTO if unreachable', description: 'Initiate refund workflow' },
      { label: 'Restock items', description: 'Return items to shelf' },
    ],
  },
  stock_out: {
    title: 'Stock-Out SOP',
    steps: [
      { label: 'Confirm zero on-hand', description: 'Check backstock area' },
      { label: 'Initiate restock', description: 'Create replenishment task' },
      { label: 'Disable SKU if chronic', description: 'Flag for procurement' },
      { label: 'Notify affected orders', description: 'Substitute or cancel lines' },
    ],
  },
  ops_alert: {
    title: 'Ops Alert SOP',
    steps: [
      { label: 'Acknowledge alert', description: 'Assign owner' },
      { label: 'Assess impact', description: 'Check affected orders' },
      { label: 'Resolve root cause', description: 'Fix device/picker issue' },
      { label: 'Close alert', description: 'Document resolution' },
    ],
  },
};

interface ExceptionPlaybookProps {
  exceptionType: string;
  onStepAction?: (stepIndex: number, step: PlaybookStep) => void;
  className?: string;
}

export function ExceptionPlaybook({ exceptionType, onStepAction, className }: ExceptionPlaybookProps) {
  const [expanded, setExpanded] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const playbook = PLAYBOOKS[exceptionType] || PLAYBOOKS.ops_alert;

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
    onStepAction?.(idx, playbook.steps[idx]);
  };

  return (
    <div className={cn('darkstore-card-elevated border border-[var(--ds-primary-muted)]', className)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-[var(--ds-primary)]" />
          <span className="text-sm font-semibold text-slate-800">{playbook.title}</span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {playbook.steps.map((step, idx) => {
            const done = completedSteps.has(idx);
            return (
              <div
                key={idx}
                className={cn(
                  'flex items-start gap-3 p-2.5 rounded-lg border transition-colors',
                  done ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleStep(idx)}
                  className={cn(
                    'mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                    done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-[var(--ds-primary)]'
                  )}
                >
                  {done && <CheckCircle2 size={12} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', done ? 'text-emerald-800 line-through' : 'text-slate-800')}>
                    {idx + 1}. {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Inline playbook panel for exception inbox rows */
export function ExceptionPlaybookPanel({ type }: { type: string }) {
  return <ExceptionPlaybook exceptionType={type} className="mt-3" />;
}
