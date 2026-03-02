import React, { useState } from 'react';
import { 
  ClipboardList, Wifi, Smartphone, Zap, TriangleAlert, 
  ShieldAlert, ScanLine, FileCheck, History, CheckCircle2, 
  XCircle, Thermometer, Battery, Signal, AlertOctagon
} from 'lucide-react';
import { cn } from "../../lib/utils";

export function StoreHealth() {
  const [activeTab, setActiveTab] = useState<'readiness' | 'equipment' | 'safety'>('readiness');

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[28px] font-semibold text-[#212121] tracking-tight">Store Health</h2>
          <p className="text-[#757575] mt-1">Monitor readiness checklists, equipment status, and safety logs.</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-white px-4 py-2 rounded-lg border border-[#E0E0E0] shadow-sm flex items-center gap-3">
              <div className="p-2 bg-[#F0FDF4] text-[#16A34A] rounded-lg">
                 <Wifi size={20} />
              </div>
              <div>
                 <div className="text-[10px] uppercase font-bold text-[#757575]">Network</div>
                 <div className="font-bold text-[#212121]">Stable</div>
              </div>
           </div>
           <div className="bg-white px-4 py-2 rounded-lg border border-[#E0E0E0] shadow-sm flex items-center gap-3">
              <div className="p-2 bg-[#FFF7E6] text-[#D46B08] rounded-lg">
                 <TriangleAlert size={20} />
              </div>
              <div>
                 <div className="text-[10px] uppercase font-bold text-[#757575]">Open Issues</div>
                 <div className="font-bold text-[#212121]">2 Pending</div>
              </div>
           </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-[#E0E0E0] mb-6 overflow-x-auto">
        <TabButton id="readiness" label="Store Readiness" icon={ClipboardList} active={activeTab} onClick={setActiveTab} />
        <TabButton id="equipment" label="Equipment Monitoring" icon={Smartphone} active={activeTab} onClick={setActiveTab} />
        <TabButton id="safety" label="Safety & Incident Log" icon={ShieldAlert} active={activeTab} onClick={setActiveTab} />
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {activeTab === 'readiness' && <ReadinessTab />}
        {activeTab === 'equipment' && <EquipmentTab />}
        {activeTab === 'safety' && <SafetyTab />}
      </div>
    </div>
  );
}

function TabButton({ id, label, icon: Icon, active, onClick }: any) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        "flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
        active === id 
          ? "border-[#1677FF] text-[#1677FF] bg-[#F0F7FF]" 
          : "border-transparent text-[#616161] hover:text-[#212121] hover:bg-[#F5F5F5]"
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

// --- Store Readiness Tab ---

function ReadinessTab() {
  const [activeChecklist, setActiveChecklist] = useState('opening');

  return (
    <div className="grid grid-cols-12 gap-6 h-[600px]">
       {/* Left: Checklist Selection */}
       <div className="col-span-12 md:col-span-3 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
             <h3 className="font-bold text-[#212121] mb-4 text-sm uppercase tracking-wider">Checklists</h3>
             <div className="space-y-1">
                <button 
                  onClick={() => setActiveChecklist('opening')}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg font-bold text-sm transition-colors",
                    activeChecklist === 'opening' ? "bg-[#E6F7FF] text-[#1677FF]" : "hover:bg-[#F5F5F5] text-[#616161]"
                  )}
                >
                   <span className="flex items-center gap-2"><FileCheck size={16}/> Opening Checklist</span>
                </button>
                <button 
                   onClick={() => setActiveChecklist('closing')}
                   className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg font-bold text-sm transition-colors",
                    activeChecklist === 'closing' ? "bg-[#E6F7FF] text-[#1677FF]" : "hover:bg-[#F5F5F5] text-[#616161]"
                  )}
                >
                   <span className="flex items-center gap-2"><History size={16}/> Closing Checklist</span>
                </button>
                <button 
                   onClick={() => setActiveChecklist('hygiene')}
                   className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg font-bold text-sm transition-colors",
                    activeChecklist === 'hygiene' ? "bg-[#E6F7FF] text-[#1677FF]" : "hover:bg-[#F5F5F5] text-[#616161]"
                  )}
                >
                   <span className="flex items-center gap-2"><Thermometer size={16}/> Hygiene Checklist</span>
                </button>
             </div>
          </div>

          <div className="bg-[#F0FDF4] p-4 rounded-xl border border-[#86EFAC] shadow-sm">
             <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-[#DCFCE7] text-[#16A34A] rounded-full">
                   <CheckCircle2 size={20} />
                </div>
                <div>
                   <div className="text-sm font-bold text-[#14532D]">Status: Ready</div>
                   <div className="text-xs text-[#166534]">Opening checklist complete.</div>
                </div>
             </div>
             <p className="text-xs text-[#166534]">Store is cleared for operations.</p>
          </div>
       </div>

       {/* Right: Checklist Items */}
       <div className="col-span-12 md:col-span-9 bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
             <div className="flex items-center gap-3">
                <h3 className="font-bold text-[#212121]">
                   {activeChecklist === 'opening' && "Opening Checklist (Daily)"}
                   {activeChecklist === 'closing' && "Closing Checklist (Daily)"}
                   {activeChecklist === 'hygiene' && "Hygiene & Sanitation Log"}
                </h3>
             </div>
             <div className="text-sm text-[#757575] font-medium">Progress: <span className="text-[#1677FF] font-bold">4/5</span></div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
             <div className="space-y-4">
                {[
                   { task: 'Disable Alarm System & Unlock Entrances', status: 'checked', time: '05:55 AM', user: 'Mike R.' },
                   { task: 'Check Freezer Temperatures', status: 'checked', time: '06:05 AM', user: 'Mike R.' },
                   { task: 'Verify Cash Float in Register', status: 'checked', time: '06:10 AM', user: 'Mike R.' },
                   { task: 'Inspect Loading Bay for Obstructions', status: 'checked', time: '06:15 AM', user: 'Sarah C.' },
                   { task: 'Turn on all Picker Handhelds', status: 'unchecked', time: '-', user: '-' },
                ].map((item, i) => (
                   <div key={i} className={cn(
                      "flex items-center justify-between p-4 rounded-lg border",
                      item.status === 'checked' ? "bg-[#F0FDF4] border-[#86EFAC]" : "bg-white border-[#E0E0E0]"
                   )}>
                      <div className="flex items-center gap-4">
                         <div className={cn(
                            "w-6 h-6 rounded border-2 flex items-center justify-center transition-colors cursor-pointer",
                            item.status === 'checked' ? "bg-[#16A34A] border-[#16A34A]" : "border-[#D1D5DB]"
                         )}>
                            {item.status === 'checked' && <CheckCircle2 size={16} className="text-white" />}
                         </div>
                         <div className={cn("font-medium", item.status === 'checked' ? "text-[#166534]" : "text-[#212121]")}>
                            {item.task}
                         </div>
                      </div>
                      <div className="text-xs text-[#757575] text-right">
                         <div>{item.time}</div>
                         <div>{item.user}</div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
          <div className="p-4 border-t border-[#E0E0E0] bg-[#FAFAFA] flex justify-end">
             <button className="px-6 py-2 bg-[#1677FF] text-white rounded-lg font-bold hover:bg-[#409EFF] shadow-sm disabled:opacity-50">
                Submit Checklist
             </button>
          </div>
       </div>
    </div>
  );
}

// --- Equipment Monitoring Tab ---

function EquipmentTab() {
  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <EquipmentCard 
            title="Handheld Devices" 
            count="24/25" 
            sub="Active" 
            icon={Smartphone} 
            color="blue" 
            status="warning"
          />
          <EquipmentCard 
            title="Barcode Scanners" 
            count="12/12" 
            sub="Online" 
            icon={ScanLine} 
            color="green" 
            status="ok"
          />
          <EquipmentCard 
            title="Network Status" 
            count="98%" 
            sub="Signal Strength" 
            icon={Wifi} 
            color="purple" 
            status="ok"
          />
          <EquipmentCard 
            title="UPS / Power" 
            count="100%" 
            sub="Battery Level" 
            icon={Zap} 
            color="yellow" 
            status="ok"
          />
       </div>

       <div className="grid grid-cols-12 gap-6 h-[500px]">
          {/* Detailed Device List */}
          <div className="col-span-12 md:col-span-8 bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden">
             <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
                <h3 className="font-bold text-[#212121]">Device Status Log</h3>
                <div className="flex gap-2">
                   <select className="px-3 py-1.5 border border-[#E0E0E0] rounded text-xs font-bold text-[#616161]">
                      <option>All Devices</option>
                      <option>Zebra TC52</option>
                      <option>Ring Scanners</option>
                   </select>
                </div>
             </div>
             <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0]">
                      <tr>
                         <th className="px-4 py-3 font-medium">Device ID</th>
                         <th className="px-4 py-3 font-medium">Type</th>
                         <th className="px-4 py-3 font-medium">Assigned To</th>
                         <th className="px-4 py-3 font-medium">Battery</th>
                         <th className="px-4 py-3 font-medium">Signal</th>
                         <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-[#F0F0F0]">
                      {[
                         { id: 'HHD-001', type: 'Zebra TC52', user: 'Sarah C.', bat: 85, sig: 'High', status: 'Active' },
                         { id: 'HHD-002', type: 'Zebra TC52', user: 'Kyle R.', bat: 12, sig: 'Med', status: 'Low Battery' },
                         { id: 'SCN-005', type: 'Ring Scanner', user: 'John D.', bat: 90, sig: 'High', status: 'Active' },
                         { id: 'HHD-004', type: 'Zebra TC52', user: '-', bat: 0, sig: '-', status: 'Offline' },
                      ].map((dev, i) => (
                         <tr key={i} className="hover:bg-[#F9FAFB]">
                            <td className="px-4 py-3 font-mono text-xs text-[#616161]">{dev.id}</td>
                            <td className="px-4 py-3 font-medium text-[#212121]">{dev.type}</td>
                            <td className="px-4 py-3 text-[#616161]">{dev.user}</td>
                            <td className="px-4 py-3">
                               <div className="flex items-center gap-2">
                                  <Battery size={14} className={cn(dev.bat < 20 ? "text-[#EF4444]" : "text-[#16A34A]")} />
                                  <span className={cn("text-xs font-bold", dev.bat < 20 ? "text-[#EF4444]" : "text-[#212121]")}>{dev.bat}%</span>
                               </div>
                            </td>
                            <td className="px-4 py-3">
                               <div className="flex items-center gap-2">
                                  <Signal size={14} className="text-[#616161]" />
                                  <span className="text-xs text-[#616161]">{dev.sig}</span>
                               </div>
                            </td>
                            <td className="px-4 py-3">
                               <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                  dev.status === 'Active' ? "bg-[#DCFCE7] text-[#16A34A]" : 
                                  dev.status === 'Offline' ? "bg-[#F3F4F6] text-[#9E9E9E]" : "bg-[#FEE2E2] text-[#EF4444]"
                               )}>
                                  {dev.status}
                               </span>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

          {/* Network Health */}
          <div className="col-span-12 md:col-span-4 flex flex-col gap-6">
             <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm flex-1">
                <h3 className="font-bold text-[#212121] mb-4 flex items-center gap-2">
                   <Wifi size={18} className="text-[#1677FF]" /> Connectivity
                </h3>
                <div className="space-y-4">
                   <div className="p-3 bg-[#F0F9FF] border border-[#BAE6FD] rounded-lg">
                      <div className="text-xs font-bold text-[#0284C7] uppercase mb-1">Main Uplink</div>
                      <div className="flex justify-between items-end">
                         <span className="text-lg font-bold text-[#0369A1]">Online</span>
                         <span className="text-xs text-[#0369A1]">Latency: 12ms</span>
                      </div>
                   </div>
                   <div className="p-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-lg">
                      <div className="text-xs font-bold text-[#616161] uppercase mb-1">Backup 4G</div>
                      <div className="flex justify-between items-end">
                         <span className="text-lg font-bold text-[#616161]">Standby</span>
                         <span className="text-xs text-[#9E9E9E]">Signal: Good</span>
                      </div>
                   </div>
                </div>
                
                <h3 className="font-bold text-[#212121] mt-6 mb-4 flex items-center gap-2">
                   <Zap size={18} className="text-[#F59E0B]" /> Power Backup
                </h3>
                <div className="p-3 bg-[#FFFBE6] border border-[#FFE58F] rounded-lg">
                    <div className="text-xs font-bold text-[#D48806] uppercase mb-1">Main UPS</div>
                    <div className="flex justify-between items-end">
                       <span className="text-lg font-bold text-[#D48806]">100% Charged</span>
                       <span className="text-xs text-[#D48806]">Runtime: 4h 20m</span>
                    </div>
                 </div>
             </div>
          </div>
       </div>
    </div>
  );
}

function EquipmentCard({ title, count, sub, icon: Icon, color, status }: any) {
    const colors = {
        blue: "bg-[#E6F7FF] text-[#1677FF]",
        green: "bg-[#DCFCE7] text-[#16A34A]",
        purple: "bg-[#F3E8FF] text-[#9333EA]",
        yellow: "bg-[#FFF7E6] text-[#D46B08]",
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col justify-between relative overflow-hidden">
            {status === 'warning' && <div className="absolute top-0 right-0 w-2 h-2 bg-[#EF4444] rounded-full m-2 animate-pulse" />}
            <div className="flex justify-between items-start mb-2">
                <div className={cn("p-2 rounded-lg", colors[color as keyof typeof colors])}>
                    <Icon size={18} />
                </div>
            </div>
            <div>
                <h4 className="text-[#757575] text-xs font-bold uppercase">{title}</h4>
                <div className="flex items-end gap-2">
                    <p className="text-2xl font-bold text-[#212121]">{count}</p>
                    <p className="text-xs font-medium text-[#757575] mb-1.5">{sub}</p>
                </div>
            </div>
        </div>
    )
}

// --- Safety & Incident Log Tab ---

function SafetyTab() {
  return (
    <div className="grid grid-cols-12 gap-6 h-[600px]">
       {/* Left: Incident Stats */}
       <div className="col-span-12 md:col-span-4 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
             <h3 className="font-bold text-[#212121] mb-4">Safety Overview</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#FEF2F2] rounded-lg border border-[#FECACA]">
                   <div className="text-2xl font-bold text-[#EF4444]">0</div>
                   <div className="text-xs font-bold text-[#991B1B] uppercase">Accidents (Week)</div>
                </div>
                <div className="p-3 bg-[#F0FDF4] rounded-lg border border-[#86EFAC]">
                   <div className="text-2xl font-bold text-[#16A34A]">14</div>
                   <div className="text-xs font-bold text-[#166534] uppercase">Days Safe</div>
                </div>
             </div>
             
             <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between p-3 border border-[#E0E0E0] rounded-lg bg-[#FAFAFA]">
                   <span className="text-sm font-medium text-[#616161]">Safety Audits</span>
                   <span className="text-sm font-bold text-[#22C55E]">Up to Date</span>
                </div>
                <div className="flex items-center justify-between p-3 border border-[#E0E0E0] rounded-lg bg-[#FAFAFA]">
                   <span className="text-sm font-medium text-[#616161]">Hazard Reports</span>
                   <span className="text-sm font-bold text-[#F59E0B]">1 Open</span>
                </div>
             </div>
          </div>

          <div className="bg-[#FFF7ED] p-5 rounded-xl border border-[#FED7AA] shadow-sm">
             <div className="flex items-center gap-2 mb-3 text-[#C2410C]">
                <AlertOctagon size={20} />
                <h3 className="font-bold">Hazardous Zone Alert</h3>
             </div>
             <p className="text-xs text-[#9A3412] mb-4">
                Spill reported in Aisle 4 (Dairy Section). Cleaning crew dispatched. Proceed with caution.
             </p>
             <button className="w-full py-2 bg-[#C2410C] text-white text-xs font-bold rounded hover:bg-[#9A3412]">
                Mark as Resolved
             </button>
          </div>
       </div>

       {/* Right: Incident Log */}
       <div className="col-span-12 md:col-span-8 bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
             <h3 className="font-bold text-[#212121]">Incident & Hazard Log</h3>
             <button className="px-3 py-1.5 bg-[#EF4444] text-white rounded text-xs font-bold hover:bg-[#DC2626] flex items-center gap-2">
                <TriangleAlert size={14} /> Report Incident
             </button>
          </div>
          <div className="flex-1 overflow-auto">
             <table className="w-full text-left text-sm">
                <thead className="bg-[#FAFAFA] text-[#757575] border-b border-[#E0E0E0]">
                   <tr>
                      <th className="px-4 py-3 font-medium">Date/Time</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Location</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Reported By</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                   {[
                      { date: 'Today 09:15', type: 'Hazard', loc: 'Aisle 4', desc: 'Milk Spill on floor', user: 'Mike R.', status: 'Open' },
                      { date: 'Yesterday 14:30', type: 'Damage', loc: 'Inbound Bay', desc: 'Pallet collapse', user: 'John D.', status: 'Resolved' },
                      { date: '10 Oct 08:00', type: 'Maintenance', loc: 'Freezer 1', desc: 'Light flickering', user: 'Sarah C.', status: 'Resolved' },
                   ].map((log, i) => (
                      <tr key={i} className="hover:bg-[#F9FAFB]">
                         <td className="px-4 py-3 text-[#616161] text-xs">{log.date}</td>
                         <td className="px-4 py-3 font-medium text-[#212121]">{log.type}</td>
                         <td className="px-4 py-3 text-[#616161]">{log.loc}</td>
                         <td className="px-4 py-3 text-[#212121] max-w-[200px] truncate">{log.desc}</td>
                         <td className="px-4 py-3 text-[#616161] text-xs">{log.user}</td>
                         <td className="px-4 py-3">
                            <span className={cn(
                               "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                               log.status === 'Resolved' ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEF2F2] text-[#EF4444]"
                            )}>
                               {log.status}
                            </span>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
}
