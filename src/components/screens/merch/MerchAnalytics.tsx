import React, { useState } from 'react';
import { BarChart3, TrendingUp, Map, Download, ChevronRight, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CampaignPerformance } from './analytics/CampaignPerformance';
import { SkuSalesReport } from './analytics/SkuSalesReport';
import { RegionalInsights } from './analytics/RegionalInsights';
import { ExportReportModal } from './analytics/ExportReportModal';
import { analyticsApi } from './analytics/analyticsApi';

type AnalyticsView = 'campaign' | 'sku' | 'regional' | null;

interface MerchAnalyticsProps {
  searchQuery?: string;
  onNavigate?: (tab: string) => void;
}

export function MerchAnalytics({ searchQuery = "", onNavigate }: MerchAnalyticsProps) {
  const [activeView, setActiveView] = useState<AnalyticsView>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSeedData = async () => {
    try {
      await analyticsApi.seedData();
      setRefreshKey(k => k + 1);
      toast.success("Analytics data seeded");
    } catch {
      toast.error("Failed to seed analytics data");
    }
  };

  // Helper to render the correct component
  const renderActiveView = () => {
    switch (activeView) {
      case 'campaign':
        return <CampaignPerformance key={refreshKey} />;
      case 'sku':
        return <SkuSalesReport key={refreshKey} />;
      case 'regional':
        return <RegionalInsights key={refreshKey} onNavigate={onNavigate} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center text-gray-500 space-y-4 py-12">
            <div className="p-6 bg-gray-50 rounded-full border border-dashed border-gray-200">
              <LayoutGrid className="h-16 w-16 text-gray-300" />
            </div>
            <div>
               <h3 className="text-xl font-bold text-gray-900">Select a metric to view detailed charts</h3>
               <p className="text-sm max-w-sm mx-auto mt-2 font-medium text-gray-500">
                 Choose one of the tiles above to explore deep analytics regarding campaigns, inventory, or regional performance.
               </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 min-h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Analytics & Insights</h1>
          <p className="text-[#757575] text-sm">Explore campaign performance, SKU sales, and regional insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSeedData} className="border-gray-200">
            Seed Analytics Data
          </Button>
          <Button onClick={() => setIsExportModalOpen(true)} className="bg-[#212121] text-white hover:bg-black">
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* Tiles Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeView === 'campaign' ? 'border-primary ring-1 ring-primary bg-blue-50/30' : 'hover:border-gray-300'}`}
            onClick={() => setActiveView('campaign')}
        >
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Campaign Performance
                </CardTitle>
                <CardDescription className="text-xs">ROI analysis, uplift tracking, and redemption rates.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="text-sm font-medium text-primary flex items-center group">
                    View Details <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                 </div>
            </CardContent>
        </Card>

        <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeView === 'sku' ? 'border-primary ring-1 ring-primary bg-green-50/30' : 'hover:border-gray-300'}`}
            onClick={() => setActiveView('sku')}
        >
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    SKU Sales Report
                </CardTitle>
                <CardDescription className="text-xs">Top movers, slow inventory, and category mix.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="text-sm font-medium text-primary flex items-center group">
                    View Details <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                 </div>
            </CardContent>
        </Card>

        <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeView === 'regional' ? 'border-primary ring-1 ring-primary bg-purple-50/30' : 'hover:border-gray-300'}`}
            onClick={() => setActiveView('regional')}
        >
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Map className="h-5 w-5 text-purple-600" />
                    Regional Insights
                </CardTitle>
                <CardDescription className="text-xs">Zone-wise performance and customer demographics.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="text-sm font-medium text-primary flex items-center group">
                    View Details <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                 </div>
            </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-[500px] bg-white rounded-xl border border-[#E0E0E0] shadow-sm p-6 overflow-y-auto">
         {renderActiveView()}
      </div>

      <ExportReportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
    </div>
  );
}
