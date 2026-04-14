import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, 
  LayoutGrid,
  Database, 
  Users, 
  UserCheck,
  ShoppingBag, 
  Tag, 
  Headphones, 
  ShieldAlert, 
  BarChart3, 
  Bell, 
  Map, 
  Link, 
  FileCheck, 
  FileText,
  History, 
  Cpu, 
  Home,
  Smartphone,
  LogOut,
  Globe,
  BookOpen,
  Sliders,
  Scale,
  UserPlus,
  HelpCircle,
} from 'lucide-react';
import { cn } from "../../lib/utils";
import { DASHBOARD_BRANDS } from '@/utils/dashboardFavicon';
import { getAuthUser, type AuthUser } from '@/contexts/AuthContext';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AdminSidebar({ activeTab, setActiveTab, onLogout, mobileOpen, onMobileClose }: AdminSidebarProps) {
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const cmsChildTabs = useMemo(
    () =>
      new Set([
        'applications',
        'customer-app-home',
        'onboarding',
        'app-settings',
        'app-cms',
        'cms-pages',
        'faq-management',
        'home-config',
        'products-introduction',
        'content-hub-categories',
        'collections',
      ]),
    []
  );

  useEffect(() => {
    setProfile(getAuthUser());
  }, []);

  const initials = useMemo(() => {
    const source = profile?.name || profile?.email || 'A';
    return source
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'A';
  }, [profile?.name, profile?.email]);

  const adminBrand = DASHBOARD_BRANDS.admin;
  const [c1, c2] = adminBrand.colors;

  const navItems = [
    { category: "Control Room", items: [
      { id: 'citywide', label: 'Citywide Control', icon: Globe },
    ]},
    { category: "Platform Settings", items: [
      { id: 'picker-management', label: 'Picker Management', icon: UserPlus },
      { id: 'master-data', label: 'Master Data', icon: Database },
      { id: 'users', label: 'Users & Roles', icon: Users },
      { id: 'customers', label: 'Customers', icon: UserCheck },
      { id: 'catalog', label: 'Catalog', icon: ShoppingBag },
      { id: 'pricing', label: 'Coupons', icon: Tag },
      { id: 'legal-policies', label: 'Legal & Policies', icon: Scale },
    ]},
    { category: "Operational Engines", items: [
      { id: 'support', label: 'Support Center', icon: Headphones },
      { id: 'fraud', label: 'Fraud & Risk', icon: ShieldAlert },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'geofence', label: 'Geofence Manager', icon: Map },
      { id: 'compliance', label: 'Compliance', icon: FileCheck },
      { id: 'legal-documents', label: 'Legal Documents', icon: FileText, href: '/legal' },
    ]},
    { category: "System & App", items: [
      { id: 'content-hub', label: 'CMS', icon: LayoutGrid },
      { id: 'audit', label: 'Audit Logs', icon: History },
      { id: 'system-tools', label: 'System Tools', icon: Cpu },
    ]}
  ];

  return (
    <>
      {/* Mobile overlay */}
      {onMobileClose && (
        <div
          className={cn(
            "admin-mobile-only fixed inset-0 bg-black/50 z-40 transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={onMobileClose}
          aria-hidden
        />
      )}
      <div className={cn(
        "admin-sidebar-nav w-[260px] h-screen bg-[#09090b] text-[#a1a1aa] flex flex-col fixed left-0 top-0 z-50 shadow-xl border-r border-[#27272a]",
        mobileOpen && "is-open"
      )}>
      {/* Header */}
      <div className="p-4 border-b border-[#27272a] flex items-center min-h-[86px]">
        <div className="flex items-center gap-2 text-white">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(225,29,72,0.5)]"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
          >
             <span
               className="text-white select-none"
               style={{ fontFamily: "'Recursive', system-ui, sans-serif", fontWeight: 800, fontSize: 16, lineHeight: 1 }}
             >
               {adminBrand.initial}
             </span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">Admin Operations</h1>
            <p className="text-[10px] text-[#e11d48] font-bold tracking-wider uppercase mt-1">Secure Access Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
        {navItems.map((section, idx) => (
          <div key={idx}>
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-[#52525b] mb-2">
              {section.category}
            </h3>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  activeTab === item.id || (item.id === 'content-hub' && cmsChildTabs.has(activeTab));
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if ((item as any).href) {
                        window.location.href = (item as any).href;
                        return;
                      }
                      setActiveTab(item.id);
                      onMobileClose?.();
                    }}
                    className={cn(
                      "w-full h-9 px-3 flex items-center gap-3 transition-all rounded-md relative group",
                      isActive 
                        ? "bg-[#e11d48] text-white shadow-[0_1px_8px_rgba(225,29,72,0.4)]" 
                        : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#e4e4e7]"
                    )}
                  >
                    <Icon size={16} className={cn(isActive ? "text-white" : "text-[#71717a] group-hover:text-white")} />
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-[#27272a] bg-[#09090b]">
        <div className="flex items-center gap-3 hover:bg-[#18181b] p-2 rounded-lg cursor-pointer transition-colors group">
          <div className="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center border border-[#3f3f46] text-[#e11d48] font-bold text-xs group-hover:bg-[#e11d48] group-hover:text-white transition-colors">
            {initials}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-[#e4e4e7] truncate">{profile?.name || 'Admin User'}</p>
            <p className="text-xs text-[#71717a] truncate">{profile?.roleName || profile?.accessLevel || 'Admin'}</p>
          </div>
          <button onClick={onLogout}>
            <LogOut size={16} className="text-[#71717a] hover:text-[#f87171]" />
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
