import React, { useState, useEffect } from 'react';
import { Megaphone, Calendar, Tag, CheckCircle2, AlertCircle, Clock, User, ArrowUpRight, Search, Filter, MoreHorizontal, FileText, PauseCircle, PlayCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "../../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/tabs";
import { CampaignWizard } from "./components/CampaignWizard";
import { CampaignDrawer } from "./components/CampaignDrawer";
import { Separator } from "../../ui/separator";
import { toast } from "sonner";
import { merchApi, campaignsApi } from "./merchApi";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../ui/dropdown-menu";

interface PromoCampaignsProps {
    searchQuery?: string;
    region?: string;
    scope?: 'Global' | 'Local';
    onNavigate?: (tab: string) => void;
}

export function PromoCampaigns({ searchQuery = '', region = 'North America', scope = 'Global', onNavigate }: PromoCampaignsProps) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  
  // Load campaigns on mount - API only, no caching
  useEffect(() => {
    const loadCampaigns = async () => {
      setLoading(true);
      try {
        const result = await campaignsApi.getCampaigns();
        if (result.success && Array.isArray(result.data)) {
          setCampaigns(result.data);
        } else {
          setCampaigns([]);
        }
      } catch (error) {
        console.error('Error loading campaigns:', error);
        toast.error('Failed to load campaigns');
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    };
    loadCampaigns();
  }, []);

  const handleCampaignClick = (campaign: any) => {
    setSelectedCampaign(campaign);
    setIsDrawerOpen(true);
  };

  const handleUpdateStatus = async (id: any, newStatus: string) => {
    try {
      const result = await campaignsApi.updateCampaignStatus(id, newStatus);
      if (result.success) {
      // Update state
      setCampaigns(prev => prev.map(c => 
        (c._id === id) ? { ...c, status: newStatus } : c
      ));
      if (selectedCampaign?._id === id) {
        setSelectedCampaign({ ...selectedCampaign, status: newStatus });
      }
      toast.success(`Campaign ${newStatus} successfully`);
      } else {
        toast.error('Failed to update campaign status');
      }
    } catch (error) {
      console.error('Error updating campaign status:', error);
      toast.error('Failed to update campaign status');
    }
  };

  const handleAddCampaign = async (data: any, status: string) => {
    const period = data.startDate && data.endDate
      ? `${new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(data.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : "TBD";

    const payload = {
      name: data.name || "Untitled Campaign",
      tagline: data.description || "New Promotion",
      status,
      period,
      target: data.target || (data.skus?.length ? `${data.skus.length} SKUs` : "Selected SKUs"),
      scope: data.region || "Global",
      type: (data.type || "Discount").charAt(0).toUpperCase() + (data.type || "Discount").slice(1).toLowerCase(),
      owner: { name: data.owner || "Muthu", initial: (data.owner || "Muthu").charAt(0).toUpperCase() },
      kpi: { label: "Revenue Uplift", value: "0%", trend: "neutral" as const },
      skus: data.skus ?? [],
      ...data,
    };
    delete (payload as any)._id;

    try {
      if (editingCampaign) {
        const result = await campaignsApi.updateCampaign(editingCampaign._id, payload);
        if (result.success && result.data) {
          setCampaigns(prev => prev.map(c => (c._id ?? c.id) === (editingCampaign._id ?? editingCampaign.id) ? result.data : c));
          toast.success("Campaign Updated Successfully");
          setEditingCampaign(null);
        } else {
          toast.error("Failed to update campaign");
        }
      } else {
        const result = await campaignsApi.createCampaign(payload);
        if (result.success && result.data) {
          const created = result.data;
          setCampaigns(prev => [created, ...prev]);
          toast.success("Campaign Created Successfully");
        } else {
          toast.error("Failed to create campaign");
        }
      }
    } catch (err) {
      console.error("Campaign save error:", err);
      toast.error("Failed to save campaign");
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    // 1. Tab Filter
    if (activeTab === "all" && (c.status === "Archived" || c.status === "Stopped")) return false;
    if (activeTab === "pending" && !["Pending Review", "Pending Compliance", "Pending Pricing"].includes(c.status)) return false;
    if (activeTab === "drafts" && c.status !== "Draft") return false;
    if (activeTab === "archived" && !["Archived", "Ended", "Stopped"].includes(c.status)) return false;

    // 2. Search Filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(query);
        const matchTarget = c.target.toLowerCase().includes(query);
        const matchOwner = c.owner.name.toLowerCase().includes(query);
        if (!matchName && !matchTarget && !matchOwner) return false;
    }

    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
        case 'Active': return 'bg-green-100 text-green-700 border-green-200';
        case 'Pending Review': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case 'Scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'Draft': return 'bg-gray-100 text-gray-700 border-gray-200';
        case 'Paused': return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'Archived':
        case 'Stopped':
        case 'Ended': return 'bg-red-50 text-red-700 border-red-100';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 text-[#7C3AED] animate-spin" />
        <p className="text-gray-500 font-medium">Connecting to MongoDB...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Promotion Campaigns</h1>
          <p className="text-[#757575] text-sm">Real-time merchandising overview synced with MongoDB</p>
        </div>
        <Button 
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
            onClick={() => setIsWizardOpen(true)}
        >
          <Megaphone className="mr-2 h-4 w-4" />
          Launch Campaign
        </Button>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b rounded-none space-x-6">
          <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] px-0 py-3">All Campaigns</TabsTrigger>
          <TabsTrigger value="pending" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] px-0 py-3">
            Pending Approval
            {campaigns.filter(c => ["Pending Review", "Pending Compliance", "Pending Pricing"].includes(c.status)).length > 0 && (
                <span className="ml-2 bg-yellow-100 text-yellow-700 text-[10px] px-1.5 py-0.5 rounded-full">
                    {campaigns.filter(c => ["Pending Review", "Pending Compliance", "Pending Pricing"].includes(c.status)).length}
                </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="drafts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] px-0 py-3">
            Drafts
            {campaigns.filter(c => c.status === 'Draft').length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {campaigns.filter(c => c.status === 'Draft').length}
                </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] px-0 py-3">
            Archived
            {campaigns.filter(c => ["Archived", "Ended", "Stopped"].includes(c.status)).length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {campaigns.filter(c => ["Archived", "Ended", "Stopped"].includes(c.status)).length}
                </span>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
            {filteredCampaigns.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed">
                    <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No campaigns in database</h3>
                    <p className="text-gray-500 mb-6">Start by launching your first campaign to sync with MongoDB.</p>
                    <Button onClick={() => setIsWizardOpen(true)} variant="outline">Launch Campaign</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCampaigns.map((campaign) => (
                        <Card key={campaign._id} className="hover:shadow-md transition-all cursor-pointer group flex flex-col" onClick={() => handleCampaignClick(campaign)}>
                            <CardHeader className="p-5 pb-0">
                                <div className="flex justify-between items-start mb-4">
                                    <Badge className={`${getStatusColor(campaign.status)} hover:${getStatusColor(campaign.status)} px-2.5 py-0.5 text-[10px] uppercase tracking-wide border font-bold shadow-none`}>
                                        {campaign.status}
                                    </Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal size={16} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onNavigate?.('catalog'); }}>
                                                View SKUs in Catalog
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onNavigate?.('pricing'); }}>
                                                Open Pricing Rules
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onNavigate?.('analytics'); }}>
                                                View Analytics
                                            </DropdownMenuItem>
                                            <Separator className="my-1" />
                                            <DropdownMenuItem 
                                                className="text-red-600 focus:text-red-600"
                                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(campaign._id, 'Archived'); }}
                                            >
                                                <XCircle size={14} className="mr-2" />
                                                Archive Campaign
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="flex gap-4">
                                    <div className={`p-3 rounded-xl shrink-0 ${
                                        campaign.status === 'Active' ? 'bg-[#F3E8FF] text-[#7C3AED]' : 
                                        campaign.status === 'Pending Review' ? 'bg-yellow-50 text-yellow-600' : 
                                        'bg-gray-100 text-gray-500'
                                    }`}>
                                        <Megaphone size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#212121] leading-tight group-hover:text-[#7C3AED] transition-colors">{campaign.name}</h3>
                                        <p className="text-sm text-[#757575] mt-1">{campaign.tagline}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-5 flex-1">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2.5 text-sm text-[#616161]">
                                        <Calendar size={14} className="text-gray-400" />
                                        <span>{campaign.period}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-sm text-[#616161]">
                                        <Tag size={14} className="text-gray-400" />
                                        <span className="truncate">{campaign.target}</span>
                                    </div>
                                </div>

                                <Separator className="my-4" />

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarFallback className="text-[10px] bg-[#F3E8FF] text-[#7C3AED]">{campaign.owner?.initial ?? '?'}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-[#757575]">{campaign.owner?.name ?? '—'}</span>
                                    </div>
                                    
                                    {campaign.kpi && (
                                        <div className="text-right">
                                            <p className="text-[10px] text-[#757575] uppercase tracking-wide">{campaign.kpi.label}</p>
                                            <div className="flex items-center justify-end gap-1">
                                                <span className={`text-sm font-bold ${
                                                    campaign.kpi.trend === 'up' ? 'text-green-600' : 
                                                    campaign.kpi.trend === 'down' ? 'text-red-600' : 'text-gray-900'
                                                }`}>
                                                    {campaign.kpi.value}
                                                </span>
                                                {campaign.kpi.trend === 'up' && <ArrowUpRight size={12} className="text-green-600" />}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="p-3 bg-gray-50 border-t flex gap-2 mt-auto">
                                {campaign.status === 'Active' || campaign.status === 'Scheduled' || campaign.status === 'Paused' ? (
                                    <div className="flex w-full gap-2">
                                        <Button 
                                            className="flex-1 h-8 text-xs bg-white text-[#7C3AED] border border-[#E9D5FF] hover:bg-[#F3E8FF]" 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                handleCampaignClick(campaign); 
                                            }}
                                        >
                                            Manage
                                        </Button>
                                        <Button 
                                            className="h-8 text-xs bg-white text-red-600 border border-red-100 hover:bg-red-50" 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                handleUpdateStatus(campaign._id, 'Stopped'); 
                                            }}
                                        >
                                            Stop
                                        </Button>
                                    </div>
                                ) : campaign.status === 'Pending Review' ? (
                                    <div className="flex w-full gap-2">
                                        <Button 
                                            className="flex-1 h-8 text-xs bg-[#212121] text-white hover:bg-gray-800" 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                handleUpdateStatus(campaign._id, 'Active'); 
                                            }}
                                        >
                                            Approve
                                        </Button>
                                        <Button 
                                            className="flex-1 h-8 text-xs bg-white text-red-600 border border-gray-200 hover:bg-gray-50" 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                handleUpdateStatus(campaign._id, 'Draft'); 
                                            }}
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                ) : (
                                    <Button 
                                        className="w-full h-8 text-xs bg-white text-[#212121] border border-gray-200 hover:bg-gray-50" 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            handleCampaignClick(campaign);
                                        }}
                                    >
                                        Edit
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
      </Tabs>

      <CampaignWizard 
        open={isWizardOpen} 
        onOpenChange={(open) => {
          setIsWizardOpen(open);
          if (!open) {
            setEditingCampaign(null);
          }
        }}
        initialData={editingCampaign}
        onComplete={(data) => handleAddCampaign(data, 'Pending Review')}
        onSave={(data) => handleAddCampaign(data, 'Draft')}
      />
      <CampaignDrawer 
        open={isDrawerOpen} 
        onOpenChange={setIsDrawerOpen} 
        campaign={selectedCampaign} 
        onAction={(id, action) => {
            if (action === 'Edit') {
                const campaignToEdit = campaigns.find(c => c._id === id);
                if (campaignToEdit) {
                  setEditingCampaign(campaignToEdit);
                  setIsDrawerOpen(false);
                  setIsWizardOpen(true);
                }
            } else {
                handleUpdateStatus(id, action);
            }
        }}
      />
    </div>
  );
}
