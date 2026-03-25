import React from 'react';
import {
  Video,
  Home,
  BookOpen,
  FileText,
  Scale,
  Sliders,
  ChevronRight,
  Smartphone,
  HelpCircle,
  Package,
  Settings2,
  Layers,
  FolderTree,
  LayoutGrid,
  TrendingUp,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ContentHubProps {
  setActiveTab: (tab: string) => void;
}

const PICKER_ITEMS = [
  { id: 'training-content', label: 'Training Content', desc: 'Manage Picker app training videos', icon: Video },
];

const CUSTOMER_ITEMS = [
  {
    id: 'applications',
    label: 'Applications',
    desc: 'Cross-app module access and app-level configuration entry',
    icon: LayoutGrid,
  },
  {
    id: 'content-hub-categories',
    label: 'Categories & Subcategories',
    desc: 'Taxonomy CRUD; same data as Products Introduction dropdowns',
    icon: FolderTree,
  },
  { id: 'products-introduction', label: 'Products Introduction', desc: 'Single source of truth for products (category, price, GST, etc.)', icon: Package },
  { id: 'home-config', label: 'Home Config', desc: 'Hero video, search placeholder, organic tagline', icon: Settings2 },
  { id: 'customer-app-home', label: 'Customer App Home', desc: 'Section order, banners, section list', icon: Home },
  { id: 'collections', label: 'Collections', desc: 'Product sets for carousels (from Products Introduction)', icon: Layers },
  { id: 'onboarding', label: 'Onboarding Screens', desc: 'Customer app onboarding flow', icon: BookOpen },
  { id: 'cms-pages', label: 'CMS Pages', desc: 'Slug-based content pages', icon: FileText },
  { id: 'faq-management', label: 'FAQ Management', desc: 'Frequently Asked Questions', icon: HelpCircle },
  { id: 'legal-policies', label: 'Legal & Policies', desc: 'Terms of Service, Privacy Policy', icon: Scale },
];

const SHARED_ITEMS = [
  { id: 'app-settings', label: 'App Settings', desc: 'Legal, coupons, cancellation policies', icon: Sliders },
];

export function ContentHub({ setActiveTab }: ContentHubProps) {
  const totalModules = PICKER_ITEMS.length + CUSTOMER_ITEMS.length + SHARED_ITEMS.length;

  const renderCard = (item: { id: string; label: string; desc: string; icon: React.ElementType }) => {
    const Icon = item.icon;
    return (
      <Card
        key={item.id}
        className="cursor-pointer border border-[#e4e4e7] hover:border-[#e11d48]/50 hover:shadow-md transition-all group bg-white"
        onClick={() => setActiveTab(item.id)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#f4f4f5] flex items-center justify-center group-hover:bg-[#e11d48]/10 transition-colors">
              <Icon size={20} className="text-[#71717a] group-hover:text-[#e11d48]" />
            </div>
            <div>
              <CardTitle className="text-base">{item.label}</CardTitle>
              <CardDescription className="text-sm">{item.desc}</CardDescription>
            </div>
          </div>
          <ChevronRight size={20} className="text-[#a1a1aa] group-hover:text-[#e11d48]" />
        </CardHeader>
      </Card>
    );
  };

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">CMS</h1>
          <p className="text-[#71717a] text-sm">Central place to manage all app content</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-[#e4e4e7] bg-white text-sm font-medium text-[#18181b] hover:bg-[#f4f4f5] transition-colors"
        >
          <RefreshCw size={14} className="mr-1.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Total Modules</p>
            <TrendingUp className="text-emerald-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{totalModules}</p>
          <p className="text-xs text-[#71717a] mt-2">Available in CMS</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Customer App</p>
            <Home className="text-blue-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{CUSTOMER_ITEMS.length}</p>
          <p className="text-xs text-[#71717a] mt-2">Configurable modules</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Picker App</p>
            <Smartphone className="text-purple-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{PICKER_ITEMS.length}</p>
          <p className="text-xs text-[#71717a] mt-2">Training modules</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Shared Controls</p>
            <FileCheck className="text-amber-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{SHARED_ITEMS.length}</p>
          <p className="text-xs text-[#71717a] mt-2">Cross-app settings</p>
        </div>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#18181b] flex items-center gap-2">
              <Smartphone size={16} className="text-purple-600" />
              Picker App
            </h2>
            <p className="text-xs text-[#71717a] mt-1">Picker-facing content and training modules</p>
          </div>
          <Badge variant="outline" className="text-xs">{PICKER_ITEMS.length} modules</Badge>
        </div>
        <div className="p-4 grid gap-4 md:grid-cols-1">
          {PICKER_ITEMS.map(renderCard)}
        </div>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#18181b] flex items-center gap-2">
              <Home size={16} className="text-blue-600" />
              Customer App
            </h2>
            <p className="text-xs text-[#71717a] mt-1">Customer-facing CMS modules and page controls</p>
          </div>
          <Badge variant="outline" className="text-xs">{CUSTOMER_ITEMS.length} modules</Badge>
        </div>
        <div className="p-4 grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {CUSTOMER_ITEMS.map(renderCard)}
        </div>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#18181b] flex items-center gap-2">
              <Sliders size={16} className="text-amber-600" />
              Shared
            </h2>
            <p className="text-xs text-[#71717a] mt-1">Cross-app controls shared across dashboards</p>
          </div>
          <Badge variant="outline" className="text-xs">{SHARED_ITEMS.length} modules</Badge>
        </div>
        <div className="p-4 grid gap-4 md:grid-cols-1">
          {SHARED_ITEMS.map(renderCard)}
        </div>
      </div>
    </div>
  );
}
