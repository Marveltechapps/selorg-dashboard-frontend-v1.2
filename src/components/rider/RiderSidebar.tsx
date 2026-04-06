import React, { useEffect, useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { cn } from "../../lib/utils";
import { getAuthUser, type AuthUser } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RiderSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
}

function formatDetail(value: string | string[] | undefined | null): string {
  if (value === undefined || value === null) return '—';
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '—';
  }
  const s = String(value).trim();
  return s.length > 0 ? s : '—';
}

export function RiderSidebar({ activeTab, setActiveTab, onLogout }: RiderSidebarProps) {
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setProfile(getAuthUser());
  }, []);

  const initials = useMemo(() => {
    const source = profile?.name || profile?.email || 'R';
    return source
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'R';
  }, [profile?.name, profile?.email]);

  const roleLabel = profile?.role || 'Rider dashboard';

  const navItems = [
    { id: 'overview', label: 'Rider Overview', icon: Icons.LayoutDashboard },
    { id: 'hr', label: 'Rider HR & Docs', icon: Icons.Users },
    { id: 'dispatch', label: 'Dispatch Operations', icon: Icons.MapPin },
    { id: 'fleet', label: 'Fleet & Vehicle', icon: Icons.Bike },
    { id: 'escalations', label: 'Escalations', icon: Icons.AlertTriangle },
    { id: 'alerts', label: 'Alerts & Exceptions', icon: Icons.AlertTriangle },
    { id: 'analytics', label: 'Analytics & Reports', icon: Icons.BarChart3 },
    { id: 'rider-shifts', label: 'Rider Shifts', icon: Icons.CalendarClock },
    { id: 'shifts', label: 'Staff & Shifts', icon: Icons.Users2 },
    { id: 'communication', label: 'Communication Hub', icon: Icons.MessageSquare },
    { id: 'health', label: 'System Health', icon: Icons.Activity },
    { id: 'approvals', label: 'Task Approvals', icon: Icons.ClipboardCheck },
    { id: 'training-kit', label: 'Training & Kit', icon: Icons.Video },
    { id: 'group-delivery', label: 'Group Delivery', icon: Icons.Map },
  ];

  // UI toggle: hide the Communication Hub button without deleting its code/entry.
  const SHOW_COMMUNICATION_HUB = false;
  const visibleNavItems = navItems.filter((item) => {
    if (item.id === 'communication') return SHOW_COMMUNICATION_HUB;
    return true;
  });

  return (
    <div className="w-[220px] h-screen bg-[#111827] text-[#E6E6E6] flex flex-col fixed left-0 top-0 z-50 shadow-xl border-r border-[#1F2937]">
      {/* Fixed single hub (Chennai) */}
      <div className="p-4 border-b border-[#1F2937]">
        <div className="flex items-center gap-2 mb-2 text-[#9E9E9E] text-[10px] uppercase font-bold tracking-wider">
          <Icons.Store size={12} />
          <span>Current Hub</span>
        </div>
        <div className="w-full bg-[#1F2937] p-2.5 rounded-lg flex items-center justify-between border border-[#1F2937]">
          <div className="flex flex-col items-start">
            <span className="font-bold text-sm text-white">Chennai Hub</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
              <span className="text-[10px] text-[#F97316]">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full h-11 px-3 flex items-center gap-3 transition-all rounded-lg relative group",
                isActive 
                  ? "bg-[#F97316] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]" 
                  : "text-[#B3B3B3] hover:bg-[#1F2937] hover:text-white"
              )}
            >
              <Icon size={18} className={cn(isActive ? "text-white" : "text-[#808080] group-hover:text-white")} />
              <span className="text-sm font-medium truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-[#1F2937] bg-[#111827]">
        <div className="flex items-center gap-3 p-2 rounded-lg transition-colors">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex flex-1 min-w-0 items-center gap-3 text-left rounded-lg hover:bg-[#1F2937] cursor-pointer transition-colors"
          >
            <div className="w-8 h-8 shrink-0 rounded-full bg-[#F97316] flex items-center justify-center border border-[#C2410C] text-white font-bold text-xs">
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{profile?.name || 'Signed-in user'}</p>
              <p className="text-xs text-[#808080] truncate">{roleLabel}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLogout?.();
            }}
            className="shrink-0 p-1 rounded-md hover:bg-[#1F2937]"
            aria-label="Log out"
          >
            <Icons.LogOut size={16} className="text-[#666666] hover:text-[#F87171]" />
          </button>
        </div>
      </div>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md bg-white text-[#212121] border-[#E0E0E0]">
          <DialogHeader>
            <DialogTitle className="text-[#111827]">Your profile</DialogTitle>
            <DialogDescription className="text-[#757575]">
              Account details for the signed-in dashboard user.
            </DialogDescription>
          </DialogHeader>
          <dl className="grid gap-3 text-sm pt-2">
            <div className="grid grid-cols-[120px_1fr] gap-2 gap-x-4">
              <dt className="text-[#757575] font-medium">Name</dt>
              <dd className="font-medium text-[#212121] break-words">{formatDetail(profile?.name)}</dd>
              <dt className="text-[#757575] font-medium">Email</dt>
              <dd className="text-[#212121] break-all">{formatDetail(profile?.email)}</dd>
              <dt className="text-[#757575] font-medium">User ID</dt>
              <dd className="font-mono text-xs text-[#212121] break-all">{formatDetail(profile?.id)}</dd>
              <dt className="text-[#757575] font-medium">Role</dt>
              <dd className="text-[#212121]">{formatDetail(profile?.role)}</dd>
              <dt className="text-[#757575] font-medium">Hub key</dt>
              <dd className="text-[#212121] break-words">{formatDetail(profile?.hubKey)}</dd>
              <dt className="text-[#757575] font-medium">Primary store</dt>
              <dd className="font-mono text-xs text-[#212121] break-all">{formatDetail(profile?.primaryStoreId)}</dd>
              <dt className="text-[#757575] font-medium">Assigned stores</dt>
              <dd className="text-[#212121] break-words">{formatDetail(profile?.assignedStores)}</dd>
            </div>
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  );
}
