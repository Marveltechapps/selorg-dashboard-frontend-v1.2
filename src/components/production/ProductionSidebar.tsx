import React, { useEffect, useRef, useState } from 'react';
import { Factory, ChevronDown, LogOut, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProductionFactory } from '../../contexts/ProductionFactoryContext';
import { useAuth } from '../../contexts/AuthContext';
import { createBackdropClickHandler } from '@/components/ui/modalOverlayGuards';
import { PRODUCTION_NAV_SECTIONS } from '@/layouts/sidebar/productionNavigationConfig';

interface ProductionSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function ProductionSidebar({
  activeTab,
  setActiveTab,
  onLogout,
  mobileOpen,
  onMobileClose,
}: ProductionSidebarProps) {
  const { factories, selectedFactoryId, setSelectedFactoryId, loading } = useProductionFactory();
  const { user } = useAuth();
  const [factoryDropdownOpen, setFactoryDropdownOpen] = useState(false);
  const selectedFactory = factories.find((f) => f.id === selectedFactoryId);
  const factoryWrapRef = useRef<HTMLDivElement>(null);

  const userInitials = (user?.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const roleLabel = user?.role
    ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Plant Manager';

  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of PRODUCTION_NAV_SECTIONS) {
      initial[section.category] = !(section.collapseDefault ?? false);
    }
    return initial;
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (factoryWrapRef.current && !factoryWrapRef.current.contains(e.target as Node)) {
        setFactoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {onMobileClose && (
        <div
          className={cn(
            'production-mobile-only fixed inset-0 bg-black/50 z-40 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={createBackdropClickHandler(onMobileClose)}
          aria-hidden
        />
      )}
      <div
        className={cn(
          'production-sidebar-nav w-[260px] h-screen bg-[#111827] text-[#E6E6E6] flex flex-col fixed left-0 top-0 z-50 shadow-xl border-r border-[#1F2937]',
          mobileOpen && 'is-open'
        )}
      >
        <div className="p-4 border-b border-[#1F2937]">
          <div className="flex items-center gap-2 mb-2 text-[#9E9E9E] text-[10px] uppercase font-bold tracking-wider">
            <Factory size={12} />
            <span>Current Factory</span>
          </div>
          <div className="relative" ref={factoryWrapRef}>
            {loading ? (
              <div className="w-full bg-[#1F2937] p-2.5 rounded-lg flex items-center gap-2 text-[#9E9E9E]">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : factories.length === 0 ? (
              <div className="w-full bg-[#1F2937] p-2.5 rounded-lg text-[#9E9E9E] text-sm">No factories</div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setFactoryDropdownOpen((o) => !o)}
                  className="list-none w-full bg-[#1F2937] hover:bg-[#2A3647] transition-colors p-2.5 rounded-lg flex items-center justify-between cursor-pointer border border-transparent hover:border-[#32537A] outline-none"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-sm text-white">
                      {selectedFactory?.code ?? selectedFactory?.name ?? 'Select factory'}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          selectedFactory?.status === 'operational'
                            ? 'bg-[#4ADE80] animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]'
                            : 'bg-[#FACC15]'
                        )}
                      />
                      <span
                        className={cn(
                          'text-[10px]',
                          selectedFactory?.status === 'operational' ? 'text-[#4ADE80]' : 'text-[#FACC15]'
                        )}
                      >
                        {selectedFactory?.status === 'operational' ? 'Operational' : 'Maintenance'}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    size={14}
                    className={cn('text-[#666666] transition-transform', factoryDropdownOpen && 'rotate-180')}
                  />
                </button>
                {factoryDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1F2937] border border-[#32537A] rounded-lg shadow-xl overflow-hidden z-50">
                    {factories.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setSelectedFactoryId(f.id);
                          setFactoryDropdownOpen(false);
                        }}
                        className="w-full p-2.5 hover:bg-[#2A3647] flex items-center justify-between border-b border-[#32537A]/50 last:border-0 transition-colors text-left"
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-bold text-sm text-[#E6E6E6]">{f.code}</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span
                              className={cn(
                                'w-2 h-2 rounded-full',
                                f.status === 'operational' ? 'bg-[#4ADE80]' : 'bg-[#FACC15]'
                              )}
                            />
                            <span
                              className={cn(
                                'text-[10px]',
                                f.status === 'operational' ? 'text-[#4ADE80]' : 'text-[#FACC15]'
                              )}
                            >
                              {f.status === 'operational' ? 'Operational' : 'Maintenance'}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4 custom-scrollbar">
          {PRODUCTION_NAV_SECTIONS.map((section) => {
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
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
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
                              ? 'bg-[#16A34A] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
                              : 'text-[#B3B3B3] hover:bg-[#1F2937] hover:text-white'
                          )}
                        >
                          <Icon
                            size={18}
                            className={cn(isActive ? 'text-white' : 'text-[#808080] group-hover:text-white')}
                          />
                          <span className="text-sm font-medium truncate">{item.label}</span>
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
          <div className="flex items-center gap-3 hover:bg-[#1F2937] p-2 rounded-lg cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-[#16A34A] flex items-center justify-center border border-[#14532D] text-white font-bold text-xs">
              {userInitials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-[#808080] truncate">{roleLabel}</p>
            </div>
            <button type="button" onClick={onLogout} aria-label="Log out">
              <LogOut size={16} className="text-[#666666] hover:text-[#F87171]" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
