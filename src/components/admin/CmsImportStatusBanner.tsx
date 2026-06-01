import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, X, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CMS_IMPORT_KIND_LABELS,
  useCmsImport,
  type CmsImportKind,
} from '@/contexts/CmsImportContext';

type CmsImportStatusBannerProps = {
  /** Only show when the active job matches one of these kinds. */
  kinds: CmsImportKind[];
};

export function CmsImportStatusBanner({ kinds }: CmsImportStatusBannerProps) {
  const { job, progress, clearJob, setLogDrawerOpen, logDrawerOpen } = useCmsImport();

  if (!job || !kinds.includes(job.kind)) return null;

  const label = CMS_IMPORT_KIND_LABELS[job.kind as CmsImportKind] ?? 'CMS import';
  const isRunning = job.status === 'running';
  const isSuccess = job.status === 'success';

  return (
    <div
      role="status"
      className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
        isRunning
          ? 'border-[#bfdbfe] bg-[#eff6ff] text-[#1e40af]'
          : isSuccess
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-amber-200 bg-amber-50 text-amber-900'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isRunning ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : isSuccess ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        ) : (
          <AlertCircle className="h-4 w-4 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-medium">
            {isRunning
              ? `${label} import in progress`
              : isSuccess
                ? `${label} import completed`
                : `${label} import failed`}
          </p>
          <p className="truncate text-xs opacity-80">
            {job.fileName}
            {isRunning
              ? ` — ${Math.round(progress)}% · you can switch CMS modules; the import will continue`
              : job.errorMessage
                ? ` — ${job.errorMessage}`
                : ''}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!logDrawerOpen && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setLogDrawerOpen(true)}
          >
            <ScrollText className="mr-1.5 h-3.5 w-3.5" />
            View logs
          </Button>
        )}
        {!isRunning && (
          <Button type="button" variant="ghost" size="sm" className="h-8" onClick={clearJob}>
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        )}
      </div>
    </div>
  );
}
