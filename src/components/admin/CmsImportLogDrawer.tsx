import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, ScrollText, X } from 'lucide-react';
import {
  CMS_IMPORT_KIND_LABELS,
  useCmsImport,
  type CmsImportLogEntry,
  type CmsImportLogLevel,
} from '@/contexts/CmsImportContext';

const DRAWER_MS = 320;

const LOG_MSG_CLASS: Record<CmsImportLogLevel, string> = {
  info: 'cms-import-drawer__log-msg--info',
  success: 'cms-import-drawer__log-msg--success',
  warn: 'cms-import-drawer__log-msg--warn',
  error: 'cms-import-drawer__log-msg--error',
};

const LEVEL_PREFIX: Record<CmsImportLogLevel, string> = {
  info: 'INF',
  success: ' OK',
  warn: 'WRN',
  error: 'ERR',
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function LogLine({ entry }: { entry: CmsImportLogEntry }) {
  return (
    <div className="cms-import-drawer__log-line">
      <span className="cms-import-drawer__log-time">{formatTime(entry.at)}</span>
      <span className="cms-import-drawer__log-tag">[{LEVEL_PREFIX[entry.level]}]</span>
      <span className={`cms-import-drawer__log-msg ${LOG_MSG_CLASS[entry.level]}`}>
        {entry.message}
      </span>
    </div>
  );
}

export function CmsImportLogDrawer() {
  const { job, progress, logs, logDrawerOpen, setLogDrawerOpen } = useCmsImport();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);

  const hasJob = Boolean(job);
  const showChrome = hasJob || logs.length > 0 || logDrawerOpen;

  useEffect(() => {
    if (logDrawerOpen) {
      setPanelMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setPanelVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    setPanelVisible(false);
    const timer = window.setTimeout(() => setPanelMounted(false), DRAWER_MS);
    return () => window.clearTimeout(timer);
  }, [logDrawerOpen]);

  useEffect(() => {
    if (!logDrawerOpen || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs.length, logDrawerOpen]);

  useEffect(() => {
    if (!logDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLogDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [logDrawerOpen, setLogDrawerOpen]);

  useEffect(() => {
    if (!logDrawerOpen) {
      document.body.classList.remove('cms-import-drawer-open');
      return;
    }
    document.body.classList.add('cms-import-drawer-open');
    return () => document.body.classList.remove('cms-import-drawer-open');
  }, [logDrawerOpen]);

  if (!showChrome || typeof document === 'undefined') return null;

  const label = job ? (CMS_IMPORT_KIND_LABELS[job.kind] ?? 'CMS import') : 'Import logs';
  const isRunning = job?.status === 'running';
  const close = () => setLogDrawerOpen(false);
  const pct = Math.round(Math.min(100, Math.max(0, progress)));

  const collapsedTab =
    !logDrawerOpen && !panelMounted ? (
      <button
        type="button"
        onClick={() => setLogDrawerOpen(true)}
        className="cms-import-tab"
        aria-label="Open import logs"
      >
        <ScrollText size={14} color="#58a6ff" />
        <span className="cms-import-tab__label">Logs</span>
        {isRunning && <Loader2 size={12} className="animate-spin" color="#3fb950" />}
      </button>
    ) : null;

  const overlay =
    panelMounted &&
    createPortal(
      <>
        <button
          type="button"
          aria-label="Close import logs"
          className={`cms-import-backdrop${panelVisible ? '' : ' cms-import-backdrop--hidden'}`}
          onClick={close}
        />

        <aside
          className={`cms-import-drawer${panelVisible ? '' : ' cms-import-drawer--closed'}`}
          aria-label="CMS import logs"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="cms-import-drawer__header">
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isRunning ? (
                  <Loader2 size={12} className="animate-spin" color="#3fb950" />
                ) : (
                  <span className="cms-import-drawer__prompt-dollar">$</span>
                )}
                <h2 className="cms-import-drawer__title">{label}</h2>
              </div>
              {job && (
                <p className="cms-import-drawer__filename" title={job.fileName}>
                  {job.fileName}
                </p>
              )}
              {isRunning && (
                <>
                  <div className="cms-import-drawer__progress-row">
                    <span>processing</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="cms-import-drawer__progress-bar">
                    <div
                      className="cms-import-drawer__progress-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={close}
              className="cms-import-drawer__close"
              aria-label="Close import logs"
            >
              <X size={14} />
            </button>
          </header>

          <div className="cms-import-drawer__terminal">
            <div className="cms-import-drawer__terminal-bar">
              <span className="cms-import-drawer__terminal-dot">●</span>
              <span>import.log</span>
              <span className="cms-import-drawer__terminal-count">{logs.length} lines</span>
            </div>
            <div ref={scrollRef} className="cms-import-drawer__logs">
              {logs.length === 0 ? (
                <div className="cms-import-drawer__log-line">
                  <span className="cms-import-drawer__prompt-dollar">$</span>
                  <span className="cms-import-drawer__log-msg" style={{ color: '#484f58' }}>
                    waiting for output…
                  </span>
                </div>
              ) : (
                logs.map((entry) => <LogLine key={entry.id} entry={entry} />)
              )}
            </div>
            <div className="cms-import-drawer__prompt">
              <span className="cms-import-drawer__prompt-dollar">$</span>{' '}
              {isRunning ? 'tail -f import.log' : '_'}
            </div>
          </div>
        </aside>
      </>,
      document.body,
    );

  return (
    <>
      {collapsedTab && createPortal(collapsedTab, document.body)}
      {overlay}
    </>
  );
}
