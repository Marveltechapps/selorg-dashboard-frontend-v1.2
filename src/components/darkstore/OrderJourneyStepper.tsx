import React from 'react';
import { Check, Circle, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WORKFLOW_STEPS,
  getPipelineStage,
  getWorkflowStepIndex,
  type PipelineStage,
} from '@/utils/orderWorkflow';

interface OrderJourneyStepperProps {
  status: string;
  timeline?: { status: string; timestamp?: string; updatedBy?: string }[];
  compact?: boolean;
  className?: string;
}

function stepState(stepIdx: number, currentIdx: number): 'done' | 'active' | 'pending' {
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

function findTimestampForStage(
  stage: PipelineStage,
  timeline: { status: string; timestamp?: string }[]
): string | undefined {
  const statusHints: Record<PipelineStage, string[]> = {
    queued: ['new', 'queued'],
    assigned: ['assigned', 'processing'],
    picking: ['picking'],
    packing: ['packed', 'picked', 'ready', 'packing'],
    ready_dispatch: ['ready_for_dispatch'],
    handed_off: ['arrived_at_darkstore', 'picked', 'out_for_delivery'],
    delivered: ['delivered', 'completed'],
    exception: ['cancelled', 'rto'],
  };
  const hints = statusHints[stage] || [];
  for (let i = timeline.length - 1; i >= 0; i--) {
    const st = (timeline[i]?.status || '').toLowerCase();
    if (hints.some((h) => st.includes(h))) return timeline[i]?.timestamp;
  }
  return undefined;
}

export function OrderJourneyStepper({ status, timeline = [], compact, className }: OrderJourneyStepperProps) {
  const stage = getPipelineStage(status);
  if (stage === 'exception') {
    return (
      <div className={cn('darkstore-card-elevated p-4 border-l-4 border-l-red-500', className)}>
        <p className="text-sm font-semibold text-red-700">Order in exception state</p>
        <p className="text-xs text-slate-500 mt-1">Status: {status}</p>
      </div>
    );
  }

  const currentIdx = getWorkflowStepIndex(stage);
  const steps = WORKFLOW_STEPS.filter((s) => s.id !== 'delivered' || stage === 'delivered');

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1 overflow-x-auto pb-1', className)}>
        {steps.map((step, idx) => {
          const state = stepState(idx, currentIdx);
          return (
            <div key={step.id} className="flex items-center gap-1 shrink-0">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  state === 'done' && 'bg-emerald-500',
                  state === 'active' && 'bg-[var(--ds-primary)] ring-2 ring-[var(--ds-primary-muted)]',
                  state === 'pending' && 'bg-slate-200'
                )}
              />
              {idx < steps.length - 1 && (
                <div className={cn('w-4 h-0.5', idx < currentIdx ? 'bg-emerald-400' : 'bg-slate-200')} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('darkstore-card-elevated p-4', className)}>
      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-4">Order Journey</h4>
      <div className="relative">
        {steps.map((step, idx) => {
          const state = stepState(idx, currentIdx);
          const ts = findTimestampForStage(step.id, timeline);
          const isLast = idx === steps.length - 1;
          return (
            <div key={step.id} className="flex gap-3 relative pb-5 last:pb-0">
              {!isLast && (
                <div
                  className={cn(
                    'absolute left-[11px] top-6 w-0.5 h-[calc(100%-12px)]',
                    idx < currentIdx ? 'bg-emerald-300' : 'bg-slate-200'
                  )}
                />
              )}
              <div className="relative z-10 shrink-0 mt-0.5">
                {state === 'done' && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check size={14} className="text-white" />
                  </div>
                )}
                {state === 'active' && (
                  <div className="w-6 h-6 rounded-full bg-[var(--ds-primary)] flex items-center justify-center ring-4 ring-[var(--ds-primary-muted)]">
                    <CircleDot size={14} className="text-white" />
                  </div>
                )}
                {state === 'pending' && (
                  <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                    <Circle size={10} className="text-slate-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p
                  className={cn(
                    'text-sm font-semibold',
                    state === 'active' ? 'text-[var(--ds-primary)]' : state === 'done' ? 'text-slate-800' : 'text-slate-400'
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-slate-500">{step.description}</p>
                {ts && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(ts).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
