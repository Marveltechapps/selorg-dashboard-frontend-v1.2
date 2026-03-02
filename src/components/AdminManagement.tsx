import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { AdminSidebar } from './admin/AdminSidebar';
import { AdminTopBar } from './admin/AdminTopBar';
import { CitywideControl } from './screens/admin/CitywideControl';
import { MasterData } from './screens/admin/MasterData';
import { UserManagement } from './screens/admin/UserManagement';
import { CatalogManagement } from './screens/admin/CatalogManagement';
import { PricingManagement } from './screens/admin/PricingManagement';
import { StoreWarehouseManagement } from './screens/admin/StoreWarehouseManagement';
import { SystemConfiguration } from './screens/admin/SystemConfiguration';
import { FinanceRules } from './screens/admin/FinanceRules';
import { SupportCenter } from './screens/admin/SupportCenter';
import { FraudRiskHub } from './screens/admin/FraudRiskHub';
import { AnalyticsDashboard } from './screens/admin/AnalyticsDashboard';
import { NotificationManager } from './screens/admin/NotificationManager';
import { GeofenceManager } from './screens/admin/GeofenceManager';
import { IntegrationManager } from './screens/admin/IntegrationManager';
import { ComplianceCenter } from './screens/admin/ComplianceCenter';
import { AuditLogs } from './screens/admin/AuditLogs';
import { CustomerAppHome } from './screens/admin/CustomerAppHome';
import { AppCMS } from './screens/admin/AppCMS';
import { OnboardingManagement } from './screens/admin/OnboardingManagement';
import { ApplicationsManagement } from './screens/admin/ApplicationsManagement';
import { SystemTools } from './screens/admin/SystemTools';
import { CustomerManagement } from './screens/admin/CustomerManagement';
import { CustomerAppSettings } from './screens/admin/CustomerAppSettings';
import { LegalPoliciesManagement } from './screens/admin/LegalPoliciesManagement';
import { 
  Tag, 
  Store, 
  Settings, 
  CreditCard, 
  Headphones, 
  ShieldAlert, 
  BarChart3, 
  Bell, 
  Map as MapIcon, 
  Link, 
  FileCheck,
  History,
  ShoppingCart,
  Smartphone
} from 'lucide-react';

export interface BreadcrumbSegment {
  label: string;
  onClick?: () => void;
}

const TAB_LABELS: Record<string, string> = {
  'citywide': 'Citywide Control',
  'master-data': 'Master Data',
  'users': 'Users & Roles',
  'customers': 'Customers',
  'catalog': 'Catalog',
  'pricing': 'Pricing & Promo',
  'store-config': 'Store & Warehouse',
  'system-config': 'System Config',
  'finance': 'Finance Rules',
  'legal-policies': 'Legal & Policies',
  'support': 'Support Center',
  'fraud': 'Fraud & Risk',
  'analytics': 'Analytics',
  'notifications': 'Notifications',
  'geofence': 'Geofence Manager',
  'integrations': 'Integrations',
  'compliance': 'Compliance',
  'audit': 'Audit Logs',
  'system-tools': 'System Tools',
  'applications': 'Applications',
  'customer-app-home': 'Customer App Home',
  'onboarding': 'Onboarding Screens',
  'app-settings': 'App Settings',
  'app-cms': 'App CMS',
};

function LayoutBreadcrumb({ items }: { items: BreadcrumbSegment[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm mb-6" aria-label="Breadcrumb">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#a1a1aa]" />}
            {isLast ? (
              <span className="text-[#18181b] font-medium">{item.label}</span>
            ) : item.onClick ? (
              <button
                onClick={item.onClick}
                className="text-[#71717a] hover:text-[#18181b] transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span className="text-[#71717a]">{item.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

/* --- Inline Components for Config & Ops Screens to reduce file count while maintaining functionality --- */

function PlaceholderScreen({ title, icon: Icon, description }: { title: string, icon: any, description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[600px] text-center p-8 bg-white border border-[#e4e4e7] rounded-xl shadow-sm border-dashed">
      <div className="w-16 h-16 bg-[#f4f4f5] rounded-full flex items-center justify-center mb-6">
        <Icon size={32} className="text-[#a1a1aa]" />
      </div>
      <h2 className="text-2xl font-bold text-[#18181b] mb-2">{title}</h2>
      <p className="text-[#71717a] max-w-md">{description}</p>
      <button className="mt-6 px-4 py-2 bg-[#18181b] text-white font-medium rounded-lg hover:bg-[#27272a]">
        Configure Module
      </button>
    </div>
  );
}

function ConfigScreen({ type }: { type: 'pricing' | 'store' | 'system' | 'finance' }) {
    const configMap = {
        pricing: { title: "Pricing & Promotions", icon: Tag, desc: "Manage base pricing, surge multipliers, and discount campaigns." },
        store: { title: "Store & Warehouse Config", icon: Store, desc: "Set operational hours, delivery radii, and capacity limits." },
        system: { title: "System Configuration", icon: Settings, desc: "Global SLA rules, dispatch logic, and API keys." },
        finance: { title: "Finance Rules", icon: CreditCard, desc: "Tax settings, payout cycles, and reconciliation rules." },
    };
    const { title, icon, desc } = configMap[type];
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[#18181b]">{title}</h1>
                    <p className="text-[#71717a] text-sm">{desc}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 border border-[#e4e4e7] rounded-xl shadow-sm">
                    <h3 className="font-bold text-[#18181b] mb-4">Global Settings</h3>
                    <div className="space-y-4">
                        {[1,2,3].map(i => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="text-sm text-[#52525b]">Configuration Key {i}</span>
                                <div className="w-12 h-6 bg-[#e4e4e7] rounded-full relative cursor-pointer">
                                    <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 shadow-sm"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-6 border border-[#e4e4e7] rounded-xl shadow-sm">
                     <h3 className="font-bold text-[#18181b] mb-4">Rule Engine</h3>
                     <div className="p-4 bg-[#f4f4f5] rounded-lg text-center text-sm text-[#71717a]">
                         No active rules. <button className="text-[#e11d48] font-bold hover:underline">Create Rule</button>
                     </div>
                </div>
            </div>
        </div>
    );
}

function OpsScreen({ type }: { type: 'support' | 'fraud' | 'analytics' | 'notifications' | 'geofence' | 'integrations' | 'compliance' | 'audit' }) {
     const opsMap: any = {
        support: { title: "Customer Support Center", icon: Headphones, desc: "Ticket management and issue escalation." },
        fraud: { title: "Fraud & Risk Hub", icon: ShieldAlert, desc: "Monitor suspicious activity and block devices." },
        analytics: { title: "Analytics & Insights", icon: BarChart3, desc: "Deep dive into business performance metrics." },
        notifications: { title: "Notification Manager", icon: Bell, desc: "Push campaigns and automated alerts." },
        geofence: { title: "Geofence Manager", icon: MapIcon, desc: "Edit delivery zones and service areas." },
        integrations: { title: "Integration Manager", icon: Link, desc: "Manage third-party APIs and webhooks." },
        compliance: { title: "Compliance Center", icon: FileCheck, desc: "Regulatory documents and audit trails." },
        audit: { title: "Audit Logs", icon: History, desc: "Comprehensive system activity timeline." },
    };
    const { title, icon, desc } = opsMap[type];

    if (type === 'geofence') {
        return (
            <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-[#18181b]">{title}</h1>
                        <p className="text-[#71717a] text-sm">{desc}</p>
                    </div>
                     <div className="flex gap-2">
                        <button className="px-3 py-1.5 bg-white border border-[#e4e4e7] text-[#18181b] rounded text-sm font-medium">Draw Polygon</button>
                        <button className="px-3 py-1.5 bg-[#18181b] text-white rounded text-sm font-medium">Save Changes</button>
                    </div>
                </div>
                <div className="bg-[#e4e4e7] w-full h-[600px] rounded-xl border border-[#d4d4d8] relative flex items-center justify-center overflow-hidden">
                     <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/OpenStreetMap_Logo_2011.svg/1024px-OpenStreetMap_Logo_2011.svg.png')] bg-center bg-no-repeat bg-contain"></div>
                     <span className="bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-sm font-bold text-[#18181b] z-10">
                         Interactive Map Placeholder
                     </span>
                     {/* Mock Polygons */}
                     <div className="absolute top-1/4 left-1/4 w-64 h-64 border-4 border-[#e11d48]/50 bg-[#e11d48]/10 rounded-full flex items-center justify-center">
                         <span className="bg-white text-xs font-bold px-2 py-1 rounded text-[#e11d48]">No-Service Zone</span>
                     </div>
                     <div className="absolute bottom-1/4 right-1/4 w-96 h-48 border-4 border-emerald-500/50 bg-emerald-500/10 skew-x-12 flex items-center justify-center">
                         <span className="bg-white text-xs font-bold px-2 py-1 rounded text-emerald-600">Standard Delivery</span>
                     </div>
                </div>
            </div>
        )
    }

    return <PlaceholderScreen title={title} icon={icon} description={desc} />;
}

export function AdminManagement({ onLogout }: { onLogout: () => void }) {
  const { activeTab, setActiveTab } = useDashboardNavigation('citywide');
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [breadcrumbOverride, setBreadcrumbOverride] = React.useState<BreadcrumbSegment[] | null>(null);

  React.useEffect(() => {
    setBreadcrumbOverride(null);
  }, [activeTab]);

  const breadcrumbs: BreadcrumbSegment[] = breadcrumbOverride || [
    { label: 'Admin' },
    { label: TAB_LABELS[activeTab] || activeTab },
  ];

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-[#18181b] font-sans">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <div className="admin-content-area">
        <AdminTopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="pt-[88px] px-4 sm:px-6 md:px-8 pb-12 min-h-screen">
            <LayoutBreadcrumb items={breadcrumbs} />
            {activeTab === 'citywide' && <CitywideControl />}
            {activeTab === 'master-data' && <MasterData />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'customers' && <CustomerManagement onBreadcrumbChange={setBreadcrumbOverride} />}
            {activeTab === 'catalog' && <CatalogManagement />}
            {activeTab === 'pricing' && <PricingManagement />}
            {activeTab === 'store-config' && <StoreWarehouseManagement />}
            {activeTab === 'system-config' && <SystemConfiguration />}
            {activeTab === 'finance' && <FinanceRules />}
            {activeTab === 'legal-policies' && <LegalPoliciesManagement />}
            {activeTab === 'support' && <SupportCenter />}
            {activeTab === 'fraud' && <FraudRiskHub />}
            {activeTab === 'analytics' && <AnalyticsDashboard />}
            {activeTab === 'notifications' && <NotificationManager />}
            {activeTab === 'geofence' && <GeofenceManager />}
            {activeTab === 'integrations' && <IntegrationManager />}
            {activeTab === 'compliance' && <ComplianceCenter />}
            {activeTab === 'audit' && <AuditLogs />}
            {activeTab === 'system-tools' && <SystemTools />}
            {activeTab === 'applications' && <ApplicationsManagement />}
            {activeTab === 'customer-app-home' && <CustomerAppHome onPreview={() => setActiveTab('app-cms')} />}
            {activeTab === 'onboarding' && <OnboardingManagement />}
            {activeTab === 'app-settings' && <CustomerAppSettings />}
            {activeTab === 'app-cms' && <AppCMS onEditContent={() => setActiveTab('customer-app-home')} />}
        </main>
      </div>
    </div>
  );
}