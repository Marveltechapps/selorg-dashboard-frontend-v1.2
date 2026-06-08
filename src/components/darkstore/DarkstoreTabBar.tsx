import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DarkstoreTab {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
  accent?: 'default' | 'success' | 'danger' | 'warning' | 'purple';
}

interface DarkstoreTabBarProps {
  tabs: DarkstoreTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'underline' | 'pill';
}

const PILL_ACCENT = {
  default: { active: 'border-blue-500 text-blue-600 bg-blue-50', count: 'bg-blue-50 text-blue-600' },
  success: { active: 'border-emerald-500 text-emerald-600 bg-emerald-50', count: 'bg-emerald-50 text-emerald-600' },
  danger: { active: 'border-red-500 text-red-600 bg-red-50', count: 'bg-red-50 text-red-600' },
  warning: { active: 'border-amber-500 text-amber-600 bg-amber-50', count: 'bg-amber-50 text-amber-600' },
  purple: { active: 'border-violet-500 text-violet-600 bg-violet-50', count: 'bg-violet-50 text-violet-600' },
};

export function DarkstoreTabBar({
  tabs,
  active,
  onChange,
  className,
  variant = 'underline',
}: DarkstoreTabBarProps) {
  if (variant === 'pill') {
    return (
      <div
        className={cn(
          'bg-white p-1 rounded-xl border border-slate-200 shadow-sm inline-flex w-full gap-1 overflow-x-auto mb-6',
          className
        )}
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          const accent = PILL_ACCENT[tab.accent ?? 'default'];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border-b-2 min-w-0',
                isActive
                  ? cn('bg-slate-50 text-slate-900', accent.active.split(' ').find((c) => c.startsWith('border-')))
                  : 'bg-white text-slate-500 border-transparent hover:bg-slate-100'
              )}
            >
              {tab.label}
              {tab.count != null && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums',
                    isActive ? accent.count : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1 border-b border-slate-200 mb-6 overflow-x-auto', className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap',
              isActive
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            )}
          >
            {Icon && <Icon size={16} />}
            {tab.label}
            {tab.count != null && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums',
                  isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
