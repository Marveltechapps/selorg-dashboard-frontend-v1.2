import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Download } from "lucide-react";
import { exportFinanceReport } from "./financeApi";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportFinanceReportModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState("today");
  const [format, setFormat] = useState("pdf");
  const [scopes, setScopes] = useState<string[]>(["overview"]);

  const handleScopeChange = (scope: string) => {
    setScopes(prev => 
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      await exportFinanceReport({ 
        entityId: "default", 
        dateRange, 
        format, 
        scope: scopes 
      });
      toast.success("Finance report exported successfully", {
        description: "Your download will start shortly.",
      });
      onClose();
    } catch (e) {
      toast.error("Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Export Finance Report</DialogTitle>
          <DialogDescription>Generate a detailed financial report for your records.</DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-5">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scope */}
          <div className="space-y-3">
             <Label>Report Scope</Label>
             <div className="flex flex-col gap-3 border rounded-md p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="overview" 
                    checked={scopes.includes("overview")}
                    onCheckedChange={() => handleScopeChange("overview")}
                  />
                  <Label htmlFor="overview" className="font-normal cursor-pointer">Payments Overview</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="gateway" 
                    checked={scopes.includes("gateway")}
                    onCheckedChange={() => handleScopeChange("gateway")}
                  />
                  <Label htmlFor="gateway" className="font-normal cursor-pointer">Gateway Performance</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="failed" 
                    checked={scopes.includes("failed")}
                    onCheckedChange={() => handleScopeChange("failed")}
                  />
                  <Label htmlFor="failed" className="font-normal cursor-pointer">Failed Payments Analysis</Label>
                </div>
             </div>
          </div>

          {/* Format */}
          <div className="space-y-2">
             <Label>Format</Label>
             <div className="flex gap-4">
               <button 
                 onClick={() => setFormat('pdf')}
                 className={`flex-1 py-2 px-4 rounded border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${format === 'pdf' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
               >
                 PDF Document
               </button>
               <button 
                 onClick={() => setFormat('xlsx')}
                 className={`flex-1 py-2 px-4 rounded border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${format === 'xlsx' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
               >
                 Excel Spreadsheet
               </button>
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
