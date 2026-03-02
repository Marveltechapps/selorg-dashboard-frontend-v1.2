import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Loader2, Download, FileText, Table } from "lucide-react";
import { toast } from 'sonner';
import { exportAnalyticsReport, dateRangeToFromTo } from './financeAnalyticsApi';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ExportPnLModal({ open, onClose }: Props) {
  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf");
  const [detailLevel, setDetailLevel] = useState<"summary" | "detailed">("summary");
  const [period, setPeriod] = useState("last_month");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
      setIsExporting(true);
      try {
          const { from, to } = dateRangeToFromTo(period);
          await exportAnalyticsReport({
              metric: 'pnl',
              from,
              to,
              format,
              details: detailLevel
          });
          toast.success("P&L Report exported successfully");
          onClose();
      } catch (e) {
          toast.error("Export failed");
      } finally {
          setIsExporting(false);
      }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Profit & Loss Statement</DialogTitle>
          <DialogDescription>Generate a P&L report for your selected period.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
             {/* Period Selector */}
             <div className="space-y-2">
                 <Label>Report Period</Label>
                 <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="last_month">Last Month</SelectItem>
                        <SelectItem value="last_quarter">Last Quarter</SelectItem>
                        <SelectItem value="ytd">Year to Date (YTD)</SelectItem>
                        <SelectItem value="last_year">Last Financial Year</SelectItem>
                    </SelectContent>
                 </Select>
             </div>

             {/* Detail Level */}
             <div className="space-y-3">
                 <Label>Detail Level</Label>
                 <RadioGroup value={detailLevel} onValueChange={(val: any) => setDetailLevel(val)} className="flex flex-col space-y-2">
                     <div className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-gray-50">
                        <RadioGroupItem value="summary" id="summary" />
                        <Label htmlFor="summary" className="cursor-pointer font-normal">
                            <span className="font-semibold block">Summary Only</span>
                            <span className="text-xs text-gray-500">High-level Revenue, COGS, Gross Margin, OPEX, Net Income</span>
                        </Label>
                     </div>
                     <div className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-gray-50">
                        <RadioGroupItem value="detailed" id="detailed" />
                        <Label htmlFor="detailed" className="cursor-pointer font-normal">
                            <span className="font-semibold block">Detailed Breakdown</span>
                            <span className="text-xs text-gray-500">Full account-level granular breakdown</span>
                        </Label>
                     </div>
                 </RadioGroup>
             </div>

             {/* Format */}
             <div className="space-y-2">
                 <Label>File Format</Label>
                 <div className="flex gap-4">
                     <Button 
                        variant={format === 'pdf' ? 'default' : 'outline'} 
                        className={`flex-1 ${format === 'pdf' ? 'bg-[#212121]' : ''}`}
                        onClick={() => setFormat('pdf')}
                     >
                         <FileText className="mr-2 h-4 w-4" /> PDF
                     </Button>
                     <Button 
                        variant={format === 'xlsx' ? 'default' : 'outline'} 
                        className={`flex-1 ${format === 'xlsx' ? 'bg-[#212121]' : ''}`}
                        onClick={() => setFormat('xlsx')}
                     >
                         <Table className="mr-2 h-4 w-4" /> Excel
                     </Button>
                 </div>
             </div>
        </div>

        <DialogFooter>
            <Button variant="ghost" onClick={onClose} disabled={isExporting}>Cancel</Button>
            <Button onClick={handleExport} disabled={isExporting} className="bg-[#14B8A6] hover:bg-[#0D9488]">
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export Report
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
