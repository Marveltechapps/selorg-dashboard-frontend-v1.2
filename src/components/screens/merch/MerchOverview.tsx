import React, { useState, useEffect } from 'react';
import { Megaphone, ShoppingBag, TrendingUp, AlertCircle, Tag, ArrowRight, MoreHorizontal, Loader2, Calendar, FileText, Search } from 'lucide-react';
import { ActiveCampaignsModal } from './components/ActiveCampaignsModal';
import { PromoUpliftModal } from './components/PromoUpliftModal';
import { StockConflictsModal } from './components/StockConflictsModal';
import { ReportModal } from './components/ReportModal';
import { CampaignAnalyticsModal } from './components/CampaignAnalyticsModal';
import { ExtendCampaignModal } from './components/ExtendCampaignModal';
import { Button } from "../../ui/button";
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { toast } from "sonner";
import { getMerchStats, getCampaigns } from '../../../api/merch/merchApi';
import { setOpenPendingUpdates } from './PricingEngine';

import { CampaignDrawer } from './components/CampaignDrawer';

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: string;
  trendUp?: boolean;
  icon?: React.ReactNode;
  color?: string;
  onClick?: () => void;
}

function MetricCard({ label, value, subValue, trend, trendUp, icon, color = "purple", onClick }: MetricCardProps) {
  return (
    <div 
        onClick={onClick}
        className={`bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm transition-all hover:shadow-md cursor-pointer group relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-gray-50 opacity-50 rounded-bl-3xl pointer-events-none group-hover:to-gray-100 transition-all" />
      
      <div className="flex justify-between items-start mb-2 relative z-10">
        <span className="text-[#757575] font-medium text-xs uppercase tracking-wider">{label}</span>
        {icon && <div className={`text-${color}-500 p-1.5 bg-${color}-50 rounded-lg group-hover:scale-110 transition-transform`}>{icon}</div>}
      </div>
      <div className="flex items-end gap-2 relative z-10">
        <span className="text-2xl font-bold text-[#212121]">{value}</span>
        {subValue && <span className="text-sm text-[#757575] mb-1">{subValue}</span>}
      </div>
      {trend && (
        <div className={`text-xs font-medium mt-2 flex items-center gap-1 relative z-10 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          <span>{trendUp ? '↑' : '↓'}</span>
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

interface MerchOverviewProps {
  onNavigate?: (tab: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

interface Campaign {
    id: string;
    name: string;
    type: string;
    status: 'Active' | 'Scheduled' | 'Ending Soon' | 'Expired';
    uplift: string;
    redemption: string;
    startDate: string;
    endDate: string;
}

export function MerchOverview({ onNavigate, searchQuery = "", onSearchChange }: MerchOverviewProps) {
  // Modal States
  const [isActiveCampaignsOpen, setIsActiveCampaignsOpen] = useState(false);
  const [isPromoUpliftOpen, setIsPromoUpliftOpen] = useState(false);
  const [isStockConflictsOpen, setIsStockConflictsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isCampaignAnalyticsOpen, setIsCampaignAnalyticsOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isCampaignDrawerOpen, setIsCampaignDrawerOpen] = useState(false);
  const [selectedCampaignData, setSelectedCampaignData] = useState<any>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | undefined>(undefined);

  // Data State - Using Real API
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>({
    activeCampaigns: { value: "0", trend: "", trendUp: true },
    promoUplift: { value: "+0%", trend: "vs last month", trendUp: true },
    priceChanges: { value: "0", subValue: "Pending", trend: "Needs approval", trendUp: false },
    stockConflicts: { value: "0", trend: "High Priority", trendUp: false }
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Load data from API
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [statsResp, campaignsResp] = await Promise.all([
          getMerchStats(),
          getCampaigns({ status: 'active' })
        ]);
        if (!mounted) return;
        
        if (statsResp.success && statsResp.data) {
          setStats({
            activeCampaigns: statsResp.data.activeCampaigns || stats.activeCampaigns,
            promoUplift: statsResp.data.promoUplift || stats.promoUplift,
            priceChanges: statsResp.data.priceChanges || stats.priceChanges,
            stockConflicts: statsResp.data.stockConflicts || stats.stockConflicts
          });
        }
        
        if (campaignsResp.success && campaignsResp.data) {
          const formattedCampaigns = campaignsResp.data.map((c: any) => ({
            id: c._id || c.id,
            name: c.name,
            type: c.type,
            status: c.status === 'active' ? 'Active' : c.status === 'scheduled' ? 'Scheduled' : c.status,
            uplift: c.performance?.uplift ? `+${c.performance.uplift}%` : '-',
            redemption: c.performance?.orders ? `${c.performance.orders.toLocaleString()} uses` : '0 uses',
            startDate: c.startDate ? new Date(c.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
            endDate: c.endDate ? new Date(c.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
          }));
          setCampaigns(formattedCampaigns);
        }
      } catch (err) {
        console.error('Failed to load merch data', err);
        toast.error('Failed to load merch overview');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filteredCampaigns = campaigns.filter(campaign => 
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCampaignAction = async (action: string, campaign: Campaign) => {
    switch (action) {
        case 'analytics':
            setSelectedCampaign(campaign.name);
            setIsCampaignAnalyticsOpen(true);
            break;
        case 'extend':
            setSelectedCampaign(campaign.name);
            setIsExtendOpen(true);
            break;
        case 'edit':
            toast.success(`Opening Campaign Builder for "${campaign.name}"...`);
            onNavigate?.('promotions');
            break;
        case 'clone':
            toast.success(`Campaign "${campaign.name}" cloned to drafts.`);
            break;
        case 'detail': {
            const startD = (campaign as any).startDate ?? (campaign as any).start ?? '';
            const endD = (campaign as any).endDate ?? (campaign as any).end ?? '';
            const red = (campaign as any).redemption ?? (campaign as any).redemptions ?? '0 uses';
            setSelectedCampaignData({
                ...campaign,
                _id: campaign.id,
                tagline: `${(campaign as any).type || 'Promo'} Campaign`,
                period: `${startD} - ${endD}`,
                owner: { name: "Sarah Miller", initial: "SM" },
                target: "Beverages, Snacks",
                kpi: { label: "Revenue Uplift", value: (campaign as any).uplift, trend: "up" }
            });
            setIsCampaignDrawerOpen(true);
            break;
        }
        case 'stop':
            setCampaigns(prev => prev.map(c => 
                c.id === campaign.id ? { ...c, status: 'Expired' } : c
            ));
            toast.error("Campaign Stopped", {
                description: `"${campaign.name}" has been moved to expired.`
            });
            break;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 text-[#7C3AED] animate-spin" />
        <p className="text-gray-500 font-medium">Loading Merchandising Overview...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Merchandising Overview</h1>
          <p className="text-[#757575] text-sm">Campaign performance, SKU visibility, and pricing alerts</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="bg-white"
            onClick={() => setIsReportOpen(true)}
          >
            View Report
          </Button>
          <Button 
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
            onClick={() => {
                toast.success("Initializing Campaign Builder...");
                onNavigate?.('promotions');
            }}
          >
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label="Active Campaigns" 
          value={stats?.activeCampaigns?.value || "0"} 
          trend={stats?.activeCampaigns?.trend || "0 ending soon"}
          trendUp={stats?.activeCampaigns?.trendUp}
          icon={<Megaphone size={18} />}
          color="purple"
          onClick={() => setIsActiveCampaignsOpen(true)}
        />
        <MetricCard 
          label="Promo Uplift" 
          value={stats?.promoUplift?.value || "0%"} 
          trend={stats?.promoUplift?.trend || "vs last month"}
          trendUp={stats?.promoUplift?.trendUp}
          icon={<TrendingUp size={18} />}
          color="green"
          onClick={() => setIsPromoUpliftOpen(true)}
        />
        <MetricCard 
          label="Price Changes" 
          value={stats?.priceChanges?.value || "0"} 
          subValue={stats?.priceChanges?.subValue || "Pending"}
          trend={stats?.priceChanges?.trend || "Needs approval"}
          trendUp={stats?.priceChanges?.trendUp}
          icon={<Tag size={18} />}
          color="blue"
          onClick={() => {
            onNavigate?.('pricing');
            toast.info("Navigating to Pending Price Changes...");
          }}
        />
        <MetricCard 
          label="Stock Conflicts" 
          value={stats?.stockConflicts?.value || "0"} 
          trend={stats?.stockConflicts?.trend || "High Priority"}
          trendUp={stats?.stockConflicts?.trendUp}
          icon={<AlertCircle size={18} />}
          color="red"
          onClick={() => setIsStockConflictsOpen(true)}
        />
      </div>

      {/* Top Performing Campaigns Table */}
      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-[#212121]">Top Performing Campaigns</h3>
            <span className="text-[10px] font-medium px-2 py-0.5 bg-[#F3E8FF] text-[#7E22CE] rounded-full border border-[#7E22CE]/20 flex items-center gap-1" title="Metrics refresh every 5 minutes">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7E22CE] animate-pulse"></span>
                Real-time Data
            </span>
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-[#7C3AED] hover:bg-[#F3E8FF]" onClick={() => setIsActiveCampaignsOpen(true)}>
             View All
          </Button>
        </div>
        
        {campaigns.length === 0 ? (
            <div className="p-12 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Megaphone className="text-gray-400" size={24} />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-1">No active campaigns yet</h4>
                <p className="text-gray-500 mb-4 text-sm">Create a promotional campaign to see performance here.</p>
                <Button className="bg-[#7C3AED]" onClick={() => onNavigate?.('promotions')}>Create Campaign</Button>
            </div>
        ) : filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center bg-white border-t">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="text-gray-400" size={24} />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-1">No results found</h4>
                <p className="text-gray-500 text-sm">We couldn't find any campaigns matching "{searchQuery}"</p>
                <Button 
                  variant="link" 
                  className="mt-2 text-[#7C3AED]" 
                  onClick={() => onSearchChange?.('')}
                >
                  Clear search
                </Button>
            </div>
        ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
                <tr>
                    <th className="px-6 py-3">Campaign Name</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Sales Uplift</th>
                    <th className="px-6 py-3">Redemption</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-[#E0E0E0]">
                {filteredCampaigns.map((campaign) => (
                    <tr 
                        key={campaign.id} 
                        className="hover:bg-[#FAFAFA] group transition-colors cursor-pointer"
                        onClick={() => handleCampaignAction('detail', campaign)}
                    >
                        <td className="px-6 py-4 font-medium text-[#212121]">{campaign.name}</td>
                        <td className="px-6 py-4 text-[#616161]">{campaign.type}</td>
                        <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border
                                ${campaign.status === 'Active' ? 'bg-[#DCFCE7] text-[#166534] border-green-200' : 
                                  campaign.status === 'Ending Soon' ? 'bg-[#FEF9C3] text-[#854D0E] border-yellow-200' :
                                  campaign.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-gray-100 text-gray-600 border-gray-200'}
                            `}>
                            {campaign.status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-[#166534] animate-pulse"></span>}
                            {campaign.status}
                            </span>
                        </td>
                        <td className={`px-6 py-4 font-bold ${campaign.uplift.startsWith('+') ? 'text-[#16A34A]' : 'text-[#616161]'}`}>
                            {campaign.uplift}
                        </td>
                        <td className="px-6 py-4 text-[#212121]">{campaign.redemption}</td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                {campaign.status === 'Active' && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 text-[#7C3AED] hover:text-[#6D28D9] hover:bg-[#F3E8FF] px-2"
                                        onClick={() => handleCampaignAction('analytics', campaign)}
                                    >
                                        Analytics
                                    </Button>
                                )}
                                {campaign.status === 'Ending Soon' && (
                                    <>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 text-[#7C3AED] hover:text-[#6D28D9] hover:bg-[#F3E8FF] px-2"
                                            onClick={() => handleCampaignAction('extend', campaign)}
                                        >
                                            Extend
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-gray-400 hover:text-[#7C3AED]"
                                            onClick={() => handleCampaignAction('analytics', campaign)}
                                        >
                                            <TrendingUp size={14} />
                                        </Button>
                                    </>
                                )}
                                {campaign.status === 'Scheduled' && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 text-[#7C3AED] hover:text-[#6D28D9] hover:bg-[#F3E8FF] px-2"
                                        onClick={() => handleCampaignAction('edit', campaign)}
                                    >
                                        Edit
                                    </Button>
                                )}
                                {campaign.status === 'Expired' && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 text-[#7C3AED] hover:text-[#6D28D9] hover:bg-[#F3E8FF] px-2"
                                        onClick={() => handleCampaignAction('clone', campaign)}
                                    >
                                        Clone
                                    </Button>
                                )}
                                
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                                            <MoreHorizontal size={16} />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => handleCampaignAction('detail', campaign)}>View Details</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleCampaignAction('edit', campaign)} disabled={campaign.status === 'Expired'}>Edit Campaign</DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-600" onClick={() => handleCampaignAction('stop', campaign)}>Stop Campaign</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        )}
      </div>

      {/* Modals */}
      <CampaignDrawer 
        open={isCampaignDrawerOpen} 
        onOpenChange={setIsCampaignDrawerOpen} 
        campaign={selectedCampaignData} 
        onAction={(id, action) => {
            if (action === 'Edit') {
                setIsCampaignDrawerOpen(false);
                onNavigate?.('promotions');
            } else {
                setCampaigns(prev => prev.map(c => 
                    c.id === String(id) ? { ...c, status: action as any } : c
                ));
                setSelectedCampaignData(prev => prev ? { ...prev, status: action } : null);
                toast.success(`Campaign ${action}`);
            }
        }}
      />
      <ActiveCampaignsModal 
        isOpen={isActiveCampaignsOpen} 
        onClose={() => setIsActiveCampaignsOpen(false)}
        onCreateCampaign={() => onNavigate?.('promotions')} 
        onViewDetail={(campaign) => { setIsActiveCampaignsOpen(false); handleCampaignAction('detail', campaign as any); }}
      />
      <PromoUpliftModal 
        isOpen={isPromoUpliftOpen} 
        onClose={() => setIsPromoUpliftOpen(false)}
        onOpenPricingChanges={() => {
          setIsPromoUpliftOpen(false);
          setOpenPendingUpdates(true);
          onNavigate?.('pricing');
          // Dispatch event multiple times to ensure it's caught
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('openPendingUpdates', { detail: {} }));
          }, 300);
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('openPendingUpdates', { detail: {} }));
          }, 600);
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('openPendingUpdates', { detail: {} }));
          }, 1000);
        }}
      />
      <StockConflictsModal 
        isOpen={isStockConflictsOpen} 
        onClose={() => setIsStockConflictsOpen(false)} 
      />
      <ReportModal 
        isOpen={isReportOpen} 
        onClose={() => setIsReportOpen(false)} 
      />
      <CampaignAnalyticsModal 
        isOpen={isCampaignAnalyticsOpen} 
        onClose={() => setIsCampaignAnalyticsOpen(false)}
        campaignName={selectedCampaign}
      />
      <ExtendCampaignModal
        isOpen={isExtendOpen}
        onClose={() => setIsExtendOpen(false)}
        campaignName={selectedCampaign}
      />

    </div>
  );
}
