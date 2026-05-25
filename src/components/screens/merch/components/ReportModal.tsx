import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { merchApi } from '../merchApi';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CampaignRow {
  name: string;
  revenue: string;
  uplift: string;
  roi: string;
}

interface ReportKpis {
  totalRevenue: string;
  uplift: string;
  activeCampaigns: string;
  avgDiscount: string;
}

const DATE_RANGE_LABELS: Record<string, string> = {
  'last-7': 'Last 7 Days',
  'last-30': 'Last 30 Days',
  'this-quarter': 'This Quarter',
};

const REGION_LABELS: Record<string, string> = {
  all: 'All Regions',
  na: 'North America',
  eu: 'Europe',
};

const CHANNEL_LABELS: Record<string, string> = {
  all: 'Online & Offline',
  online: 'Online Only',
  store: 'In-Store Only',
};

export function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [kpis, setKpis] = useState<ReportKpis | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  
  const [dateRange, setDateRange] = useState('last-30');
  const [region, setRegion] = useState('na');
  const [channel, setChannel] = useState('all');
  const [campaignType, setCampaignType] = useState('all');

  const loadReport = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);
    try {
      const resp = await merchApi.getPerformanceReport({
        dateRange,
        region,
        channel,
        campaignType,
      });
      const payload = resp?.data;
      if (!payload) {
        throw new Error('Invalid report response');
      }
      setKpis(payload.kpis ?? null);
      const rows = Array.isArray(payload.campaigns) ? payload.campaigns : [];
      setCampaigns(
        rows.map((c: { name?: string; revenue?: string; uplift?: string; roi?: string }) => ({
          name: c.name ?? 'Unnamed',
          revenue: c.revenue ?? '—',
          uplift: c.uplift ?? '—',
          roi: c.roi ?? '—',
        }))
      );
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Failed to load report data');
      setCampaigns([]);
      setKpis(null);
    } finally {
      setDataLoading(false);
    }
  }, [dateRange, region, channel, campaignType]);

  useEffect(() => {
    if (!isOpen) return;
    loadReport();
  }, [isOpen, loadReport]);

  const handleDownload = () => {
    if (!kpis) {
      toast.error('No report data', { description: 'Wait for the report to load before downloading.' });
      return;
    }
    setIsDownloading(true);
    toast.info("Generating PDF report...", {
        description: "Compiling metrics and charts."
    });
    
    const generatePDF = () => {
      try {
        const jsPDFLib = (window as { jspdf?: { jsPDF: new () => { text: (...args: unknown[]) => void; save: (name: string) => void; addPage: () => void; setFont: (...args: unknown[]) => void; setFontSize: (n: number) => void; setTextColor: (...args: number[]) => void; setDrawColor: (...args: number[]) => void; line: (...args: number[]) => void } } }).jspdf;
        if (!jsPDFLib) {
          throw new Error('jsPDF not loaded');
        }
        const { jsPDF } = jsPDFLib;
        const doc = new jsPDF();
        
        doc.setFont('helvetica');
        
        doc.setFontSize(20);
        doc.setTextColor(124, 58, 237);
        doc.text('Merchandising Performance Report', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(117, 117, 117);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 35);
        doc.text(`Date Range: ${DATE_RANGE_LABELS[dateRange] ?? dateRange}`, 20, 42);
        doc.text(`Region: ${REGION_LABELS[region] ?? region}`, 20, 49);
        doc.text(`Channel: ${CHANNEL_LABELS[channel] ?? channel}`, 20, 56);
        doc.text(`Campaign Type: ${campaignType === 'all' ? 'All Types' : campaignType === 'promo' ? 'Promotions' : 'Clearance'}`, 20, 63);
        
        doc.setFontSize(14);
        doc.setTextColor(33, 33, 33);
        doc.setFont('helvetica', 'bold');
        doc.text('KPI Summary', 20, 78);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        let yPos = 88;
        
        const kpiRows = [
          { label: 'Total Revenue (Promo)', value: kpis.totalRevenue },
          { label: 'Total Uplift', value: kpis.uplift },
          { label: 'Active Campaigns', value: kpis.activeCampaigns },
          { label: 'Avg. Discount Depth', value: kpis.avgDiscount },
        ];
        
        kpiRows.forEach((kpi, idx) => {
          const xPos = 20 + (idx % 2) * 90;
          if (idx % 2 === 0 && idx > 0) yPos += 25;
          
          doc.setTextColor(117, 117, 117);
          doc.setFontSize(8);
          doc.text(kpi.label, xPos, yPos);
          doc.setFontSize(14);
          doc.setTextColor(33, 33, 33);
          doc.setFont('helvetica', 'bold');
          doc.text(kpi.value, xPos, yPos + 8);
          doc.setFont('helvetica', 'normal');
        });
        
        yPos = yPos + 30;
        doc.setFontSize(14);
        doc.setTextColor(33, 33, 33);
        doc.setFont('helvetica', 'bold');
        doc.text('Campaign Performance', 20, yPos);
        
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Campaign', 20, yPos);
        doc.text('Revenue', 100, yPos, { align: 'right' });
        doc.text('Uplift', 140, yPos, { align: 'right' });
        doc.text('ROI', 170, yPos, { align: 'right' });
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPos + 2, 190, yPos + 2);
        
        doc.setFont('helvetica', 'normal');
        yPos += 8;
        if (campaigns.length === 0) {
          doc.setTextColor(117, 117, 117);
          doc.text('No campaigns match the selected filters', 20, yPos);
        } else {
          campaigns.forEach((campaign) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            doc.setTextColor(33, 33, 33);
            doc.text(campaign.name, 20, yPos);
            doc.text(campaign.revenue, 100, yPos, { align: 'right' });
            doc.setTextColor(22, 163, 74);
            doc.text(campaign.uplift, 140, yPos, { align: 'right' });
            doc.setTextColor(33, 33, 33);
            doc.text(campaign.roi, 170, yPos, { align: 'right' });
            yPos += 8;
          });
        }
        
        doc.save(`Merch_Report_${Date.now()}.pdf`);
        setIsDownloading(false);
        toast.success("PDF Downloaded", {
          description: "Check your browser downloads folder."
        });
      } catch (error) {
        console.error('Error generating PDF:', error);
        setIsDownloading(false);
        toast.error("Failed to generate PDF", {
          description: "Please try again or contact support."
        });
      }
    };

    if ((window as { jspdf?: unknown }).jspdf) {
      setTimeout(() => generatePDF(), 100);
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => setTimeout(() => generatePDF(), 100);
      script.onerror = () => {
        setIsDownloading(false);
        toast.error("Failed to load PDF library", {
          description: "Please check your internet connection and try again."
        });
      };
      document.head.appendChild(script);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <DialogTitle className="text-xl font-bold">Merchandising Performance Report</DialogTitle>
              <DialogDescription>
                Detailed performance analysis for the selected period.
              </DialogDescription>
            </div>
            <div className="flex gap-2 shrink-0">
                <Button 
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] gap-2 h-9 text-white" 
                    size="sm"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDownload();
                    }}
                    disabled={isDownloading || dataLoading || !!dataError || !kpis}
                >
                    {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                    Download PDF
                </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange} disabled={dataLoading}>
                    <SelectTrigger className="bg-white h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="last-7">Last 7 Days</SelectItem>
                        <SelectItem value="last-30">Last 30 Days</SelectItem>
                        <SelectItem value="this-quarter">This Quarter</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">Region</label>
                <Select value={region} onValueChange={setRegion} disabled={dataLoading}>
                    <SelectTrigger className="bg-white h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        <SelectItem value="na">North America</SelectItem>
                        <SelectItem value="eu">Europe</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">Channel</label>
                <Select value={channel} onValueChange={setChannel} disabled={dataLoading}>
                    <SelectTrigger className="bg-white h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Online & Offline</SelectItem>
                        <SelectItem value="online">Online Only</SelectItem>
                        <SelectItem value="store">In-Store Only</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">Campaign Type</label>
                <Select value={campaignType} onValueChange={setCampaignType} disabled={dataLoading}>
                    <SelectTrigger className="bg-white h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="promo">Promotions</SelectItem>
                        <SelectItem value="clearance">Clearance</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        {dataLoading && (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading report data...</span>
            </div>
        )}
        {dataError && (
            <div className="py-8 text-center space-y-3">
              <p className="text-red-600 font-medium">{dataError}</p>
              <Button variant="outline" size="sm" onClick={() => loadReport()}>
                Retry
              </Button>
            </div>
        )}
        {!dataLoading && !dataError && (
        <>
        <div className="grid grid-cols-4 gap-4 mt-2">
            <div className="p-4 border rounded-xl bg-white shadow-sm">
                <div className="text-sm text-gray-500 mb-1">Total Revenue (Promo)</div>
                <div className="text-2xl font-bold text-[#212121]">{kpis?.totalRevenue ?? '—'}</div>
            </div>
            <div className="p-4 border rounded-xl bg-white shadow-sm">
                <div className="text-sm text-gray-500 mb-1">Total Uplift</div>
                <div className="text-2xl font-bold text-[#212121]">{kpis?.uplift ?? '—'}</div>
            </div>
            <div className="p-4 border rounded-xl bg-white shadow-sm">
                <div className="text-sm text-gray-500 mb-1">Active Campaigns</div>
                <div className="text-2xl font-bold text-[#212121]">{kpis?.activeCampaigns ?? '0'}</div>
            </div>
            <div className="p-4 border rounded-xl bg-white shadow-sm">
                <div className="text-sm text-gray-500 mb-1">Avg. Discount Depth</div>
                <div className="text-2xl font-bold text-[#212121]">{kpis?.avgDiscount ?? '—'}</div>
            </div>
        </div>

        <div className="space-y-6 mt-4">
            <div>
                <h3 className="font-bold text-lg mb-3">Campaign Performance</h3>
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-2 font-medium text-gray-600">Campaign</th>
                                <th className="px-4 py-2 font-medium text-gray-600 text-right">Revenue</th>
                                <th className="px-4 py-2 font-medium text-gray-600 text-right">Uplift</th>
                                <th className="px-4 py-2 font-medium text-gray-600 text-right">ROI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {campaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                        No campaigns match the selected filters
                                    </td>
                                </tr>
                            ) : (
                                campaigns.map((campaign, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-2">{campaign.name}</td>
                                        <td className="px-4 py-2 text-right">{campaign.revenue}</td>
                                        <td className="px-4 py-2 text-right text-green-600">{campaign.uplift}</td>
                                        <td className="px-4 py-2 text-right">{campaign.roi}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
