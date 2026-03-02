import React, { useState, useEffect } from 'react';
import { TabletSmartphone, Wrench, Battery, Wifi, AlertTriangle, Truck, X, Download, Search, Plus } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { EmptyState } from '../../ui/ux-components';
import { toast } from 'sonner';
import { 
  fetchDevices, 
  fetchMachinery, 
  addMachinery, 
  reportEquipmentIssue, 
  resolveEquipmentIssue,
  Device,
  Equipment
} from './warehouseApi';

export function EquipmentAssets() {
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [devices, setDevices] = useState<Device[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [devicesData, machineryData] = await Promise.all([
        fetchDevices(),
        fetchMachinery()
      ]);
      setDevices(devicesData);
      setEquipment(machineryData);
    } catch (error) {
      toast.error('Failed to load equipment data');
    } finally {
      setLoading(false);
    }
  };

  const [newIssue, setNewIssue] = useState({
    equipmentId: '',
    issue: '',
    severity: 'medium',
  });

  const [newEquipment, setNewEquipment] = useState({
    equipmentId: '',
    name: '',
    type: 'forklift' as const,
    zone: '',
  });

  const reportIssue = async () => {
    if (newIssue.equipmentId && newIssue.issue) {
      try {
        await reportEquipmentIssue(newIssue.equipmentId, {
          description: newIssue.issue,
          severity: newIssue.severity
        });
        toast.success('Issue reported successfully');
        loadData();
        setNewIssue({ equipmentId: '', issue: '', severity: 'medium' });
        setShowIssueModal(false);
      } catch (error) {
        toast.error('Failed to report issue');
      }
    }
  };

  const addEquipment = async () => {
    if (newEquipment.name) {
      try {
        const created = await addMachinery({
          equipmentId: newEquipment.equipmentId || undefined,
          name: newEquipment.name,
          type: newEquipment.type,
          zone: newEquipment.zone || undefined,
          status: 'idle'
        });
        toast.success(`Equipment added: ${created?.equipmentId ?? created?.id ?? 'OK'}`);
        setNewEquipment({ equipmentId: '', name: '', type: 'forklift', zone: '' });
        setShowAddEquipmentModal(false);
        loadData();
      } catch (error) {
        toast.error('Failed to add equipment');
      }
    } else {
      toast.error('Name is required');
    }
  };

  const resolveIssue = async (id: string) => {
    try {
      await resolveEquipmentIssue(id);
      toast.success('Issue resolved');
      loadData();
    } catch (error) {
      toast.error('Failed to resolve issue');
    }
  };

  const exportData = () => {
    const today = new Date().toISOString().split('T')[0];
    const csvData = [
      ['Equipment & Asset Management Report', `Date: ${today}`],
      [''],
      ['Handheld Devices'],
      ['Device ID', 'User', 'Battery %', 'Signal', 'Status'],
      ...devices.map(d => [d.deviceId, d.user, d.battery.toString(), d.signal, d.status]),
      [''],
      ['Heavy Machinery'],
      ['Equipment ID', 'Name', 'Type', 'Zone', 'Operator', 'Status', 'Issue'],
      ...equipment.map(e => [
        e.equipmentId,
        e.name,
        e.type,
        e.zone || 'N/A',
        e.operator || 'N/A',
        e.status,
        e.issue || 'N/A'
      ]),
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `equipment-assets-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const activeDevices = devices.filter(d => d.status === 'active').length;
  const lowBatteryDevices = devices.filter(d => d.battery < 20 && d.status === 'active').length;
  const operationalEquipment = equipment.filter(e => e.status === 'operational').length;
  const maintenanceEquipment = equipment.filter(e => e.status === 'maintenance').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891b2]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipment & Asset Management"
        subtitle="HSD integration, forklift maintenance, and device health"
        actions={
          <>
            <button 
              onClick={exportData}
              className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC] flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
            <button 
              onClick={() => setShowAddEquipmentModal(true)}
              className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
            >
              <Plus size={16} />
              Add Equipment
            </button>
            <button 
              onClick={() => setShowIssueModal(true)}
              className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC] flex items-center gap-2"
            >
              <Wrench size={16} />
              Report Issue
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TabletSmartphone size={16} className="text-[#0891b2]" />
            <span className="text-xs font-bold text-[#64748B] uppercase">Active Devices</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{activeDevices}/{devices.length}</p>
          {lowBatteryDevices > 0 && (
            <p className="text-xs text-amber-600 font-bold">{lowBatteryDevices} Low Battery</p>
          )}
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Truck size={16} className="text-[#0891b2]" />
            <span className="text-xs font-bold text-[#64748B] uppercase">Operational</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{operationalEquipment}</p>
          <p className="text-xs text-green-600 font-bold">Ready to Use</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-amber-600" />
            <span className="text-xs font-bold text-[#64748B] uppercase">Maintenance</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{maintenanceEquipment}</p>
          <p className="text-xs text-[#64748B]">Needs Attention</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Wrench size={16} className="text-[#0891b2]" />
            <span className="text-xs font-bold text-[#64748B] uppercase">Total Assets</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{devices.length + equipment.length}</p>
          <p className="text-xs text-[#64748B]">Devices + Equipment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HSD Management */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
            <h3 className="font-bold text-[#1E293B] flex items-center gap-2">
              <TabletSmartphone size={18} className="text-[#0891b2]" />
              Handheld Devices (HSD)
            </h3>
            <span className="text-xs font-bold bg-[#DCFCE7] text-[#166534] px-2 py-1 rounded">System Online</span>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-[#E2E8F0]">
              <span className="text-xs text-[#64748B] uppercase font-bold">Total Devices</span>
              <p className="text-2xl font-bold text-[#1E293B]">{devices.length}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-[#E2E8F0]">
              <span className="text-xs text-[#64748B] uppercase font-bold">Active Now</span>
              <p className="text-2xl font-bold text-[#0891b2]">{activeDevices}</p>
            </div>
          </div>
          <div className="border-t border-[#E2E8F0] max-h-[400px] overflow-y-auto">
            {devices.length === 0 ? (
              <div className="p-8"><EmptyState title="No devices" message="No handheld devices registered yet." /></div>
            ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0] sticky top-0">
                <tr>
                  <th className="px-4 py-2">Device ID</th>
                  <th className="px-4 py-2">User</th>
                  <th className="px-4 py-2">Battery</th>
                  <th className="px-4 py-2">Signal</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {devices.map(device => (
                  <tr key={device.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-mono text-[#64748B]">{device.deviceId}</td>
                    <td className="px-4 py-3 text-[#1E293B]">{device.user}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Battery 
                          size={14} 
                          className={
                            device.battery > 60 ? 'text-green-600' :
                            device.battery > 20 ? 'text-amber-600' :
                            'text-red-600'
                          }
                        />
                        <span className={
                          device.battery > 60 ? 'text-green-600' :
                          device.battery > 20 ? 'text-amber-600' :
                          'text-red-600'
                        }>
                          {device.battery}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Wifi 
                          size={14} 
                          className={
                            device.signal === 'strong' ? 'text-green-600' :
                            device.signal === 'good' ? 'text-green-600' :
                            device.signal === 'weak' ? 'text-amber-600' :
                            'text-gray-400'
                          }
                        />
                        <span className={
                          device.signal === 'strong' ? 'text-green-600' :
                          device.signal === 'good' ? 'text-green-600' :
                          device.signal === 'weak' ? 'text-amber-600' :
                          'text-gray-400'
                        }>
                          {device.signal === 'offline' ? '-' : device.signal.charAt(0).toUpperCase() + device.signal.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 ${
                        device.status === 'active' ? 'text-green-600' :
                        device.status === 'charging' ? 'text-gray-500' :
                        'text-gray-400'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          device.status === 'active' ? 'bg-green-500' :
                          device.status === 'charging' ? 'bg-gray-300' :
                          'bg-gray-300'
                        }`}></span>
                        {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>

        {/* Heavy Equipment */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
            <h3 className="font-bold text-[#1E293B] flex items-center gap-2">
              <Truck size={18} className="text-amber-600" />
              Heavy Machinery
            </h3>
          </div>
          <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
            {equipment.length === 0 ? (
              <div className="p-8"><EmptyState title="No machinery" message="Add equipment to see it here." /></div>
            ) : equipment.map(eq => (
              <div 
                key={eq.id}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  eq.status === 'maintenance' ? 'border-red-200 bg-red-50' : 'border-[#E2E8F0]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-xs ${
                    eq.status === 'maintenance' ? 'bg-white text-red-500' :
                    eq.status === 'operational' ? 'bg-gray-100 text-gray-500' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {eq.equipmentId}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1E293B]">{eq.name}</p>
                    <p className="text-xs text-[#64748B]">
                      {eq.zone && `${eq.zone} • `}
                      {eq.operator ? `Operator: ${eq.operator}` : eq.issue || 'Available'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    eq.status === 'operational' ? 'text-green-600 bg-green-50' :
                    eq.status === 'maintenance' ? 'text-red-600 bg-white border border-red-100 flex items-center gap-1' :
                    'text-gray-500 bg-gray-100'
                  }`}>
                    {eq.status === 'maintenance' && <AlertTriangle size={10} />}
                    {eq.status.charAt(0).toUpperCase() + eq.status.slice(1)}
                  </span>
                  {eq.status === 'maintenance' && (
                    <button 
                      onClick={() => resolveIssue(eq.id)}
                      className="text-xs text-green-600 hover:underline font-medium"
                    >
                      Mark Fixed
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Report Equipment Issue</h3>
              <button onClick={() => setShowIssueModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Equipment ID</label>
                <select 
                  value={newIssue.equipmentId}
                  onChange={(e) => setNewIssue({...newIssue, equipmentId: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="">Select equipment</option>
                  {equipment.filter(e => e.status !== 'maintenance').map(e => (
                    <option key={e.id} value={e.equipmentId}>{e.equipmentId} - {e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Issue Description</label>
                <textarea 
                  placeholder="Describe the problem..."
                  value={newIssue.issue}
                  onChange={(e) => setNewIssue({...newIssue, issue: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2] resize-none"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Severity</label>
                <select 
                  value={newIssue.severity}
                  onChange={(e) => setNewIssue({...newIssue, severity: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="low">Low - Can Wait</option>
                  <option value="medium">Medium - Schedule Soon</option>
                  <option value="high">High - Urgent</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowIssueModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={reportIssue}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
              >
                Report Issue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Equipment Modal */}
      {showAddEquipmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Add New Equipment</h3>
              <button onClick={() => setShowAddEquipmentModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Equipment ID</label>
                <input 
                  type="text"
                  placeholder="FL-XX or PJ-XX"
                  value={newEquipment.equipmentId}
                  onChange={(e) => setNewEquipment({...newEquipment, equipmentId: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Equipment Name</label>
                <input 
                  type="text"
                  placeholder="e.g., Forklift 05"
                  value={newEquipment.name}
                  onChange={(e) => setNewEquipment({...newEquipment, name: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Type</label>
                <select 
                  value={newEquipment.type}
                  onChange={(e) => setNewEquipment({...newEquipment, type: e.target.value as any})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="forklift">Forklift</option>
                  <option value="pallet-jack">Pallet Jack</option>
                  <option value="crane">Crane</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Assigned Zone (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g., Zone A"
                  value={newEquipment.zone}
                  onChange={(e) => setNewEquipment({...newEquipment, zone: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowAddEquipmentModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={addEquipment}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Add Equipment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}