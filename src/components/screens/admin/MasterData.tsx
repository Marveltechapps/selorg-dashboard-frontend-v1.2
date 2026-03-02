import React, { useState } from 'react';
import { Plus, Store, User, Package } from 'lucide-react';
import { CitiesTab } from './tabs/CitiesTab';
import { ZonesTab } from './tabs/ZonesTab';
import { StoresTab } from './tabs/StoresTab';
import { WarehousesTab } from './tabs/WarehousesTab';
import { RidersTab } from './tabs/RidersTab';
import { EmployeesTab } from './tabs/EmployeesTab';
import { VehicleTypesTab } from './tabs/VehicleTypesTab';
import { SkuUnitsTab } from './tabs/SkuUnitsTab';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const TABS = ['Cities', 'Zones', 'Stores', 'Warehouses', 'Riders', 'Employees', 'Vehicle Types', 'SKU Units'] as const;

export function MasterData() {
  const [activeTab, setActiveTab] = useState(0);
  const [addStoreOpen, setAddStoreOpen] = useState(false);
  const [addSkuOpen, setAddSkuOpen] = useState(false);

  const handleQuickAdd = (action: 'store' | 'rider' | 'sku') => {
    if (action === 'store') {
      setActiveTab(2);
      setAddStoreOpen(true);
    } else if (action === 'sku') {
      setActiveTab(7);
      setAddSkuOpen(true);
    } else {
      setActiveTab(4);
      toast.info('Rider registration is done through the Rider app. View and manage riders here.');
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Master Data Management</h1>
          <p className="text-[#71717a] text-sm">Centralized control for all system entities.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 h-10 px-4 bg-[#e11d48] text-white text-sm font-medium rounded-lg hover:bg-rose-600 shadow-lg shadow-rose-500/25">
              <Plus size={16} /> Quick Add
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleQuickAdd('store')}>
              <Store size={14} className="mr-2" /> Add Store
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleQuickAdd('rider')}>
              <User size={14} className="mr-2" /> Add Rider
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleQuickAdd('sku')}>
              <Package size={14} className="mr-2" /> Add SKU Unit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm flex flex-col h-[600px]">
        {/* Tabs */}
        <div className="flex border-b border-[#e4e4e7] overflow-x-auto custom-scrollbar">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${i === activeTab ? 'border-[#e11d48] text-[#e11d48] bg-rose-50/50' : 'border-transparent text-[#71717a] hover:text-[#18181b] hover:bg-[#fcfcfc]'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 0 && <CitiesTab />}
        {activeTab === 1 && <ZonesTab />}
        {activeTab === 2 && (
          <StoresTab
            openAddModal={addStoreOpen}
            onAddModalClose={() => setAddStoreOpen(false)}
          />
        )}
        {activeTab === 3 && <WarehousesTab />}
        {activeTab === 4 && <RidersTab />}
        {activeTab === 5 && <EmployeesTab />}
        {activeTab === 6 && <VehicleTypesTab />}
        {activeTab === 7 && (
          <SkuUnitsTab
            openAddModal={addSkuOpen}
            onAddModalClose={() => setAddSkuOpen(false)}
          />
        )}
      </div>
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
