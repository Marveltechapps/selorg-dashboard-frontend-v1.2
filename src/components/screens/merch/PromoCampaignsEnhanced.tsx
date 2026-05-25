import React, { useState, useEffect } from 'react';
import { stopModalPointerPropagation } from "@/components/ui/modalOverlayGuards";
import { TrendingUp, AlertTriangle, Loader2, Plus, Eye } from 'lucide-react';
import { promotionApi, markdownApi } from '../../../api/merch/analyticsApi';
import { toast } from 'sonner';

export function PromoCampaigns({ searchQuery = "", onNavigate = () => {} }: any) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setCampaigns(mockCampaigns);
    } catch (error) {
      setCampaigns(mockCampaigns);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} /></div>;
  }

  const filteredCampaigns = campaigns.filter(c =>
    c.campaignName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    active: campaigns.filter(c => c.status === 'ACTIVE').length,
    totalBudget: campaigns.reduce((sum: number, c: any) => sum + c.budget.totalBudget, 0),
    avgROI: (campaigns.reduce((sum: number, c: any) => sum + (c.actualMetrics?.roi || 0), 0) / campaigns.length).toFixed(1),
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Promotion Campaigns</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={16} />
          Create Campaign
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Active Campaigns</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Total Budget</p>
          <p className="text-3xl font-bold mt-1">${(stats.totalBudget / 1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Avg ROI</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{stats.avgROI}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCampaigns.map(campaign => (
          <div key={campaign.campaignId} className="bg-white rounded-lg p-4 shadow hover:shadow-lg transition">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold">{campaign.campaignName}</h3>
                <p className="text-xs text-gray-600">{campaign.campaignType}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded font-medium ${
                campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                campaign.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                campaign.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                'bg-red-100 text-red-800'
              }`}>
                {campaign.status}
              </span>
            </div>

            <div className="space-y-2 mb-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Budget Used</span>
                <span className="font-semibold">${campaign.budget.spentBudget} / ${campaign.budget.totalBudget}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${(campaign.budget.spentBudget / campaign.budget.totalBudget) * 100}%` }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ROI</span>
                <span className={`font-semibold ${campaign.actualMetrics?.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {campaign.actualMetrics?.roi || 0}%
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedCampaign(campaign)}
              className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View Details
            </button>
          </div>
        ))}
      </div>

      {selectedCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" {...stopModalPointerPropagation}>
            <h2 className="text-xl font-bold mb-4">{selectedCampaign.campaignName}</h2>
            <div className="space-y-3 text-sm mb-6">
              <div><p className="text-gray-600">Type</p><p className="font-semibold">{selectedCampaign.campaignType}</p></div>
              <div><p className="text-gray-600">Status</p><p className="font-semibold">{selectedCampaign.status}</p></div>
              <div><p className="text-gray-600">Budget</p><p className="font-semibold">${selectedCampaign.budget.totalBudget}</p></div>
            </div>
            <button
              onClick={() => setSelectedCampaign(null)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const mockCampaigns = [
  {
    campaignId: 'CAMP-001',
    campaignName: 'Summer Flash Sale',
    campaignType: 'FLASH_SALE',
    status: 'ACTIVE',
    budget: { totalBudget: 50000, spentBudget: 32000 },
    actualMetrics: { roi: 145 },
  },
  {
    campaignId: 'CAMP-002',
    campaignName: 'Loyalty Program',
    campaignType: 'LOYALTY',
    status: 'ACTIVE',
    budget: { totalBudget: 75000, spentBudget: 48000 },
    actualMetrics: { roi: 203 },
  },
  {
    campaignId: 'CAMP-003',
    campaignName: 'Bundle Deal',
    campaignType: 'BUNDLE',
    status: 'SCHEDULED',
    budget: { totalBudget: 30000, spentBudget: 0 },
    actualMetrics: { roi: 0 },
  },
  {
    campaignId: 'CAMP-004',
    campaignName: 'Seasonal Clearance',
    campaignType: 'DISCOUNT',
    status: 'COMPLETED',
    budget: { totalBudget: 60000, spentBudget: 60000 },
    actualMetrics: { roi: 98 },
  },
];
