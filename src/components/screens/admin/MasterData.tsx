import React, { useState } from 'react';
import { Store, RefreshCw, MapPinned, Building2, Users } from 'lucide-react';
import { CitiesTab } from './tabs/CitiesTab';
import { ZonesTab } from './tabs/ZonesTab';
import { StoresTab } from './tabs/StoresTab';
import { PickersTab } from './tabs/PickersTab';
import { WarehousesTab } from './tabs/WarehousesTab';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

const TABS = [
  { value: 'warehouses', label: 'Warehouses', icon: Building2 },
  { value: 'cities', label: 'Cities', icon: MapPinned },
  { value: 'zones', label: 'Zones', icon: MapPinned },
  { value: 'stores', label: 'Stores', icon: Store },
  { value: 'pickers', label: 'Pickers', icon: Users },
] as const;

export function MasterData() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['value']>('warehouses');
  const [addStoreOpen, setAddStoreOpen] = useState(false);

  const handleRefresh = () => {
    setAddStoreOpen(false);
    toast.success('Master data view refreshed');
  };

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full relative">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Master Data Management</h1>
          <p className="text-[#71717a] text-sm">Centralized control for cities, stores, riders, and catalog masters</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as (typeof TABS)[number]['value'])} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                <Icon size={14} className="mr-1.5" /> {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="warehouses">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <WarehousesTab />
          </div>
        </TabsContent>
        <TabsContent value="cities">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <CitiesTab />
          </div>
        </TabsContent>
        <TabsContent value="zones">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <ZonesTab />
          </div>
        </TabsContent>
        <TabsContent value="stores">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <StoresTab
              openAddModal={addStoreOpen}
              onAddModalClose={() => setAddStoreOpen(false)}
            />
          </div>
        </TabsContent>
        <TabsContent value="pickers">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm min-h-[320px]">
            <PickersTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function UserManagement() {
  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">User & Role Management</h1>
          <p className="text-[#71717a] text-sm">RBAC configuration and access logs.</p>
        </div>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
                    <h3 className="font-bold text-[#18181b]">System Users</h3>
                    <button className="text-xs font-medium text-[#18181b] border border-[#e4e4e7] bg-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-[#f4f4f5]">
                        + Add User
                    </button>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-[#f9fafb] text-[#71717a] font-medium border-b border-[#e4e4e7]">
                        <tr>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3">Access Level</th>
                            <th className="px-6 py-3">Last Login</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e4e4e7]">
                        <tr>
                            <td className="px-6 py-4 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs">AD</div>
                                <div>
                                    <div className="font-bold text-[#18181b]">Admin User</div>
                                    <div className="text-xs text-[#71717a]">admin@platform.com</div>
                                </div>
                            </td>
                            <td className="px-6 py-4"><span className="px-2 py-1 bg-zinc-100 text-zinc-700 rounded border border-zinc-200 text-xs font-bold">Super Admin</span></td>
                            <td className="px-6 py-4 text-[#52525b] text-xs">Full Access (Root)</td>
                            <td className="px-6 py-4 text-[#71717a] text-xs">Just Now</td>
                        </tr>
                         <tr>
                            <td className="px-6 py-4 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">DS</div>
                                <div>
                                    <div className="font-bold text-[#18181b]">Darkstore Mgr</div>
                                    <div className="text-xs text-[#71717a]">ops@indiranagar.com</div>
                                </div>
                            </td>
                            <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200 text-xs font-bold">Store Manager</span></td>
                            <td className="px-6 py-4 text-[#52525b] text-xs">Zone 5 Only</td>
                            <td className="px-6 py-4 text-[#71717a] text-xs">2 hours ago</td>
                        </tr>
                    </tbody>
                </table>
           </div>

           <div className="space-y-6">
                <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm p-4">
                    <h3 className="font-bold text-[#18181b] mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        Roles & Permissions
                    </h3>
                    <div className="space-y-2">
                        {['Super Admin', 'City Manager', 'Store Manager', 'Finance Lead', 'Support Agent'].map((role) => (
                            <div key={role} className="flex justify-between items-center p-2 hover:bg-[#f4f4f5] rounded cursor-pointer border border-transparent hover:border-[#e4e4e7] transition-all">
                                <span className="text-sm text-[#52525b] font-medium">{role}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#a1a1aa]"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-4 py-2 border border-dashed border-[#d4d4d8] text-[#71717a] text-xs font-medium rounded hover:bg-[#f4f4f5] hover:text-[#18181b] transition-colors">
                        + Create New Role
                    </button>
                </div>

                 <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm p-4">
                    <h3 className="font-bold text-[#18181b] mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
                        Recent Access Logs
                    </h3>
                    <div className="space-y-3">
                        <div className="text-xs">
                            <p className="font-bold text-[#18181b]">Super Admin</p>
                            <p className="text-[#71717a]">Updated "Pricing Rules"</p>
                            <p className="text-[10px] text-[#a1a1aa] mt-0.5">10 mins ago • IP 192.168.1.1</p>
                        </div>
                        <div className="w-full h-px bg-[#e4e4e7]"></div>
                         <div className="text-xs">
                            <p className="font-bold text-[#18181b]">Darkstore Mgr</p>
                            <p className="text-[#71717a]">Viewed "Inventory Report"</p>
                            <p className="text-[10px] text-[#a1a1aa] mt-0.5">25 mins ago • IP 192.168.1.42</p>
                        </div>
                    </div>
                </div>
           </div>
       </div>
    </div>
  );
}
