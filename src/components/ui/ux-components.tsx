import React from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Loader2, 
  RefreshCw, 
  X,
  LucideIcon
} from 'lucide-react';
import { Button } from './button';
import { cn } from './utils';

/**
 * ======================
 * EMPTY STATE COMPONENT
 * ======================
 * Use this for tables, lists, grids with no data
 */

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-12 text-center",
      className
    )}>
      {Icon && (
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 mb-6 max-w-md leading-relaxed">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

/**
 * =======================
 * LOADING STATE COMPONENT
 * =======================
 * Use this for async data loading
 */

interface LoadingStateProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({ 
  text = "Loading...", 
  size = 'md',
  className 
}: LoadingStateProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const paddingSizes = {
    sm: 'p-4',
    md: 'p-8',
    lg: 'p-12'
  };

  return (
    <div className={cn(
      "flex items-center justify-center",
      paddingSizes[size],
      className
    )}>
      <Loader2 className={cn(
        "animate-spin text-slate-400 mr-3",
        sizes[size]
      )} />
      <span className="text-slate-600">{text}</span>
    </div>
  );
}

/**
 * ===================
 * ERROR STATE COMPONENT
 * ===================
 * Use this for error handling with retry
 */

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export function ErrorState({ 
  title = "Something went wrong",
  description = "We couldn't load the data. Please try again.",
  onRetry,
  retryText = "Retry",
  className 
}: ErrorStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-12 text-center",
      className
    )}>
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-md">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          {retryText}
        </Button>
      )}
    </div>
  );
}

/**
 * ==========================
 * TABLE SKELETON LOADER
 * ==========================
 * Use this for table loading states
 */

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 6,
  className 
}: TableSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-slate-200">
        {Array.from({ length: columns }).map((_, i) => (
          <div 
            key={`header-${i}`} 
            className="h-4 bg-slate-200 rounded flex-1 animate-pulse"
          />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={`cell-${rowIndex}-${colIndex}`} 
              className="h-4 bg-slate-100 rounded flex-1 animate-pulse"
              style={{ 
                animationDelay: `${(rowIndex + colIndex) * 50}ms` 
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * ======================
 * CARD SKELETON LOADER
 * ======================
 * Use this for card grid loading states
 */

interface CardSkeletonProps {
  count?: number;
  columns?: number;
  className?: string;
}

export function CardSkeleton({ 
  count = 6, 
  columns = 3,
  className 
}: CardSkeletonProps) {
  return (
    <div className={cn(
      "grid gap-4",
      columns === 2 && "grid-cols-2",
      columns === 3 && "grid-cols-3",
      columns === 4 && "grid-cols-4",
      className
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
        >
          <div className="h-6 bg-slate-200 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-full animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-5/6 animate-pulse" />
          <div className="flex gap-2 mt-4">
            <div className="h-8 bg-slate-100 rounded flex-1 animate-pulse" />
            <div className="h-8 bg-slate-100 rounded flex-1 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ========================
 * INLINE NOTIFICATION
 * ========================
 * Use this for inline feedback messages
 */

interface InlineNotificationProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  description: string;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function InlineNotification({ 
  variant = 'info',
  title,
  description,
  action,
  onDismiss,
  className 
}: InlineNotificationProps) {
  const variants = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: Info,
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900'
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: CheckCircle2,
      iconColor: 'text-green-600',
      textColor: 'text-green-900'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: AlertCircle,
      iconColor: 'text-yellow-600',
      textColor: 'text-yellow-900'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      textColor: 'text-red-900'
    }
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-start gap-3 p-4 rounded-lg border",
      config.bg,
      config.border,
      className
    )}>
      <Icon className={cn("w-5 h-5 flex-shrink-0", config.iconColor)} />
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={cn("font-semibold mb-1", config.textColor)}>
            {title}
          </h4>
        )}
        <p className={cn("text-sm", config.textColor)}>
          {description}
        </p>
        {action && (
          <div className="mt-3">
            {action}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={cn(
            "flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors",
            config.iconColor
          )}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * ==========================
 * SELECTION SUMMARY BAR
 * ==========================
 * Use this for bulk action selection feedback
 */

interface SelectionSummaryBarProps {
  selectedCount: number;
  totalCount?: number;
  onClear: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function SelectionSummaryBar({ 
  selectedCount,
  totalCount,
  onClear,
  actions,
  className 
}: SelectionSummaryBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4",
      className
    )}>
      <span className="font-medium">
        {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
        {totalCount && ` of ${totalCount}`}
      </span>
      {actions}
      <Button 
        size="sm" 
        variant="ghost" 
        onClick={onClear}
        className="text-white hover:bg-white/20 hover:text-white"
      >
        Clear
      </Button>
    </div>
  );
}

/**
 * =======================
 * ACTIVE FILTER CHIPS
 * =======================
 * Use this to display active filters
 */

interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
}

export function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-sm border border-slate-200">
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

/**
 * ============================
 * RESULT COUNT DISPLAY
 * ============================
 * Use this to show search/filter result counts
 */

interface ResultCountProps {
  showing: number;
  total: number;
  filtered?: boolean;
  className?: string;
}

export function ResultCount({ showing, total, filtered, className }: ResultCountProps) {
  return (
    <p className={cn("text-sm text-slate-600", className)}>
      Showing <span className="font-semibold">{showing}</span> of{' '}
      <span className="font-semibold">{total}</span> results
      {filtered && (
        <span className="text-slate-500"> (filtered)</span>
      )}
    </p>
  );
}

/**
 * ======================
 * PROGRESS INDICATOR
 * ======================
 * Use this for multi-step processes
 */

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps?: string[];
  className?: string;
}

export function ProgressIndicator({ 
  currentStep, 
  totalSteps, 
  steps,
  className 
}: ProgressIndicatorProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className={cn("w-full", className)}>
      {/* Progress Bar */}
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step Labels */}
      {steps && (
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div 
              key={index}
              className={cn(
                "text-xs font-medium",
                index + 1 <= currentStep ? "text-blue-600" : "text-slate-400"
              )}
            >
              {index + 1}. {step}
            </div>
          ))}
        </div>
      )}

      {/* Simple Counter */}
      {!steps && (
        <p className="text-xs text-slate-600 text-center">
          Step {currentStep} of {totalSteps}
        </p>
      )}
    </div>
  );
}
