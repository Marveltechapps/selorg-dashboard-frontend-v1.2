import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Wrench, 
  AlertCircle, 
  Download, 
  X, 
  Plus,
  Activity,
  Monitor,
  Search,
  Loader2
} from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import {
  fetchProductionEquipment,
  createProductionEquipment,
  fetchProductionMaintenanceTasks,
  createProductionMaintenanceTask,
  updateProductionMaintenanceTaskStatus,
  fetchProductionIotDevices,
  type ProductionEquipment as Equipment,
  type ProductionMaintenanceTask as MaintenanceTask,
  type ProductionIotDevice as IoTDevice,
} from '../../../api/productionApi';

export function MaintenanceAssets() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'equipment' | 'maintenance' | 'iot'>('equipment');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<Equipment | MaintenanceTask | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: equipment = [] } = useQuery({
    queryKey: ['production', 'maintenance', 'equipment'],
    queryFn: () => fetchProductionEquipment(),
  });

  const { data: maintenanceTasks = [] } = useQuery({
    queryKey: ['production', 'maintenance', 'tasks'],
    queryFn: () => fetchProductionMaintenanceTasks(),
  });

  const { data: iotDevices = [] } = useQuery({
    queryKey: ['production', 'maintenance', 'iot'],
    queryFn: () => fetchProductionIotDevices(),
  });

  const createEquipmentMutation = useMutation({
    mutationFn: (body: { name: string; code: string; category?: string; location?: string }) =>
      createProductionEquipment(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production', 'maintenance', 'equipment'] });
      toast.success('Equipment added successfully');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to add equipment'),
  });

  const createTaskMutation = useMutation({
    mutationFn: (body: {
      equipmentId: string;
      equipmentName: string;
      taskType: 'preventive' | 'corrective' | 'breakdown';
      priority: 'low' | 'medium' | 'high' | 'critical';
      scheduledDate: string;
      description: string;
      estimatedHours?: number;
    }) => createProductionMaintenanceTask(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production', 'maintenance', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['production', 'maintenance', 'equipment'] });
      toast.success('Maintenance scheduled');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to schedule maintenance'),
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ taskId, status, technician }: { taskId: string; status: 'scheduled' | 'in-progress' | 'completed' | 'overdue'; technician?: string }) =>
      updateProductionMaintenanceTaskStatus(taskId, status, technician),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production', 'maintenance', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['production', 'maintenance', 'equipment'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update task'),
  });

  const [newMaintenance, setNewMaintenance] = useState({
    equipmentId: '',
    taskType: 'preventive' as const,
    priority: 'medium' as const,
    scheduledDate: '',
    description: '',
    estimatedHours: '',
  });

  const [newEquipment, setNewEquipment] = useState({
    name: '',
    code: '',
    category: '',
    location: '',
  });

  const handleScheduleMaintenance = () => {
    const equip = equipment.find((e: Equipment) => e.id === newMaintenance.equipmentId);
    if (newMaintenance.equipmentId && newMaintenance.scheduledDate && newMaintenance.description && equip) {
      createTaskMutation.mutate(
        {
          equipmentId: newMaintenance.equipmentId,
          equipmentName: equip.name,
          taskType: newMaintenance.taskType,
          priority: newMaintenance.priority,
          scheduledDate: newMaintenance.scheduledDate,
          description: newMaintenance.description,
          estimatedHours: newMaintenance.estimatedHours ? parseInt(newMaintenance.estimatedHours, 10) : undefined,
        },
        {
          onSuccess: () => {
            setNewMaintenance({ equipmentId: '', taskType: 'preventive', priority: 'medium', scheduledDate: '', description: '', estimatedHours: '' });
            setShowScheduleModal(false);
          },
        }
      );
    } else {
      toast.error('Please select equipment, date, and description');
    }
  };

  const handleAddEquipment = () => {
    if (newEquipment.name && newEquipment.code) {
      createEquipmentMutation.mutate(
        { name: newEquipment.name, code: newEquipment.code, category: newEquipment.category, location: newEquipment.location },
        {
          onSuccess: () => {
            setNewEquipment({ name: '', code: '', category: '', location: '' });
            setShowEquipmentModal(false);
          },
        }
      );
    } else {
      toast.error('Please fill equipment name and code');
    }
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: MaintenanceTask['status']) => {
    const task = maintenanceTasks.find((t: MaintenanceTask) => t.id === taskId);
    if (newStatus === 'in-progress' && task && !task.technician) {
      const techName = prompt('Enter technician name:');
      if (techName) {
        updateTaskStatusMutation.mutate({ taskId, status: newStatus, technician: techName });
      } else {
        return;
      }
    } else {
      updateTaskStatusMutation.mutate({ taskId, status: newStatus });
    }
  };

  const exportData = () => {
    const today = new Date().toISOString().split('T')[0];
    let csvData: any[] = [];

    if (activeTab === 'equipment') {
      csvData = [
        ['Equipment Assets Report', `Date: ${today}`],
        [''],
        ['Equipment Name', 'Code', 'Status', 'Health %', 'Location', 'Category', 'Last Maintenance', 'Next Maintenance'],
        ...equipment.map(e => [
          e.name,
          e.code,
          e.status,
          e.health.toString(),
          e.location,
          e.category,
          e.lastMaintenance || 'N/A',
          e.nextMaintenance || 'N/A'
        ]),
      ];
    } else if (activeTab === 'maintenance') {
      csvData = [
        ['Maintenance Tasks Report', `Date: ${today}`],
        [''],
        ['Equipment', 'Task Type', 'Priority', 'Status', 'Scheduled Date', 'Completed Date', 'Technician', 'Description', 'Est. Hours'],
        ...maintenanceTasks.map(t => [
          t.equipmentName,
          t.taskType,
          t.priority,
          t.status,
          t.scheduledDate,
          t.completedDate || 'N/A',
          t.technician || 'N/A',
          t.description,
          t.estimatedHours?.toString() || 'N/A'
        ]),
      ];
    } else {
      csvData = [
        ['IoT Devices Report', `Date: ${today}`],
        [''],
        ['Device ID', 'Name', 'Type', 'Status', 'Battery %', 'Last Reading', 'Location'],
        ...iotDevices.map(d => [
          d.deviceId,
          d.name,
          d.type,
          d.status,
          d.battery?.toString() || 'N/A',
          d.lastReading,
          d.location
        ]),
      ];
    }
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance-${activeTab}-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredEquipment = equipment.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTasks = maintenanceTasks.filter(t =>
    t.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDevices = iotDevices.filter(d =>
    d.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const operationalCount = equipment.filter(e => e.status === 'operational').length;
  const downCount = equipment.filter(e => e.status === 'down').length;
  const maintenanceCount = equipment.filter(e => e.status === 'maintenance').length;
  const criticalTasks = maintenanceTasks.filter(t => t.priority === 'critical' && t.status !== 'completed').length;
  const onlineDevices = iotDevices.filter(d => d.status === 'online').length;
  const lowBatteryDevices = iotDevices.filter(d => d.battery && d.battery < 20).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance & Assets"
        subtitle="Equipment health and preventive maintenance"
        actions={
          <>
            <button 
              onClick={exportData}
              className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
            <button 
              onClick={() => setShowScheduleModal(true)}
              className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] flex items-center gap-2"
            >
              <Plus size={16} />
              Schedule Maintenance
            </button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={16} className="text-[#16A34A]" />
            <span className="text-xs text-[#757575] uppercase font-bold">Operational</span>
          </div>
          <p className="text-2xl font-bold text-[#16A34A]">{operationalCount}</p>
          <p className="text-xs text-[#757575]">Equipment Running</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-[#EF4444]" />
            <span className="text-xs text-[#757575] uppercase font-bold">Down</span>
          </div>
          <p className="text-2xl font-bold text-[#EF4444]">{downCount}</p>
          <p className="text-xs text-[#757575]">Equipment Offline</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Wrench size={16} className="text-[#F59E0B]" />
            <span className="text-xs text-[#757575] uppercase font-bold">Maintenance</span>
          </div>
          <p className="text-2xl font-bold text-[#F59E0B]">{maintenanceCount}</p>
          <p className="text-xs text-[#757575]">Due for Service</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Monitor size={16} className="text-[#3B82F6]" />
            <span className="text-xs text-[#757575] uppercase font-bold">IoT Devices</span>
          </div>
          <p className="text-2xl font-bold text-[#3B82F6]">{onlineDevices}/{iotDevices.length}</p>
          <p className="text-xs text-[#757575]">Online</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden">
        <div className="flex border-b border-[#E0E0E0] justify-between items-center">
          <div className="flex">
            <button
              onClick={() => setActiveTab('equipment')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'equipment'
                  ? 'bg-[#16A34A] text-white'
                  : 'bg-[#FAFAFA] text-[#757575] hover:bg-[#F5F5F5]'
              }`}
            >
              Equipment Assets
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'maintenance'
                  ? 'bg-[#16A34A] text-white'
                  : 'bg-[#FAFAFA] text-[#757575] hover:bg-[#F5F5F5]'
              }`}
            >
              Maintenance Tasks
            </button>
            <button
              onClick={() => setActiveTab('iot')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'iot'
                  ? 'bg-[#16A34A] text-white'
                  : 'bg-[#FAFAFA] text-[#757575] hover:bg-[#F5F5F5]'
              }`}
            >
              IoT / HSD Devices
            </button>
          </div>
          <div className="px-4 flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 pr-4 rounded-lg bg-[#F5F5F5] border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-[#16A34A] focus:border-transparent transition-all w-48"
              />
            </div>
            {activeTab === 'equipment' && (
              <button 
                onClick={() => setShowEquipmentModal(true)}
                className="px-3 py-2 bg-[#3B82F6] text-white font-medium rounded-lg hover:bg-[#2563EB] flex items-center gap-2 text-sm"
              >
                <Plus size={14} />
                Add Equipment
              </button>
            )}
          </div>
        </div>

        {/* Equipment Tab */}
        {activeTab === 'equipment' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEquipment.map(equip => (
                <div 
                  key={equip.id}
                  className="p-4 border border-[#E0E0E0] rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        equip.status === 'operational' ? 'bg-green-100 text-green-600' :
                        equip.status === 'down' ? 'bg-red-100 text-red-600' :
                        equip.status === 'maintenance' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {equip.status === 'operational' ? <Activity size={20} /> : <Wrench size={20} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#212121]">{equip.name}</h4>
                        <p className="text-xs text-[#757575]">{equip.code}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#757575]">Health:</span>
                      <span className={`font-bold ${
                        equip.health >= 80 ? 'text-[#16A34A]' :
                        equip.health >= 60 ? 'text-[#F59E0B]' :
                        'text-[#EF4444]'
                      }`}>{equip.health}%</span>
                    </div>
                    <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          equip.health >= 80 ? 'bg-[#16A34A]' :
                          equip.health >= 60 ? 'bg-[#F59E0B]' :
                          'bg-[#EF4444]'
                        }`}
                        style={{ width: `${equip.health}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs mb-3">
                    <div className="flex justify-between">
                      <span className="text-[#757575]">Location:</span>
                      <span className="text-[#212121] font-medium">{equip.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#757575]">Category:</span>
                      <span className="text-[#212121] font-medium">{equip.category}</span>
                    </div>
                    {equip.nextMaintenance && (
                      <div className="flex justify-between">
                        <span className="text-[#757575]">Next Service:</span>
                        <span className="text-[#212121] font-medium">{equip.nextMaintenance}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      equip.status === 'operational' ? 'bg-green-50 text-green-600' :
                      equip.status === 'down' ? 'bg-red-50 text-red-600' :
                      equip.status === 'maintenance' ? 'bg-yellow-50 text-yellow-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {equip.status.charAt(0).toUpperCase() + equip.status.slice(1)}
                    </span>
                    <button 
                      onClick={() => setShowDetailsModal(equip)}
                      className="text-[#3B82F6] hover:text-[#2563EB] font-medium text-xs"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Maintenance Tasks Tab */}
        {activeTab === 'maintenance' && (
          <div className="p-6">
            <div className="border border-[#E0E0E0] rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
                  <tr>
                    <th className="px-6 py-3">Equipment</th>
                    <th className="px-6 py-3">Task Type</th>
                    <th className="px-6 py-3">Priority</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Scheduled Date</th>
                    <th className="px-6 py-3">Technician</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0E0E0]">
                  {filteredTasks.map(task => (
                    <tr key={task.id} className="hover:bg-[#FAFAFA]">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-[#212121]">{task.equipmentName}</p>
                          <p className="text-xs text-[#757575]">{task.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.taskType === 'breakdown' ? 'bg-red-100 text-red-800' :
                          task.taskType === 'corrective' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {task.taskType.charAt(0).toUpperCase() + task.taskType.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold text-xs uppercase ${
                          task.priority === 'critical' ? 'text-[#DC2626]' :
                          task.priority === 'high' ? 'text-[#EF4444]' :
                          task.priority === 'medium' ? 'text-[#F59E0B]' :
                          'text-[#6B7280]'
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.status === 'completed' ? 'bg-[#DCFCE7] text-[#166534]' :
                          task.status === 'in-progress' ? 'bg-[#E0F2FE] text-[#0369A1]' :
                          task.status === 'overdue' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                          'bg-[#FEF9C3] text-[#854D0E]'
                        }`}>
                          {task.status === 'in-progress' ? 'In Progress' : 
                           task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#616161]">{task.scheduledDate}</td>
                      <td className="px-6 py-4 text-[#616161]">{task.technician || 'Unassigned'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {task.status === 'scheduled' && (
                            <button 
                              onClick={() => handleUpdateTaskStatus(task.id, 'in-progress')}
                              className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                            >
                              Start
                            </button>
                          )}
                          {task.status === 'in-progress' && (
                            <button 
                              onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                              className="text-[#16A34A] hover:text-[#15803D] font-medium text-xs"
                            >
                              Complete
                            </button>
                          )}
                          <button 
                            onClick={() => setShowDetailsModal(task)}
                            className="text-[#757575] hover:text-[#212121] font-medium text-xs"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* IoT Devices Tab */}
        {activeTab === 'iot' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E0E0E0]">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-[#757575] mb-1">Active HSDs</p>
                    <p className="text-2xl font-bold text-[#212121]">{iotDevices.filter(d => d.type === 'HSD').length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Monitor size={24} className="text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E0E0E0]">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-[#757575] mb-1">Low Battery Devices</p>
                    <p className="text-2xl font-bold text-[#EF4444]">{lowBatteryDevices}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertCircle size={24} className="text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[#E0E0E0] rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
                  <tr>
                    <th className="px-6 py-3">Device ID</th>
                    <th className="px-6 py-3">Device Name</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Battery</th>
                    <th className="px-6 py-3">Last Reading</th>
                    <th className="px-6 py-3">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0E0E0]">
                  {filteredDevices.map(device => (
                    <tr key={device.id} className="hover:bg-[#FAFAFA]">
                      <td className="px-6 py-4 font-mono text-xs text-[#212121]">{device.deviceId}</td>
                      <td className="px-6 py-4 font-medium text-[#212121]">{device.name}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {device.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          device.status === 'online' ? 'bg-[#DCFCE7] text-[#166534]' :
                          device.status === 'warning' ? 'bg-[#FEF9C3] text-[#854D0E]' :
                          'bg-[#FEE2E2] text-[#991B1B]'
                        }`}>
                          {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {device.battery !== undefined && (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-[#E5E7EB] rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  device.battery >= 50 ? 'bg-[#16A34A]' :
                                  device.battery >= 20 ? 'bg-[#F59E0B]' :
                                  'bg-[#EF4444]'
                                }`}
                                style={{ width: `${device.battery}%` }}
                              ></div>
                            </div>
                            <span className={`text-xs font-medium ${
                              device.battery >= 50 ? 'text-[#16A34A]' :
                              device.battery >= 20 ? 'text-[#F59E0B]' :
                              'text-[#EF4444]'
                            }`}>
                              {device.battery}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#616161] text-xs">{device.lastReading}</td>
                      <td className="px-6 py-4 text-[#616161]">{device.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Maintenance Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Schedule Maintenance Task</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Equipment</label>
                <select 
                  value={newMaintenance.equipmentId}
                  onChange={(e) => setNewMaintenance({...newMaintenance, equipmentId: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                >
                  <option value="">Select equipment</option>
                  {equipment.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Task Type</label>
                  <select 
                    value={newMaintenance.taskType}
                    onChange={(e) => setNewMaintenance({...newMaintenance, taskType: e.target.value as any})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="preventive">Preventive</option>
                    <option value="corrective">Corrective</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Priority</label>
                  <select 
                    value={newMaintenance.priority}
                    onChange={(e) => setNewMaintenance({...newMaintenance, priority: e.target.value as any})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Scheduled Date</label>
                  <input 
                    type="date"
                    value={newMaintenance.scheduledDate}
                    onChange={(e) => setNewMaintenance({...newMaintenance, scheduledDate: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Est. Hours</label>
                  <input 
                    type="number"
                    placeholder="4"
                    value={newMaintenance.estimatedHours}
                    onChange={(e) => setNewMaintenance({...newMaintenance, estimatedHours: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Description</label>
                <textarea 
                  placeholder="Maintenance task details..."
                  value={newMaintenance.description}
                  onChange={(e) => setNewMaintenance({...newMaintenance, description: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A] resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button 
                onClick={handleScheduleMaintenance}
                className="px-4 py-2 bg-[#3B82F6] text-white font-medium rounded-lg hover:bg-[#2563EB]"
              >
                Schedule Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Equipment Modal */}
      {showEquipmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Add New Equipment</h3>
              <button onClick={() => setShowEquipmentModal(false)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Equipment Name</label>
                <input 
                  type="text"
                  placeholder="e.g., Conveyor Belt A1"
                  value={newEquipment.name}
                  onChange={(e) => setNewEquipment({...newEquipment, name: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Equipment Code</label>
                  <input 
                    type="text"
                    placeholder="CVB-A1"
                    value={newEquipment.code}
                    onChange={(e) => setNewEquipment({...newEquipment, code: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Category</label>
                  <input 
                    type="text"
                    placeholder="Conveyor"
                    value={newEquipment.category}
                    onChange={(e) => setNewEquipment({...newEquipment, category: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Location</label>
                <input 
                  type="text"
                  placeholder="Line A, Processing Area, etc."
                  value={newEquipment.location}
                  onChange={(e) => setNewEquipment({...newEquipment, location: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowEquipmentModal(false)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddEquipment}
                className="px-4 py-2 bg-[#3B82F6] text-white font-medium rounded-lg hover:bg-[#2563EB]"
              >
                Add Equipment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">
                {'code' in showDetailsModal ? 'Equipment Details' : 'Task Details'}
              </h3>
              <button onClick={() => setShowDetailsModal(null)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {'code' in showDetailsModal ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-[#757575]">Equipment Name</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.name}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Code</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.code}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Category</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.category}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Location</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.location}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Health</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.health}%</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Status</span>
                      <p className="font-bold text-[#212121] capitalize">{showDetailsModal.status}</p>
                    </div>
                    {showDetailsModal.lastMaintenance && (
                      <div>
                        <span className="text-xs text-[#757575]">Last Maintenance</span>
                        <p className="font-bold text-[#212121]">{showDetailsModal.lastMaintenance}</p>
                      </div>
                    )}
                    {showDetailsModal.nextMaintenance && (
                      <div>
                        <span className="text-xs text-[#757575]">Next Maintenance</span>
                        <p className="font-bold text-[#212121]">{showDetailsModal.nextMaintenance}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-[#757575]">Equipment</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.equipmentName}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Task Type</span>
                      <p className="font-bold text-[#212121] capitalize">{showDetailsModal.taskType}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Priority</span>
                      <p className="font-bold text-[#212121] uppercase">{showDetailsModal.priority}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Status</span>
                      <p className="font-bold text-[#212121] capitalize">{showDetailsModal.status}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#757575]">Scheduled Date</span>
                      <p className="font-bold text-[#212121]">{showDetailsModal.scheduledDate}</p>
                    </div>
                    {showDetailsModal.completedDate && (
                      <div>
                        <span className="text-xs text-[#757575]">Completed Date</span>
                        <p className="font-bold text-[#212121]">{showDetailsModal.completedDate}</p>
                      </div>
                    )}
                    {showDetailsModal.technician && (
                      <div>
                        <span className="text-xs text-[#757575]">Technician</span>
                        <p className="font-bold text-[#212121]">{showDetailsModal.technician}</p>
                      </div>
                    )}
                    {showDetailsModal.estimatedHours && (
                      <div>
                        <span className="text-xs text-[#757575]">Estimated Hours</span>
                        <p className="font-bold text-[#212121]">{showDetailsModal.estimatedHours} hours</p>
                      </div>
                    )}
                  </div>
                  <div className="bg-[#F5F5F5] p-3 rounded-lg">
                    <span className="text-xs text-[#757575] block mb-1">Description</span>
                    <p className="text-sm text-[#212121]">{showDetailsModal.description}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}