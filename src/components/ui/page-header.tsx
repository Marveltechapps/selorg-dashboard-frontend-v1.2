import React from 'react';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from './button';
import { cn } from './utils';

/**
 * ===========================
 * PAGE HEADER WITH BREADCRUMBS
 * ===========================
 * Standardized page header component
 * Use this at the top of every screen
 */

interface BreadcrumbItem {
  label: string;
  path?: string;
  href?: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  backButton?: {
    label?: string;
    onClick: () => void;
  };
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  backButton,
  className
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 mb-3 text-sm" aria-label="Breadcrumb">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const hasPath = item.path || item.href;
            const hasOnClick = item.onClick;
            
            return (
              <React.Fragment key={index}>
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                {isLast ? (
                  <span className="text-slate-600 font-medium">
                    {item.label}
                  </span>
                ) : hasOnClick ? (
                  <button
                    onClick={item.onClick}
                    className="text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="text-slate-500">{item.label}</span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Main Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Back Button */}
          {backButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={backButton.onClick}
              className="mb-2 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {backButton.label || 'Back'}
            </Button>
          )}

          {/* Title & Subtitle */}
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">
              {title}
            </h1>
            {subtitle && (
              <div className="text-sm text-slate-500 max-w-2xl">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ==========================
 * SIMPLE BREADCRUMB TRAIL
 * ==========================
 * Use this for standalone breadcrumbs
 */

interface BreadcrumbTrailProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function BreadcrumbTrail({ items, className }: BreadcrumbTrailProps) {
  return (
    <nav className={cn("flex items-center gap-2 text-sm", className)} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const hasPath = item.path || item.href;
        const hasOnClick = item.onClick;
        
        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
            {isLast ? (
              <span className="text-slate-600 font-medium">
                {item.label}
              </span>
            ) : hasOnClick ? (
              <button
                onClick={item.onClick}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span className="text-slate-500">{item.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

/**
 * ==================
 * SECTION HEADER
 * ==================
 * Use this for sub-sections within a page
 */

interface SectionHeaderProps {
  title: string;
  description?: string | React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  actions,
  badge,
  className
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-4", className)}>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-lg font-semibold text-slate-800">
            {title}
          </h2>
          {badge}
        </div>
        {description && (
          <div className="text-sm text-slate-500">
            {description}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * ========================
 * CARD SECTION HEADER
 * ========================
 * Use this inside cards for sub-sections
 */

interface CardSectionHeaderProps {
  title: string;
  count?: number;
  actions?: React.ReactNode;
  className?: string;
}

export function CardSectionHeader({
  title,
  count,
  actions,
  className
}: CardSectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between pb-3 border-b border-slate-200", className)}>
      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
        {title}
        {count !== undefined && (
          <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </h3>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
