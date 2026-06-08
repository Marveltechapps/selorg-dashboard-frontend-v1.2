import React from 'react';
import { LucideIcon, ChevronDown, ChevronUp, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface AlertCardAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'success' | 'outline';
  disabled?: boolean;
}

interface AlertCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  severity?: 'warning' | 'danger' | 'info';
  actions?: AlertCardAction[];
  onToggleHistory?: () => void;
  historyExpanded?: boolean;
  historyContent?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const SEVERITY_STYLES = {
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  danger: 'bg-red-50 border-red-200 text-red-900',
  info: 'bg-blue-50 border-blue-200 text-blue-900',
};

const ACTION_VARIANTS = {
  default: 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50',
  destructive: 'bg-red-600 text-white hover:bg-red-700 border-red-600',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600',
  outline: 'bg-white border-current hover:bg-white/80',
};

export function AlertCard({
  title,
  subtitle,
  icon: Icon,
  severity = 'warning',
  actions,
  onToggleHistory,
  historyExpanded,
  historyContent,
  className,
  children,
}: AlertCardProps) {
  return (
    <div className={cn('p-3 rounded-lg border', SEVERITY_STYLES[severity], className)}>
      <div className="flex items-start gap-3">
        {Icon && <Icon size={16} className="mt-0.5 shrink-0 opacity-80" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {subtitle && <p className="text-xs mt-0.5 opacity-80">{subtitle}</p>}
          {children}
          {actions && actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 items-center">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={cn(
                    'px-2.5 py-1 rounded text-[10px] font-bold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                    ACTION_VARIANTS[action.variant ?? 'default']
                  )}
                >
                  {action.label}
                </button>
              ))}
              {onToggleHistory && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={onToggleHistory}
                >
                  <History size={14} className="mr-1" />
                  History
                  {historyExpanded ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      {historyExpanded && historyContent && (
        <div className="mt-3 pt-3 border-t border-current/20">{historyContent}</div>
      )}
    </div>
  );
}
