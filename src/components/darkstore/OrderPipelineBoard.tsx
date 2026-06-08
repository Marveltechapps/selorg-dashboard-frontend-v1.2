import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PipelineStats } from '@/api/darkstore/operations.api';

interface OrderPipelineBoardProps {
  pipeline: PipelineStats | null;
  loading?: boolean;
  onStageClick?: (stage: string) => void;
  className?: string;
}

const STAGES: { key: keyof PipelineStats['stages']; label: string; color: string }[] = [
  { key: 'queued', label: 'New', color: 'bg-slate-500' },
  { key: 'assigned', label: 'Assigned', color: 'bg-sky-500' },
  { key: 'picking', label: 'Picking', color: 'bg-indigo-500' },
  { key: 'packing', label: 'Packing', color: 'bg-violet-500' },
  { key: 'ready_dispatch', label: 'Ready', color: 'bg-emerald-500' },
  { key: 'waiting_rider', label: 'Rider Wait', color: 'bg-amber-500' },
];

export function OrderPipelineBoard({ pipeline, loading, onStageClick, className }: OrderPipelineBoardProps) {
  const stages = pipeline?.stages;

  return (
    <div className={cn('darkstore-card p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Fulfillment Pipeline</h3>
          <p className="text-xs text-slate-500">Live order flow across stages</p>
        </div>
        {pipeline && pipeline.slaCritical > 0 && (
          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
            {pipeline.slaCritical} SLA critical
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex gap-2 animate-pulse">
          {STAGES.map((s) => (
            <div key={s.key} className="flex-1 h-20 bg-slate-100 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
          {STAGES.map((stage, idx) => {
            const count = stages?.[stage.key] ?? 0;
            const clickable = Boolean(onStageClick);
            return (
              <React.Fragment key={stage.key}>
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => onStageClick?.(stage.key)}
                  className={cn(
                    'flex-1 min-w-[88px] rounded-lg border border-slate-200 p-3 text-left transition-all',
                    clickable && 'hover:border-[var(--ds-primary)] hover:shadow-sm cursor-pointer',
                    !clickable && 'cursor-default',
                    count > 0 && 'bg-white',
                    count === 0 && 'bg-slate-50/80'
                  )}
                >
                  <div className={cn('w-full h-1 rounded-full mb-2', stage.color, count === 0 && 'opacity-30')} />
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{count}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mt-1">{stage.label}</p>
                </button>
                {idx < STAGES.length - 1 && (
                  <ArrowRight size={14} className="text-slate-300 shrink-0 self-center hidden sm:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
