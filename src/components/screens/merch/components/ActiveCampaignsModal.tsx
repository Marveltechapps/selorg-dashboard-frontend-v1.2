import React, { useState, useEffect } from 'react';
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

interface CampaignRow {
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

export function ActiveCampaignsModal({ isOpen, onClose, onCreateCampaign, onViewDetail }: ActiveCampaignsModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [regionFilter, setRegionFilter] = useState("all-regions");
  const [typeFilter, setTypeFilter] = useState("all-types");

  useEffect(() => {
    if (isOpen) {
      const fetchCampaigns = async () => {
        try {
          setLoading(true);
          const res = await getCampaigns();
          if (res.success && res.data) {
            const rows: CampaignRow[] = res.data.map((c: any) => {
              const scope = (c.scope || '').toLowerCase();
              const region = scope.includes('europe') || scope.includes('eu') ? 'eu' : scope.includes('apac') ? 'apac' : 'na';
              const uplift = c.kpi?.value ? (c.kpi.value.startsWith('+') ? c.kpi.value : `+${c.kpi.value}`) : '-';
              const period = (c.period || '').split(/\s*[-–]\s*/);
              return {
                id: c._id || c.id,
                name: c.name,
                type: c.type || 'discount',
                status: c.status === 'Ending Soon' ? 'Ending Soon' : c.status,
                start: period[0] || '—',
                end: period[1] || '—',
                uplift,
                redemptions: c.performance?.orders ?? 0,
                region
              };
            });
            setCampaigns(rows);
          }
        } catch {
          toast.error("Failed to load campaigns");
        } finally {
          setLoading(false);
        }
      };
      fetchCampaigns();
    }
  }, [isOpen]);

  const filteredCampaigns = campaigns.filter(campaign => {
    const regionMatch = regionFilter === "all-regions" || campaign.region === regionFilter;
    const typeMatch = typeFilter === "all-types" || campaign.type === typeFilter;
    return regionMatch && typeMatch;
  });

  const handleExport = () => {
    setIsExporting(true);
    toast.info("Generating campaign report...");
    
    setTimeout(() => {
      try {
        // Create CSV content
        const headers = ["Campaign Name", "Type", "Status", "Start Date", "End Date", "Sales Uplift", "Redemptions", "Region"];
        const csvRows = filteredCampaigns.map(c => [
          `"${c.name}"`,
          c.type,
          c.status,
          c.start,
          c.end,
          c.uplift,
          c.redemptions,
          c.region.toUpperCase()
        ].join(","));
        
        const csvContent = [headers.join(","), ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        link.setAttribute("href", url);
        link.setAttribute("download", `Active_Campaigns_${regionFilter}_${typeFilter}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setIsExporting(false);
        toast.success("Report Ready", {
            description: "Active_Campaigns_List.csv has been downloaded."
        });
      } catch (error) {
        console.error("Export failed:", error);
        setIsExporting(false);
        toast.error("Export failed", {
          description: "There was an error generating your report."
        });
      }
    }, 1500);
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
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-regions">All Regions</SelectItem>
              <SelectItem value="na">North America</SelectItem>
              <SelectItem value="eu">Europe</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Campaign Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-types">All Types</SelectItem>
              <SelectItem value="discount">Discount</SelectItem>
              <SelectItem value="flash">Flash Sale</SelectItem>
              <SelectItem value="bundle">Bundle</SelectItem>
              <SelectItem value="loyalty">Loyalty</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1"></div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="animate-spin text-[#7C3AED]" size={24} />
            </div>
          ) : (
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
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell className="capitalize">{campaign.type}</TableCell>
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
              {filteredCampaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                    {campaigns.length === 0 ? 'No campaigns yet.' : 'No campaigns found matching the selected filters.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
