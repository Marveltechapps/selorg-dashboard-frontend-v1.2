import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function JsonViewer({ title, data }: { title?: string; data: unknown }) {
  const [open, setOpen] = useState(false);
  const text = JSON.stringify(data ?? {}, null, 2);
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title ?? 'JSON'}
      </button>
      {open && (
        <pre className="max-h-80 overflow-auto border-t border-slate-100 bg-slate-50 p-3 text-xs text-slate-800">
          {text}
        </pre>
      )}
    </div>
  );
}
