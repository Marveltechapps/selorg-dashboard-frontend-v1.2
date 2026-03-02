import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { complianceApi } from './complianceApi';

interface ComplianceOverviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ComplianceOverviewSheet({ isOpen, onClose }: ComplianceOverviewSheetProps) {
  const [score, setScore] = useState<number | null>(null);
  const [violations, setViolations] = useState<{ summary: string; entity?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [summaryResp, auditsResp] = await Promise.all([
          complianceApi.getSummary(),
          complianceApi.getAudits({ severity: 'error' }).catch(() => ({ data: [] }))
        ]);
        if (!mounted) return;
        const d = summaryResp?.data ?? {};
        setScore(d.complianceScore ?? null);
        const audits = Array.isArray(auditsResp?.data) ? auditsResp.data : [];
        setViolations(audits.slice(0, 5).map((a: any) => ({
          summary: a.details?.summary ?? 'Policy breach detected',
          entity: a.entityType
        })));
      } catch {
        setScore(null);
        setViolations([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[500px] flex flex-col h-full">
        <SheetHeader className="pb-6 border-b shrink-0">
          <SheetTitle className="text-2xl">Compliance Overview</SheetTitle>
          <SheetDescription>
            Detailed breakdown of regional compliance scoring.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0 py-6">
          <div className="space-y-8 pr-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-gray-500 mt-2">Loading compliance overview...</p>
              </div>
            ) : (
              <>
                {/* Total Score */}
                <div className="text-center space-y-2">
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="h-32 w-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={351} strokeDashoffset={351 - (351 * (score ?? 0)) / 100} className="text-green-500" />
                    </svg>
                    <span className="absolute text-2xl font-black text-gray-900">{score != null ? Math.round(score) : '-'}%</span>
                  </div>
                  <p className="text-sm text-gray-500">Overall Compliance Score (Global)</p>
                </div>

                {/* Recent Violations */}
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <h4 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <AlertTriangle size={16} /> Recent Violations
                  </h4>
                  {violations.length > 0 ? (
                    <ul className="space-y-2 text-sm text-red-800">
                      {violations.map((v, i) => (
                        <li key={i} className="flex gap-2 items-start">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                          <span>{v.entity ? `${v.entity}: ` : ''}{v.summary}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-green-700">No recent violations.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
