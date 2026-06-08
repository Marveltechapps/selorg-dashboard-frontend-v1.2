import React, { useEffect, useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { ChevronDown, Store } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAuthUser, useAuth, type AuthUser } from '@/contexts/AuthContext';
import { createBackdropClickHandler } from '@/components/ui/modalOverlayGuards';
import { RIDER_NAV_SECTIONS } from '@/layouts/sidebar/riderNavigationConfig';
import { useRiderNavCounts } from './useRiderNavCounts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RiderSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function formatDetail(value: string | string[] | undefined | null): string {
  if (value === undefined || value === null) return '—';
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '—';
  }
  const s = String(value).trim();
  return s.length > 0 ? s : '—';
}

function formatHubLabel(hubKeyOrStore?: string | null): string {
  const raw = (hubKeyOrStore && String(hubKeyOrStore).trim()) || '';
  if (!raw || raw === 'default') return 'Chennai Hub';
  return raw
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function RiderSidebar({
  activeTab,
  setActiveTab,
  onLogout,
  mobileOpen,
  onMobileClose,
}: RiderSidebarProps) {
  const { activeStoreId, user: authUser, switchStore } = useAuth();
  const counts = useRiderNavCounts();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setProfile(getAuthUser());
  }, []);

  const stores = authUser?.assignedStores?.length
    ? authUser.assignedStores
    : activeStoreId
      ? [activeStoreId]
      : profile?.primaryStoreId
        ? [profile.primaryStoreId]
        : [];

  const isMultiStore = stores.length > 1;

  const hubLabel = useMemo(
    () => formatHubLabel(authUser?.hubKey ?? activeStoreId ?? profile?.primaryStoreId),
    [authUser?.hubKey, activeStoreId, profile?.primaryStoreId]
  );

  const initials = useMemo(() => {
    const source = profile?.name || profile?.email || 'R';
    return (
      source
        .split(' ')
        .map((part) => part[0])
        .filter(Boolean)
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'R'
    );
  }, [profile?.name, profile?.email]);

  const roleLabel = profile?.role || 'Fleet Operations';

  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of RIDER_NAV_SECTIONS) {
      initial[section.category] = !(section.collapseDefault ?? false);
    }
    return initial;
  });

  const badgeFor = (key?: string) => {
    if (!key) return 0;
    return counts[key as keyof typeof counts] ?? 0;
  };

  return (
    <>
      {onMobileClose && (
        <div
          className={cn(
            'rider-mobile-only fixed inset-0 bg-black/50 z-40 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={createBackdropClickHandler(onMobileClose)}
          aria-hidden
        />
      )}
      <div
        className={cn(
          'rider-sidebar-nav w-[260px] h-screen bg-[#111827] text-[#E6E6E6] flex flex-col fixed left-0 top-0 z-50 shadow-xl border-r border-[#1F2937]',
          mobileOpen && 'is-open'
        )}
      >
        <div className="p-4 border-b border-[#1F2937]">
          <div className="flex items-center gap-2 mb-2 text-[#9E9E9E] text-[10px] uppercase font-bold tracking-wider">
            <Store size={12} />
            <span>Delivery Hub</span>
          </div>
          {isMultiStore ? (
            <Select value={activeStoreId || ''} onValueChange={(v) => switchStore(v)}>
              <SelectTrigger className="w-full bg-[#1F2937] border-[#374151] text-white h-10">
                <SelectValue placeholder="Select hub" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatHubLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="w-full bg-[#1F2937] p-2.5 rounded-lg flex items-center justify-between border border-[#374151]">
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm text-white">{hubLabel}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                  <span className="text-[10px] text-[#F97316]">Active</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4 custom-scrollbar">
          {RIDER_NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter((item) => !item.hidden);
            if (visibleItems.length === 0) return null;
            const isOpen = sectionOpen[section.category] ?? true;
            return (
              <div key={section.category}>
                <button
                  type="button"
                  onClick={() =>
                    setSectionOpen((prev) => ({ ...prev, [section.category]: !isOpen }))
                  }
                  className="w-full px-3 mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#64748B] hover:text-[#94A3B8]"
                >
                  {section.category}
                  <ChevronDown size={12} className={cn('transition-transform', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        activeTab === item.id || (item.aliases?.includes(activeTab) ?? false);
                      const count = badgeFor(item.badgeKey);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id);
                            onMobileClose?.();
                          }}
                          className={cn(
                            'w-full h-11 px-3 flex items-center gap-3 transition-all rounded-lg relative group',
                            isActive
                              ? 'bg-[#F97316] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
                              : 'text-[#B3B3B3] hover:bg-[#1F2937] hover:text-white'
                          )}
                        >
                          <Icon
                            size={18}
                            className={cn(isActive ? 'text-white' : 'text-[#808080] group-hover:text-white')}
                          />
                          <span className="text-sm font-medium truncate flex-1 text-left">{item.label}</span>
                          <NavBadge count={count} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

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
    </>
  );
}
