import React from 'react';
import { cn } from '@/lib/utils';

export interface TimelineItem {
  id: string;
  title: string;
  subtitle?: string;
  time?: string;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative border-l border-slate-200 pl-6">
      {items.map((it, idx) => (
        <li key={it.id} className={cn('mb-6 ml-1', idx === items.length - 1 && 'mb-0')}>
          <span className="absolute -left-[9px] mt-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-cyan-600 ring-2 ring-cyan-100" />
          <div className="pl-2">
            <p className="text-sm font-semibold text-slate-900">{it.title}</p>
            {it.subtitle && <p className="text-xs text-slate-600">{it.subtitle}</p>}
            {it.time && <p className="mt-0.5 text-xs text-slate-400">{it.time}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
