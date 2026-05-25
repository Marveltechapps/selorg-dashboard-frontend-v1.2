import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../../ui/table";
import { Badge } from "../../../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { Download, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getCampaigns } from '../../../../api/merch/merchApi';

interface ActiveCampaignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCampaign: () => void;
  onViewDetail?: (campaign: CampaignRow) => void;
}

export interface CampaignRow {
  id: string;
  name: string;
  type: string;
  status: string;
  start: string;
  end: string;
  uplift: string;
  redemptions: number;
  region: string;
}

function resolveRegionCode(c: Record<string, unknown>): string {
  if (c.region && typeof c.region === 'string') {
    return c.region.toLowerCase();
  }
  const scope = String(c.scope || '').toLowerCase();
  if (scope.includes('europe') || scope.includes('eu') || scope.includes('europe-west')) return 'eu';
  if (scope.includes('apac') || scope.includes('asia')) return 'apac';
  if (scope.includes('global') || scope.includes('all')) return 'all';
  return 'na';
}

function mapCampaignToRow(c: Record<string, unknown>): CampaignRow {
  const kpi = c.kpi as { value?: string } | undefined;
  const perf = c.performance as { orders?: number } | undefined;
  const uplift = kpi?.value
    ? (String(kpi.value).startsWith('+') ? String(kpi.value) : `+${kpi.value}`)
    : '-';
  const period = String(c.period || '').split(/\s*[-–]\s*/);
  const now = Date.now();
  let status = String(c.status || 'Draft');
  const endsAt = c.endsAt ? new Date(String(c.endsAt)).getTime() : NaN;
  if (status === 'Active' && !Number.isNaN(endsAt)) {
    const days = (endsAt - now) / (24 * 60 * 60 * 1000);
    if (days >= 0 && days <= 3) status = 'Ending Soon';
  }

  return {
    id: String(c._id ?? c.id ?? ''),
    name: String(c.name ?? ''),
    type: String(c.type ?? 'Discount'),
    status,
    start: period[0]?.trim() || '—',
    end: period[1]?.trim() || '—',
    uplift,
    redemptions: typeof perf?.orders === 'number' ? perf.orders : 0,
    region: resolveRegionCode(c),
  };
}

export function ActiveCampaignsModal({ isOpen, onClose, onCreateCampaign, onViewDetail }: ActiveCampaignsModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [regionFilter, setRegionFilter] = useState('all-regions');
  const [typeFilter, setTypeFilter] = useState('all-types');

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCampaigns({
        running: true,
        region: regionFilter === 'all-regions' ? undefined : regionFilter,
        typeFilter: typeFilter === 'all-types' ? undefined : typeFilter,
      });
      const list = res?.data;
      if (res.success && Array.isArray(list)) {
        setCampaigns(list.map((c) => mapCampaignToRow(c as unknown as Record<string, unknown>)));
      } else {
        setCampaigns([]);
      }
    } catch {
      toast.error('Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [regionFilter, typeFilter]);

  useEffect(() => {
    if (isOpen) {
      fetchCampaigns();
    }
  }, [isOpen, fetchCampaigns]);

  const handleExport = () => {
    if (campaigns.length === 0) {
      toast.error('No campaigns to export for the current filters');
      return;
    }
    setIsExporting(true);
    try {
      const headers = ['Campaign Name', 'Type', 'Status', 'Start Date', 'End Date', 'Sales Uplift', 'Redemptions', 'Region'];
      const csvRows = campaigns.map((c) =>
        [
          `"${c.name.replace(/"/g, '""')}"`,
          c.type,
          c.status,
          c.start,
          c.end,
          c.uplift,
          c.redemptions,
          c.region.toUpperCase(),
        ].join(',')
      );

      const csvContent = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Active_Campaigns_${regionFilter}_${typeFilter}_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Report Ready', { description: 'Campaign list exported successfully.' });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed', { description: 'There was an error generating your report.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <div className="flex justify-between items-center pr-6">
            <div>
              <DialogTitle className="text-xl font-bold">Active Campaigns</DialogTitle>
              <DialogDescription>
                Overview of all currently running promotional campaigns.
              </DialogDescription>
            </div>
            <Button onClick={() => { onClose(); onCreateCampaign(); }} className="bg-[#7C3AED] hover:bg-[#6D28D9]">
              <Plus size={16} className="mr-2" />
              Create Campaign
            </Button>
          </div>
        </DialogHeader>

        <div className="flex gap-3 my-2">
          <Select
            value={regionFilter}
            onValueChange={setRegionFilter}
            disabled={loading}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-regions">All Regions</SelectItem>
              <SelectItem value="na">North America</SelectItem>
              <SelectItem value="eu">Europe</SelectItem>
              <SelectItem value="apac">APAC</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={typeFilter}
            onValueChange={setTypeFilter}
            disabled={loading}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Campaign Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-types">All Types</SelectItem>
              <SelectItem value="discount">Discount</SelectItem>
              <SelectItem value="flash">Flash Sale</SelectItem>
              <SelectItem value="bundle">Bundle</SelectItem>
              <SelectItem value="bogo">BOGO</SelectItem>
              <SelectItem value="loyalty">Loyalty</SelectItem>
              <SelectItem value="clearance">Clearance</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="icon"
            onClick={handleExport}
            disabled={isExporting || loading}
            title="Export filtered campaigns"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 z-10 flex justify-center items-center">
              <Loader2 className="animate-spin text-[#7C3AED]" size={24} />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Campaign Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Sales Uplift</TableHead>
                <TableHead className="text-right">Redemption</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>{campaign.type}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${
                        campaign.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                        campaign.status === 'Ending Soon' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        campaign.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{campaign.start}</TableCell>
                  <TableCell>{campaign.end}</TableCell>
                  <TableCell className="text-right font-bold text-green-600">{campaign.uplift}</TableCell>
                  <TableCell className="text-right">{campaign.redemptions}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#7C3AED]"
                      onClick={() => { onClose(); onViewDetail?.(campaign); }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                    No active or scheduled campaigns match the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
