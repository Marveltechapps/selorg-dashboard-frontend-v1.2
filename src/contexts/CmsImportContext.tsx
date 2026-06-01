import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  uploadSkuMaster,
  uploadCmsPages,
  uploadContentHubMaster,
  type AdminCmsUploadResult,
} from '@/api/cmsAdminApi';
import { CmsImportLogDrawer } from '@/components/admin/CmsImportLogDrawer';
import { toast } from 'sonner';
import { useAdminDashboardRefresh } from '@/contexts/AdminDashboardContext';

export type CmsImportKind = 'sku-master' | 'cms-pages' | 'content-hub';

export type CmsImportStatus = 'idle' | 'running' | 'success' | 'error';

export interface CmsImportJob {
  kind: CmsImportKind;
  fileName: string;
  status: CmsImportStatus;
  startedAt: number;
  result: AdminCmsUploadResult | null;
  errorMessage: string | null;
}

export type CmsImportLogLevel = 'info' | 'success' | 'warn' | 'error';

export interface CmsImportLogEntry {
  id: string;
  at: number;
  level: CmsImportLogLevel;
  message: string;
}

type StartImportOptions = {
  overwrite?: boolean;
  /** Skip success/error toasts (caller shows its own). */
  silentToast?: boolean;
};

/** Time-based progress ceiling until the API responds (ms). */
const IMPORT_ESTIMATE_MS: Record<CmsImportKind, number> = {
  'content-hub': 150_000,
  'sku-master': 120_000,
  'cms-pages': 90_000,
};

type CmsImportContextValue = {
  job: CmsImportJob | null;
  isRunning: boolean;
  /** 0–100; advances from job.startedAt while status is running. */
  progress: number;
  logs: CmsImportLogEntry[];
  logDrawerOpen: boolean;
  setLogDrawerOpen: (open: boolean) => void;
  startImport: (kind: CmsImportKind, file: File, options?: StartImportOptions) => Promise<AdminCmsUploadResult>;
  clearJob: () => void;
};

const STORAGE_KEY = 'selorg:cms-import-job';

const KIND_LABELS: Record<CmsImportKind, string> = {
  'sku-master': 'SKU mastersheet',
  'cms-pages': 'CMS pages mastersheet',
  'content-hub': 'Content hub mastersheet',
};

async function cloneFile(file: File): Promise<File> {
  const buffer = await file.arrayBuffer();
  return new File([buffer], file.name, {
    type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function readPersistedJob(): CmsImportJob | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CmsImportJob;
    if (!parsed?.kind || parsed.status !== 'running') return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistJob(job: CmsImportJob | null) {
  try {
    if (!job || job.status !== 'running') {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(job));
  } catch {
    // ignore quota / private mode
  }
}

const CmsImportContext = createContext<CmsImportContextValue | null>(null);

function computeEstimatedProgress(kind: CmsImportKind, startedAt: number): number {
  const elapsed = Date.now() - startedAt;
  const estimateMs = IMPORT_ESTIMATE_MS[kind];
  return Math.min(97, 5 + (elapsed / estimateMs) * 92);
}

let logIdCounter = 0;

function nextLogId() {
  logIdCounter += 1;
  return `cms-log-${logIdCounter}`;
}

function appendResultLogs(
  append: (level: CmsImportLogLevel, message: string) => void,
  result: AdminCmsUploadResult,
) {
  const counts = result.counts ?? {};
  const countKeys = Object.keys(counts);
  if (countKeys.length > 0) {
    append('info', 'Import counts:');
    for (const key of countKeys) {
      append('info', `  ${key}: ${String(counts[key])}`);
    }
  }
  for (const w of result.warnings ?? []) {
    const loc = `${w.sheet || 'Sheet'}${w.row ? ` row ${w.row}` : ''}`;
    append('warn', `${loc}: ${w.message}`);
  }
  for (const e of result.errors ?? []) {
    const loc = `${e.sheet || 'Sheet'}${e.row ? ` row ${e.row}` : ''}`;
    append('error', `${loc}: ${e.message}`);
  }
}

export function CmsImportProvider({ children }: { children: React.ReactNode }) {
  const { bumpDashboardData } = useAdminDashboardRefresh();
  const [job, setJob] = useState<CmsImportJob | null>(() => readPersistedJob());
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<CmsImportLogEntry[]>([]);
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const inFlightRef = useRef<Promise<AdminCmsUploadResult> | null>(null);
  const lastProgressLogRef = useRef(0);

  const appendLog = useCallback((level: CmsImportLogLevel, message: string) => {
    setLogs((prev) => [
      ...prev,
      { id: nextLogId(), at: Date.now(), level, message },
    ]);
  }, []);

  // A page refresh aborts the HTTP request; clear stale "running" markers from sessionStorage.
  React.useEffect(() => {
    const persisted = readPersistedJob();
    if (persisted?.status === 'running' && !inFlightRef.current) {
      setJob(null);
      persistJob(null);
      toast.message('Previous CMS import was interrupted by refresh. Please upload again.');
    }
  }, []);

  const setJobSafe = useCallback((next: CmsImportJob | null) => {
    setJob(next);
    persistJob(next);
    if (!next) {
      setProgress(0);
      return;
    }
    if (next.status === 'running') {
      setProgress((prev) => Math.max(prev, computeEstimatedProgress(next.kind, next.startedAt)));
      return;
    }
    if (next.status === 'success' || next.status === 'error') {
      setProgress(100);
      return;
    }
    setProgress(0);
  }, []);

  React.useEffect(() => {
    if (!job || job.status !== 'running') {
      return;
    }
    setProgress((prev) => Math.max(prev, computeEstimatedProgress(job.kind, job.startedAt)));
    const timer = window.setInterval(() => {
      setProgress((prev) => {
        const next = Math.max(prev, computeEstimatedProgress(job.kind, job.startedAt));
        const milestone = Math.floor(next / 25) * 25;
        if (milestone > lastProgressLogRef.current && milestone > 0 && milestone < 100) {
          lastProgressLogRef.current = milestone;
          appendLog('info', `Still processing… ~${milestone}%`);
        }
        return next;
      });
    }, 400);
    return () => window.clearInterval(timer);
  }, [appendLog, job?.kind, job?.status, job?.startedAt]);

  const startImport = useCallback(
    async (kind: CmsImportKind, file: File, options: StartImportOptions = {}) => {
      if (inFlightRef.current) {
        toast.error('Another CMS import is already in progress');
        throw new Error('Import already in progress');
      }

      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        toast.error('Only .xlsx files are allowed');
        throw new Error('Only .xlsx files are allowed');
      }

      const runningJob: CmsImportJob = {
        kind,
        fileName: file.name,
        status: 'running',
        startedAt: Date.now(),
        result: null,
        errorMessage: null,
      };
      lastProgressLogRef.current = 0;
      setLogs([]);
      setLogDrawerOpen(true);
      appendLog('info', `Starting ${KIND_LABELS[kind]} import`);
      appendLog('info', `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      setJobSafe(runningJob);

      const run = (async (): Promise<AdminCmsUploadResult> => {
        let stableFile: File;
        try {
          appendLog('info', 'Reading file into memory…');
          stableFile = await cloneFile(file);
          appendLog('info', 'File ready — uploading to server…');
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Failed to read file';
          appendLog('error', msg);
          setJobSafe({
            ...runningJob,
            status: 'error',
            errorMessage: msg,
          });
          if (!options.silentToast) toast.error(msg);
          throw e;
        }

        try {
          const overwrite = options.overwrite ?? true;
          if (kind === 'sku-master' || kind === 'content-hub') {
            appendLog('info', `Overwrite existing products: ${overwrite ? 'yes' : 'no'}`);
          }
          appendLog('info', 'Server is processing the mastersheet…');
          const result =
            kind === 'sku-master'
              ? await uploadSkuMaster(stableFile, overwrite)
              : kind === 'cms-pages'
                ? await uploadCmsPages(stableFile)
                : await uploadContentHubMaster(stableFile, overwrite);

          const durationSec = ((Date.now() - runningJob.startedAt) / 1000).toFixed(1);
          if (result.success) {
            appendLog('success', `Import completed successfully in ${durationSec}s`);
          } else {
            appendLog('warn', `Import finished with issues in ${durationSec}s`);
          }
          appendResultLogs(appendLog, result);

          setJobSafe({
            ...runningJob,
            status: result.success ? 'success' : 'error',
            result,
            errorMessage: result.success ? null : 'Import completed with issues',
          });

          if (!options.silentToast) {
            if (result.success) {
              toast.success(`${KIND_LABELS[kind]} import complete`);
            } else {
              toast.error(`${KIND_LABELS[kind]} import finished with issues`);
            }
          }

          if (result.success) {
            bumpDashboardData();
          }

          return result;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Upload failed';
          appendLog('error', msg);
          const failed: AdminCmsUploadResult = {
            success: false,
            counts: {},
            errors: [{ message: msg }],
          };
          setJobSafe({
            ...runningJob,
            status: 'error',
            result: failed,
            errorMessage: msg,
          });
          if (!options.silentToast) toast.error(msg);
          throw e;
        }
      })();

      inFlightRef.current = run;
      try {
        return await run;
      } finally {
        inFlightRef.current = null;
      }
    },
    [appendLog, bumpDashboardData, setJobSafe],
  );

  const clearJob = useCallback(() => {
    setJobSafe(null);
    setProgress(0);
    setLogs([]);
    setLogDrawerOpen(false);
  }, [setJobSafe]);

  const value = useMemo(
    () => ({
      job,
      isRunning: job?.status === 'running',
      progress,
      logs,
      logDrawerOpen,
      setLogDrawerOpen,
      startImport,
      clearJob,
    }),
    [clearJob, job, logDrawerOpen, logs, progress, startImport],
  );

  return (
    <CmsImportContext.Provider value={value}>
      {children}
      <CmsImportLogDrawer />
    </CmsImportContext.Provider>
  );
}

export function useCmsImport() {
  const ctx = useContext(CmsImportContext);
  if (!ctx) {
    throw new Error('useCmsImport must be used within CmsImportProvider');
  }
  return ctx;
}

export function useCmsImportOptional() {
  return useContext(CmsImportContext);
}

export { KIND_LABELS as CMS_IMPORT_KIND_LABELS };
