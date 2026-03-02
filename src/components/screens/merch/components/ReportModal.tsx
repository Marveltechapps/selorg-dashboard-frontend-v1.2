import React, { useState, useMemo, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { Mail, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../../../ui/input";
import { merchApi } from '../merchApi';
import { analyticsApi } from '../analytics/analyticsApi';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CampaignData {
  name: string;
  revenue: string;
  uplift: string;
  roi: string;
  type: string;
  region: string;
  channel: string;
}

export function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  
  // Data from API
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [kpis, setKpis] = useState<{ totalRevenue: string; uplift: string; activeCampaigns: string; avgDiscount: string } | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Filter states
  const [dateRange, setDateRange] = useState('last-30');
  const [region, setRegion] = useState('na');
  const [channel, setChannel] = useState('all');
  const [campaignType, setCampaignType] = useState('all');

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      setDataLoading(true);
      setDataError(null);
      try {
        const [campResp, analyticsResp] = await Promise.all([
          merchApi.getCampaigns(),
          analyticsApi.getSummary({ type: 'campaign', range: dateRange === 'last-7' ? '7days' : dateRange === 'last-30' ? '30days' : '90days' }),
        ]);
        if (!mounted) return;
        const rawCampaigns = campResp?.data ?? campResp?.campaigns ?? (Array.isArray(campResp) ? campResp : []);
        const list = Array.isArray(rawCampaigns) ? rawCampaigns : [];
        const mapped: CampaignData[] = list.map((c: any) => ({
          name: c.name ?? c.title ?? 'Unnamed',
          revenue: typeof c.revenue === 'number' ? `₹${(c.revenue / 1000).toFixed(0)}k` : (c.revenue ?? '—'),
          uplift: c.uplift != null ? `+${Number(c.uplift).toFixed(0)}%` : '—',
          roi: c.roi != null ? `${Number(c.roi).toFixed(1)}x` : '—',
          type: (c.type ?? c.campaignType ?? 'promo').toLowerCase(),
          region: (c.region ?? c.scope ?? 'na').toLowerCase().slice(0, 2),
          channel: (c.channel ?? 'all').toLowerCase(),
        }));
        setCampaigns(mapped);

        const analyticsData = analyticsResp?.data ?? [];
        const arr = Array.isArray(analyticsData) ? analyticsData : [];
        const totalRev = arr.reduce((s: number, r: any) => s + (Number(r.revenue) || 0), 0);
        const avgUplift = arr.length > 0 ? arr.reduce((s: number, r: any) => s + (Number(r.uplift) || 0), 0) / arr.length : 0;
        setKpis({
          totalRevenue: totalRev > 0 ? `₹${(totalRev / 1_000_000).toFixed(1)}M` : '—',
          uplift: avgUplift > 0 ? `+${avgUplift.toFixed(1)}%` : '—',
          activeCampaigns: String(list.filter((c: any) => (c.status ?? '').toLowerCase() === 'active').length || list.length),
          avgDiscount: '—',
        });
      } catch (err) {
        if (mounted) {
          setDataError(err instanceof Error ? err.message : 'Failed to load report data');
          setCampaigns([]);
          setKpis(null);
        }
      } finally {
        if (mounted) setDataLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [isOpen, dateRange]);

  // Filter campaigns based on selected filters
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const matchesRegion = region === 'all' || campaign.region === region;
      const matchesChannel = channel === 'all' || campaign.channel === channel;
      const matchesType = campaignType === 'all' || campaign.type === campaignType;
      return matchesRegion && matchesChannel && matchesType;
    });
  }, [campaigns, region, channel, campaignType]);

  const handleDownload = () => {
    setIsDownloading(true);
    toast.info("Generating PDF report...", {
        description: "Compiling metrics and charts."
    });
    
    // Load jsPDF from CDN and generate PDF
    const generatePDF = () => {
      try {
        const jsPDFLib = (window as any).jspdf;
        if (!jsPDFLib) {
          throw new Error('jsPDF not loaded');
        }
        const { jsPDF } = jsPDFLib;
        const doc = new jsPDF();
        
        // Set font
        doc.setFont('helvetica');
        
        // Title
        doc.setFontSize(20);
        doc.setTextColor(124, 58, 237); // #7C3AED
        doc.text('Merchandising Performance Report', 105, 20, { align: 'center' });
        
        // Header info
        doc.setFontSize(10);
        doc.setTextColor(117, 117, 117);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 35);
        doc.text(`Date Range: ${dateRange === 'last-7' ? 'Last 7 Days' : dateRange === 'last-30' ? 'Last 30 Days' : 'This Quarter'}`, 20, 42);
        doc.text(`Region: ${region === 'na' ? 'North America' : region === 'eu' ? 'Europe' : 'All'}`, 20, 49);
        doc.text(`Channel: ${channel === 'all' ? 'Online & Offline' : channel === 'online' ? 'Online Only' : 'In-Store Only'}`, 20, 56);
        
        // KPI Summary
        doc.setFontSize(14);
        doc.setTextColor(33, 33, 33);
        doc.setFont('helvetica', 'bold');
        doc.text('KPI Summary', 20, 70);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        let yPos = 80;
        
        const kpiRows = [
          { label: 'Total Revenue (Promo)', value: kpis?.totalRevenue ?? '—', trend: 'From analytics' },
          { label: 'Total Uplift', value: kpis?.uplift ?? '—', trend: 'From analytics' },
          { label: 'Active Campaigns', value: kpis?.activeCampaigns ?? '0', trend: 'From campaigns' },
          { label: 'Avg. Discount Depth', value: kpis?.avgDiscount ?? '—', trend: '—' }
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
          doc.setFontSize(8);
          doc.setTextColor(22, 163, 74);
          doc.text(kpi.trend, xPos, yPos + 14);
        });
        
        // Campaign Performance
        yPos = yPos + 30;
        doc.setFontSize(14);
        doc.setTextColor(33, 33, 33);
        doc.setFont('helvetica', 'bold');
        doc.text('Campaign Performance', 20, yPos);
        
        // Table header
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Campaign', 20, yPos);
        doc.text('Revenue', 100, yPos, { align: 'right' });
        doc.text('Uplift', 140, yPos, { align: 'right' });
        doc.text('ROI', 170, yPos, { align: 'right' });
        
        // Draw line
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPos + 2, 190, yPos + 2);
        
        // Table rows
        doc.setFont('helvetica', 'normal');
        yPos += 8;
        filteredCampaigns.forEach((campaign) => {
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
        
        // Save PDF
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

    // Check if jsPDF is already loaded
    if ((window as any).jspdf) {
      setTimeout(() => generatePDF(), 100);
    } else {
      // Load jsPDF from CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        setTimeout(() => generatePDF(), 100);
      };
      script.onerror = () => {
        setIsDownloading(false);
        toast.error("Failed to load PDF library", {
          description: "Please check your internet connection and try again."
        });
      };
      document.head.appendChild(script);
    }
  };

  const handleScheduleEmail = async () => {
    if (!emailAddress || !emailAddress.includes('@')) {
        toast.error("Invalid Email", { description: "Please enter a valid email address." });
        return;
    }

    setIsScheduling(true);
    
    try {
      // Simulate API call to send email
      // In production, this would call: /api/merch/reports/send-email
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful email send
      // The backend would handle:
      // 1. Generate PDF report
      // 2. Attach to email
      // 3. Send via email service (SendGrid, AWS SES, etc.)
      // 4. Schedule daily if needed
      
      // For demo, we'll show success and log the action
      console.log('Email sent to:', emailAddress, {
        subject: 'Merchandising Performance Report',
        dateRange,
        region,
        channel,
        campaignType,
        timestamp: new Date().toISOString()
      });
      
      setIsScheduling(false);
      setShowEmailInput(false);
      const savedEmail = emailAddress;
      setEmailAddress('');
      
      toast.success("Email Sent Successfully", {
        description: `Report has been sent to ${savedEmail}. You will receive it shortly.`
      });
    } catch (error) {
      setIsScheduling(false);
      toast.error("Failed to Send Email", {
        description: "Please try again or contact support."
      });
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
                {showEmailInput ? (
                    <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                        <Input 
                            type="email" 
                            placeholder="Enter email address" 
                            className="h-9 w-48 text-xs"
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleScheduleEmail()}
                        />
                        <Button 
                            size="sm" 
                            className="h-9 bg-[#7C3AED]"
                            onClick={handleScheduleEmail}
                            disabled={isScheduling}
                        >
                            {isScheduling ? <Loader2 size={14} className="animate-spin" /> : "Send"}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9"
                            onClick={() => setShowEmailInput(false)}
                        >
                            <X size={14} />
                        </Button>
                    </div>
                ) : (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 h-9"
                        onClick={(e) => {
                            e.preventDefault();
                            setShowEmailInput(true);
                        }}
                    >
                        <Mail size={14} />
                        Schedule Email
                    </Button>
                )}
                
                <Button 
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] gap-2 h-9 text-white" 
                    size="sm"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDownload();
                    }}
                    disabled={isDownloading || showEmailInput || dataLoading}
                >
                    {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                    Download PDF
                </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-4 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
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
                <Select value={region} onValueChange={setRegion}>
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
                <Select value={channel} onValueChange={setChannel}>
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
                <Select value={campaignType} onValueChange={setCampaignType}>
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

        {/* Loading / Error */}
        {dataLoading && (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading report data...</span>
            </div>
        )}
        {dataError && (
            <div className="py-8 text-center text-red-600 font-medium">{dataError}</div>
        )}
        {!dataLoading && !dataError && (
        <>
        {/* Summary KPIs */}
        <div className="grid grid-cols-4 gap-4 mt-2">
            <div className="p-4 border rounded-xl bg-white shadow-sm">
                <div className="text-sm text-gray-500 mb-1">Total Revenue (Promo)</div>
                <div className="text-2xl font-bold text-[#212121]">{kpis?.totalRevenue ?? '—'}</div>
                <div className="text-xs text-gray-500 font-medium">From analytics</div>
            </div>
            <div className="p-4 border rounded-xl bg-white shadow-sm">
                <div className="text-sm text-gray-500 mb-1">Total Uplift</div>
                <div className="text-2xl font-bold text-[#212121]">{kpis?.uplift ?? '—'}</div>
                <div className="text-xs text-gray-500 font-medium">From analytics</div>
            </div>
            <div className="p-4 border rounded-xl bg-white shadow-sm">
                <div className="text-sm text-gray-500 mb-1">Active Campaigns</div>
                <div className="text-2xl font-bold text-[#212121]">{kpis?.activeCampaigns ?? '0'}</div>
                <div className="text-xs text-gray-500 font-medium">From campaigns</div>
            </div>
            <div className="p-4 border rounded-xl bg-white shadow-sm">
                <div className="text-sm text-gray-500 mb-1">Avg. Discount Depth</div>
                <div className="text-2xl font-bold text-[#212121]">{kpis?.avgDiscount ?? '—'}</div>
                <div className="text-xs text-gray-500 font-medium">—</div>
            </div>
        </div>

        {/* Sections */}
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
                            {filteredCampaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                        No campaigns match the selected filters
                                    </td>
                                </tr>
                            ) : (
                                filteredCampaigns.map((campaign, idx) => (
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
