import React, { useState } from 'react';
import { MerchSidebar } from './merch/MerchSidebar';
import { MerchTopBar } from './merch/MerchTopBar';
import { MerchOverview } from './screens/merch/MerchOverview';
import { CatalogMerch } from './screens/merch/CatalogMerch';
import { PricingEngine } from './screens/merch/PricingEngine';
import { PromoCampaigns } from './screens/merch/PromoCampaigns';
import { AllocationStock } from './screens/merch/AllocationStock';
import { GeofenceTargeting } from './screens/merch/geofence/GeofenceTargeting';
import { MerchAnalytics } from './screens/merch/MerchAnalytics';
import { MerchAlerts } from './screens/merch/MerchAlerts';
import { ComplianceApprovals } from './screens/merch/ComplianceApprovals';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';

export function MerchManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab, setActiveTab } = useDashboardNavigation('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [region, setRegion] = useState('North America');
  const [scope, setScope] = useState<'Global' | 'Local'>('Global');

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#212121] font-sans">
      <MerchSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      
      <div className="pl-[220px]">
        <MerchTopBar 
            onSearch={setSearchQuery} 
            onRegionChange={setRegion}
            onScopeChange={setScope}
            currentRegion={region}
            currentScope={scope}
            onNavigate={setActiveTab}
            searchQuery={searchQuery}
        />
        
        <main className="pt-[88px] px-8 pb-12 min-h-screen max-w-[1920px] mx-auto">
            {activeTab === 'overview' && (
                <MerchOverview 
                    onNavigate={setActiveTab} 
                    searchQuery={searchQuery} 
                    onSearchChange={setSearchQuery}
                />
            )}
            {activeTab === 'catalog' && <CatalogMerch searchQuery={searchQuery} />}
            {activeTab === 'pricing' && <PricingEngine searchQuery={searchQuery} />}
            {activeTab === 'promotions' && <PromoCampaigns searchQuery={searchQuery} region={region} scope={scope} onNavigate={setActiveTab} />}
            {activeTab === 'allocation' && <AllocationStock searchQuery={searchQuery} />}
            {activeTab === 'geofence' && <GeofenceTargeting searchQuery={searchQuery} />}
            {activeTab === 'analytics' && <MerchAnalytics searchQuery={searchQuery} onNavigate={setActiveTab} />}
            {activeTab === 'alerts' && <MerchAlerts searchQuery={searchQuery} onNavigate={setActiveTab} />}
            {activeTab === 'compliance' && <ComplianceApprovals searchQuery={searchQuery} />}
        </main>
      </div>
    </div>
  );
}
