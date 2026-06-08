import React from 'react';
import { LucideIcon, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedNumber } from './AnimatedNumber';

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  trend?: { value: string; direction: 'up' | 'down' | 'neutral'; label?: string };
  footer?: React.ReactNode;
  accent?: 'default' | 'danger' | 'success' | 'warning' | 'purple';
  variant?: 'card' | 'inline';
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}

const ACCENT_STYLES = {
  default: { bar: '', icon: 'bg-blue-50 text-blue-600' },
  danger: { bar: 'bg-red-500', icon: 'bg-red-50 text-red-600' },
  success: { bar: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-600' },
  warning: { bar: 'bg-amber-500', icon: 'bg-amber-50 text-amber-600' },
  purple: { bar: 'bg-violet-500', icon: 'bg-violet-50 text-violet-600' },
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  trend,
  footer,
  accent = 'default',
  variant = 'card',
  onClick,
  loading,
  className,
}: MetricCardProps) {
  const styles = ACCENT_STYLES[accent];

  if (variant === 'inline') {
    return (
      <div className={cn('darkstore-card px-4 py-2 flex items-center gap-3', className)}>
        {Icon && (
          <div className={cn('p-2 rounded-lg', styles.icon, iconClassName)}>
            <Icon className="darkstore-icon-card" />
          </div>
        )}
        <div>
          <p className="darkstore-kpi-label">{label}</p>
          <div className="font-bold text-slate-800 tabular-nums">
            {loading ? '...' : value}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn('darkstore-card p-5 flex flex-col gap-3', className)}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-2 w-full" />
      </div>
    );
  }

  const TrendIcon =
    trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;

  const trendColor =
    trend?.direction === 'up'
      ? 'text-emerald-600'
      : trend?.direction === 'down'
        ? 'text-red-600'
        : 'text-slate-500';

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'darkstore-card p-5 flex flex-col justify-between h-full text-left relative overflow-hidden',
        onClick && 'hover:border-blue-300 hover:shadow-md transition-all cursor-pointer',
        className
      )}
    >
      {accent === 'danger' && <div className={cn('absolute top-0 left-0 w-1 h-full', styles.bar)} />}
      <div className={cn('flex justify-between items-start', accent === 'danger' && 'pl-2')}>
        <div>
          <p className="darkstore-kpi-label">{label}</p>
          <div className="darkstore-kpi-value text-slate-900 mt-1">
            {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
          </div>
          {trend && (
            <div className={cn('flex items-center gap-1 mt-1 text-xs font-medium', trendColor)}>
              <TrendIcon size={12} />
              <span>{trend.value}</span>
              {trend.label && <span className="text-slate-400 font-normal">{trend.label}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('p-2 rounded-lg', styles.icon, iconClassName)}>
            <Icon className="darkstore-icon-card" />
          </div>
        )}
      </div>
      {footer && <div className={cn('mt-4', accent === 'danger' && 'pl-2')}>{footer}</div>}
    </Wrapper>
  );
}
