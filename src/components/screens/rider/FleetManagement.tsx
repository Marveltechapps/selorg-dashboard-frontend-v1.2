import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import { Plus, Bike, AlertTriangle, Fuel, Wrench } from 'lucide-react';
import { fleetApi, Vehicle, FleetSummary, MaintenanceTask } from './fleetApi';
import { Skeleton } from '@/components/ui/skeleton';
import { AddVehicleModal } from './AddVehicleModal';
import { AddMaintenanceModal } from './AddMaintenanceModal';
import { EditVehicleModal } from './EditVehicleModal';

export function FleetManagement() {
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [addMaintenanceOpen, setAddMaintenanceOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryData, vehiclesData, maintenanceData] = await Promise.all([
        fleetApi.getSummary(),
        fleetApi.getVehicles(),
        fleetApi.getMaintenance(),
      ]);
      setSummary(summaryData);
      setVehicles(vehiclesData.vehicles);
      setMaintenance(maintenanceData);
    } catch (error) {
      console.error('Failed to load fleet data', error);
      toast.error('Failed to load fleet data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async (data: { vehicleId: string; type: string; fuelType: string }) => {
    await fleetApi.createVehicle(data);
    toast.success('Vehicle added');
    loadData();
  };

  const handleAddMaintenance = async (data: {
    vehicleId: string;
    type: string;
    scheduledDate: string;
  }) => {
    await fleetApi.createMaintenance(data);
    toast.success('Maintenance task added');
    loadData();
  };

  const handleEditVehicle = async (id: string, data: Partial<Vehicle>) => {
    await fleetApi.updateVehicle(id, data);
    toast.success('Vehicle updated');
    setEditVehicle(null);
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet Management"
        subtitle="Vehicle tracking and maintenance"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setAddMaintenanceOpen(true)}
              className="px-4 py-2 bg-[#3B82F6] text-white font-medium rounded-lg hover:bg-[#2563EB] flex items-center gap-2"
            >
              <Wrench size={16} />
              Add Maintenance
            </button>
            <button
              onClick={() => setAddVehicleOpen(true)}
              className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] flex items-center gap-2"
            >
              <Plus size={16} />
              Add Vehicle
            </button>
          </div>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
             <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
                 <Bike size={18} className="text-[#F97316]" /> Total Fleet
             </h3>
             <div className="flex items-end gap-2">
                 <span className="text-3xl font-bold text-[#212121]">
                   {loading ? <Skeleton className="h-8 w-12" /> : summary?.totalFleet || 0}
                 </span>
                 <span className="text-xs text-[#757575] mb-1">vehicles</span>
             </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
             <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
                 <AlertTriangle size={18} className="text-[#EF4444]" /> Maintenance
             </h3>
             <div className="flex items-end gap-2">
                 <span className="text-3xl font-bold text-[#EF4444]">
                   {loading ? <Skeleton className="h-8 w-12" /> : summary?.inMaintenance || 0}
                 </span>
                 <span className="text-xs text-[#757575] mb-1">in service</span>
             </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
             <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
                 <Fuel size={18} className="text-[#10B981]" /> EV Usage
             </h3>
             <div className="flex items-end gap-2">
                 <span className="text-3xl font-bold text-[#212121]">
                   {loading ? <Skeleton className="h-8 w-12" /> : `${summary?.evUsagePercent || 0}%`}
                 </span>
                 <span className="text-xs text-[#757575] mb-1">of fleet</span>
             </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-[#E0E0E0] shadow-sm">
             <h3 className="font-bold text-[#212121] mb-2 flex items-center gap-2">
                 <Wrench size={18} className="text-[#3B82F6]" /> Scheduled
             </h3>
             <div className="flex items-end gap-2">
                 <span className="text-3xl font-bold text-[#212121]">
                   {loading ? <Skeleton className="h-8 w-12" /> : summary?.scheduledServicesNextWeek || 0}
                 </span>
                 <span className="text-xs text-[#757575] mb-1">next week</span>
             </div>
          </div>
      </div>

      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA]">
            <h3 className="font-bold text-[#212121]">Vehicle Status</h3>
        </div>
        <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3">Vehicle ID</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Assigned Rider</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Condition</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-4"><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No vehicles found</td>
                </tr>
              ) : (
                vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-6 py-4 font-medium text-[#212121]">{vehicle.vehicleId}</td>
                    <td className="px-6 py-4 text-[#616161]">{vehicle.type} ({vehicle.fuelType})</td>
                    <td className="px-6 py-4">{vehicle.assignedRiderName || <span className="text-[#9E9E9E] italic">Unassigned</span>}</td>
                    <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          vehicle.status === 'active' ? 'bg-[#DCFCE7] text-[#166534]' : 
                          vehicle.status === 'maintenance' ? 'bg-[#FEE2E2] text-[#991B1B]' : 
                          'bg-gray-100 text-gray-600'
                        }`}>
                           {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                        </span>
                    </td>
                    <td className="px-6 py-4">{vehicle.conditionScore >= 80 ? 'Good' : vehicle.conditionScore >= 50 ? 'Fair' : 'Poor'} ({vehicle.conditionScore}%)</td>
                    <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setEditVehicle(vehicle)}
                          className="text-[#F97316] hover:text-[#EA580C] font-medium text-xs"
                        >
                          Edit
                        </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
        </table>
      </div>

      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
          <h3 className="font-bold text-[#212121]">Maintenance Tasks</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
            <tr>
              <th className="px-6 py-3">Vehicle</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Scheduled</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E0E0E0]">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={4} className="px-6 py-4"><Skeleton className="h-8 w-full" /></td>
                </tr>
              ))
            ) : maintenance.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No maintenance tasks</td>
              </tr>
            ) : (
              maintenance.map((task) => (
                <tr key={task.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-6 py-4 font-medium text-[#212121]">{task.vehicleId}</td>
                  <td className="px-6 py-4 text-[#616161]">{task.type}</td>
                  <td className="px-6 py-4">{new Date(task.scheduledDate).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      task.status === 'completed' ? 'bg-[#DCFCE7] text-[#166534]' :
                      task.status === 'in_progress' ? 'bg-[#DBEAFE] text-[#1E40AF]' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddVehicleModal
        isOpen={addVehicleOpen}
        onClose={() => setAddVehicleOpen(false)}
        onSubmit={handleAddVehicle}
      />
      <AddMaintenanceModal
        isOpen={addMaintenanceOpen}
        onClose={() => setAddMaintenanceOpen(false)}
        vehicles={vehicles}
        onSubmit={handleAddMaintenance}
      />
      <EditVehicleModal
        isOpen={!!editVehicle}
        onClose={() => setEditVehicle(null)}
        vehicle={editVehicle}
        onSave={handleEditVehicle}
      />
    </div>
  );
}