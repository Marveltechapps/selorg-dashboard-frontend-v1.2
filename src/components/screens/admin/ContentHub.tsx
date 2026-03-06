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
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ContentHubProps {
  setActiveTab: (tab: string) => void;
}

const PICKER_ITEMS = [
  { id: 'training-content', label: 'Training Content', desc: 'Manage Picker app training videos', icon: Video },
];

const CUSTOMER_ITEMS = [
  { id: 'customer-app-home', label: 'Customer App Home', desc: 'Banners, categories, sections, products', icon: Home },
  { id: 'onboarding', label: 'Onboarding Screens', desc: 'Customer app onboarding flow', icon: BookOpen },
  { id: 'cms-pages', label: 'CMS Pages', desc: 'Slug-based content pages', icon: FileText },
  { id: 'faq-management', label: 'FAQ Management', desc: 'Frequently Asked Questions', icon: HelpCircle },
  { id: 'legal-policies', label: 'Legal & Policies', desc: 'Terms of Service, Privacy Policy', icon: Scale },
];

const SHARED_ITEMS = [
  { id: 'app-settings', label: 'App Settings', desc: 'Legal, coupons, cancellation policies', icon: Sliders },
];

export function ContentHub({ setActiveTab }: ContentHubProps) {
  const renderCard = (item: { id: string; label: string; desc: string; icon: React.ElementType }) => {
    const Icon = item.icon;
    return (
      <Card
        key={item.id}
        className="cursor-pointer hover:border-[#e11d48]/50 hover:shadow-md transition-all group"
        onClick={() => setActiveTab(item.id)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#18181b]">Content Hub</h1>
        <p className="text-[#71717a] mt-1">Central place to manage all app content</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[#52525b] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Smartphone size={16} />
          Picker App
        </h2>
        <div className="grid gap-4 md:grid-cols-1">
          {PICKER_ITEMS.map(renderCard)}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[#52525b] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Home size={16} />
          Customer App
        </h2>
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {CUSTOMER_ITEMS.map(renderCard)}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[#52525b] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Sliders size={16} />
          Shared
        </h2>
        <div className="grid gap-4 md:grid-cols-1">
          {SHARED_ITEMS.map(renderCard)}
        </div>
      </div>
    </div>
  );
}
