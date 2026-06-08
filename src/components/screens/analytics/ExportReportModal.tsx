import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Download, CalendarClock } from "lucide-react";
import {
  exportReport,
  scheduleAnalyticsReport,
  listAnalyticsSchedules,
  type ReportSchedule,
} from "@/api/analytics/analyticsApi";
import { toast } from "sonner";
import { exportToPDF } from "@/utils/pdfExport";
import { exportToCSVForExcel } from "@/utils/csvExport";

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportReportModal({ isOpen, onClose }: ExportReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [metric, setMetric] = useState("rider");
  const [format, setFormat] = useState("pdf");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleEmail, setScheduleEmail] = useState("");
  const [scheduleFrequency, setScheduleFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [existingSchedules, setExistingSchedules] = useState<ReportSchedule[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    listAnalyticsSchedules()
      .then(setExistingSchedules)
      .catch(() => setExistingSchedules([]));
  }, [isOpen]);

  const doClientSideExport = (fmt: string) => {
    const name = `RiderFleet_Report_${metric}_${new Date().toISOString().slice(0, 10)}`;
    if (fmt === "pdf") {
      const content = `<h2>Analytics Report – ${metric}</h2><p>Generated on ${new Date().toLocaleString()}</p><table><tr><th>Metric</th><th>Value</th></tr><tr><td>Report Type</td><td>${metric}</td></tr><tr><td>Date Range</td><td>Last 7 days</td></tr></table>`;
      exportToPDF(content, name);
      toast.success("PDF generated. Use Print dialog to save as PDF.");
    } else {
      const rows: (string | number)[][] = [["Metric", "Value"], ["Report Type", metric], ["Generated", new Date().toLocaleString()]];
      exportToCSVForExcel(rows, name);
      toast.success("Report downloaded. Open in Excel or Sheets.");
    }
  };

  const handleSchedule = async () => {
    if (!scheduleEmail.trim()) {
      toast.error("Enter an email address for scheduled delivery");
      return;
    }
    setScheduling(true);
    try {
      await scheduleAnalyticsReport({
        email: scheduleEmail.trim(),
        metric,
        format: format === "xlsx" ? "excel" : format,
        frequency: scheduleFrequency,
        dateRange: "7d",
        active: true,
      });
      toast.success(`Scheduled ${scheduleFrequency} ${metric} report to ${scheduleEmail.trim()}`);
      const updated = await listAnalyticsSchedules();
      setExistingSchedules(updated);
      setScheduleEnabled(false);
    } catch (e: unknown) {
      toast.error("Failed to schedule report", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setScheduling(false);
    }
  };

  const handleExport = async () => {
    if (scheduleEnabled) {
      await handleSchedule();
      return;
    }

    setLoading(true);
    try {
      const apiFormat = format === "xlsx" ? "excel" : (format as "pdf" | "csv");
      let didDownload = false;
      try {
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const result = await exportReport({
          metric: metric as "rider" | "sla" | "fleet",
          format: apiFormat,
          dateRange: { from: sevenDaysAgo.toISOString(), to: now.toISOString() },
          includeCharts: true,
          includeSummary: true,
        });
        if (result?.reportUrl) {
          const res = await fetch(result.reportUrl, { mode: "cors" });
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = (result.reportId || "report") + (format === "pdf" ? ".pdf" : format === "xlsx" ? ".xlsx" : ".csv");
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          didDownload = true;
        }
      } catch (_) {}
      if (!didDownload) {
        doClientSideExport(format);
      } else {
        toast.success("Report downloaded.");
      }
      onClose();
    } catch (e: unknown) {
      doClientSideExport(format);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]" aria-describedby="export-analytics-description">
        <DialogHeader>
          <DialogTitle>Export Analytics Report</DialogTitle>
          <DialogDescription id="export-analytics-description">Select parameters for your exported report.</DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rider">Rider Performance</SelectItem>
                <SelectItem value="sla">SLA Adherence</SelectItem>
                <SelectItem value="fleet">Fleet Utilization</SelectItem>
                <SelectItem value="exceptions">Exceptions Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
             <Label>Format</Label>
             <div className="flex gap-4">
               <button 
                 onClick={() => setFormat('pdf')}
                 className={`flex-1 py-2 px-4 rounded border text-sm font-medium flex items-center justify-center gap-2 ${format === 'pdf' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
               >
                 PDF Document
               </button>
               <button 
                 onClick={() => setFormat('xlsx')}
                 className={`flex-1 py-2 px-4 rounded border text-sm font-medium flex items-center justify-center gap-2 ${format === 'xlsx' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
               >
                 Excel Spreadsheet
               </button>
             </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="schedule-report"
                checked={scheduleEnabled}
                onCheckedChange={(v) => setScheduleEnabled(Boolean(v))}
              />
              <Label htmlFor="schedule-report" className="font-normal flex items-center gap-1.5">
                <CalendarClock size={14} /> Schedule recurring email delivery
              </Label>
            </div>

            {scheduleEnabled && (
              <div className="space-y-3 pl-6 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-2">
                  <Label>Recipient email</Label>
                  <Input
                    type="email"
                    placeholder="ops@company.com"
                    value={scheduleEmail}
                    onChange={(e) => setScheduleEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={scheduleFrequency} onValueChange={(v) => setScheduleFrequency(v as typeof scheduleFrequency)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {existingSchedules.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs text-gray-500">Active schedules</Label>
              <ul className="text-xs text-gray-600 space-y-1 max-h-24 overflow-y-auto">
                {existingSchedules.slice(0, 5).map((s) => (
                  <li key={s._id || `${s.email}-${s.metric}`} className="flex justify-between gap-2">
                    <span className="truncate">{s.email}</span>
                    <span className="shrink-0 capitalize text-gray-400">{s.frequency} · {s.metric}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading || scheduling}>Cancel</Button>
          <Button onClick={handleExport} disabled={loading || scheduling}>
            {(loading || scheduling) ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : scheduleEnabled ? (
              <CalendarClock className="mr-2 h-4 w-4" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {scheduleEnabled ? "Schedule Report" : "Export Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
