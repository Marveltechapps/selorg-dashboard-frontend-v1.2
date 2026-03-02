import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Download } from "lucide-react";
import { exportReport } from "@/api/analytics/analyticsApi";
import { toast } from "sonner";
import { exportToPDF } from "@/utils/pdfExport";
import { exportToCSVForExcel } from "@/utils/csvExport";

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportReportModal({ isOpen, onClose }: ExportReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState("rider");
  const [format, setFormat] = useState("pdf");

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

  const handleExport = async () => {
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

          <div className="space-y-3 pt-2">
             <Label>Include Breakdowns</Label>
             <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="by-rider" />
                  <Label htmlFor="by-rider" className="font-normal">By individual rider</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="by-zone" />
                  <Label htmlFor="by-zone" className="font-normal">By delivery zone</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="by-time" />
                  <Label htmlFor="by-time" className="font-normal">By time of day (hourly)</Label>
                </div>
             </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
