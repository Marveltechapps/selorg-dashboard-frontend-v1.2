import React, { useState, useEffect, useRef } from "react";
import { 
  fetchFleetSummary, 
  fetchVehicles, 
  fetchMaintenanceTasks, 
  updateVehicle, 
  createMaintenanceTask,
  FleetSummary, 
  Vehicle, 
  MaintenanceTask 
} from "./fleetApi";
import { FleetSummaryCards } from "./FleetSummaryCards";
import { VehicleStatusTable } from "./VehicleStatusTable";
import { VehicleDetailsDrawer } from "./VehicleDetailsDrawer";
import { VehicleManageDrawer } from "./VehicleManageDrawer";
import { AddVehicleModal } from "./AddVehicleModal";
import { MaintenanceScheduleList } from "./MaintenanceScheduleList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface FleetManagementProps {
  searchQuery?: string;
}

export function FleetManagement({ searchQuery = '' }: FleetManagementProps) {
  // Data State
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [activeFilter, setActiveFilter] = useState<"all" | "maintenance" | "ev" | "scheduled" | null>(null);

  // Modal/Drawer State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const maintenanceSectionRef = useRef<HTMLDivElement>(null);
  const localVehiclesRef = useRef<Vehicle[]>([]);
  const localVehicleUpdatesRef = useRef<Record<string, Partial<Vehicle>>>({});
  const localMaintenanceUpdatesRef = useRef<Record<string, MaintenanceTask["status"]>>({});

  // Filter vehicles and maintenance tasks based on search query
  const filteredVehicles = React.useMemo(() => {
    if (!searchQuery.trim()) return vehicles;
    const query = searchQuery.toLowerCase();
    return vehicles.filter(v => 
      v.id.toLowerCase().includes(query) ||
      v.vehicleId.toLowerCase().includes(query) ||
      v.type.toLowerCase().includes(query) ||
      v.assignedRiderName?.toLowerCase().includes(query) ||
      v.fuelType?.toLowerCase().includes(query)
    );
  }, [vehicles, searchQuery]);

  const filteredMaintenanceTasks = React.useMemo(() => {
    if (!searchQuery.trim()) return maintenanceTasks;
    const query = searchQuery.toLowerCase();
    return maintenanceTasks.filter(t => 
      t.id.toLowerCase().includes(query) ||
      t.vehicleId.toLowerCase().includes(query) ||
      t.type.toLowerCase().includes(query) ||
      t.workshopName?.toLowerCase().includes(query)
    );
  }, [maintenanceTasks, searchQuery]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [sumData, vehData, maintData] = await Promise.all([
        fetchFleetSummary(),
        fetchVehicles(),
        fetchMaintenanceTasks()
      ]);
      setSummary(sumData);
      const mergedVeh = (Array.isArray(vehData) ? vehData : []).map(v => ({ ...v, ...localVehicleUpdatesRef.current[v.id] }));
      localVehiclesRef.current.forEach(v => {
        const patched = { ...v, ...localVehicleUpdatesRef.current[v.id] };
        if (!mergedVeh.find(m => m.id === v.id)) mergedVeh.push(patched);
      });
      setVehicles(mergedVeh);
      const mergedMaint = (Array.isArray(maintData) ? maintData : []).map(t => ({
        ...t,
        ...(localMaintenanceUpdatesRef.current[t.id] && { status: localMaintenanceUpdatesRef.current[t.id] }),
      }));
      setMaintenanceTasks(mergedMaint);
    } catch (error) {
      console.error("Failed to load fleet data", error);
      setSummary({ totalFleet: 45, inMaintenance: 3, evUsagePercent: 62, scheduledServicesNextWeek: 5 });
      const mergedVeh = localVehiclesRef.current.length > 0 ? [...localVehiclesRef.current] : [
        { id: 'v1', vehicleId: 'EV-SCOOT-001', type: 'Electric Scooter', fuelType: 'EV', assignedRiderName: 'Raj K', status: 'active', conditionScore: 92, conditionLabel: 'Good', lastServiceDate: new Date(Date.now() - 20 * 86400000).toISOString(), nextServiceDueDate: new Date(Date.now() + 10 * 86400000).toISOString(), currentOdometerKm: 1200, utilizationPercent: 75, documents: { rcValidTill: new Date(Date.now() + 365 * 86400000).toISOString(), insuranceValidTill: new Date(Date.now() + 180 * 86400000).toISOString() }, pool: 'Hub' },
        { id: 'v2', vehicleId: 'EV-SCOOT-002', type: 'Electric Scooter', fuelType: 'EV', status: 'maintenance', conditionScore: 65, conditionLabel: 'Fair', lastServiceDate: new Date(Date.now() - 90 * 86400000).toISOString(), nextServiceDueDate: new Date().toISOString(), currentOdometerKm: 3400, utilizationPercent: 0, documents: { rcValidTill: new Date(Date.now() + 300 * 86400000).toISOString(), insuranceValidTill: new Date(Date.now() + 200 * 86400000).toISOString() }, pool: 'Hub' },
      ];
      setVehicles(mergedVeh);
      setMaintenanceTasks([
        { id: 'm1', vehicleId: 'EV-SCOOT-002', vehicleInternalId: 'v2', type: 'Scheduled Service', scheduledDate: new Date(Date.now() + 2 * 86400000).toISOString(), status: 'upcoming', workshopName: 'Hub Garage', notes: 'Annual service due' },
      ]);
      toast.info("Using sample data. Connect backend for live data.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterClick = (filter: "all" | "maintenance" | "ev" | "scheduled") => {
    setActiveFilter(filter);
    if (filter === "scheduled" && maintenanceSectionRef.current) {
      maintenanceSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleViewDetails = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDetailsOpen(true);
  };

  const handleManage = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsManageOpen(true);
  };

  const handleUpdateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    try {
      await updateVehicle(id, updates);
      localVehicleUpdatesRef.current[id] = { ...localVehicleUpdatesRef.current[id], ...updates };
      setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
      toast.success("Vehicle updated successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      loadData();
    }
  };

  const handleScheduleMaintenance = async (task: any) => {
    await createMaintenanceTask(task);
    await loadData();
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Fleet & Vehicle Management</h1>
          <p className="text-[#757575] text-sm">Monitor fleet health, track maintenance, and manage vehicle assets.</p>
        </div>
        <Button 
          className="bg-[#F97316] hover:bg-[#EA580C] text-white flex items-center gap-2"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus size={16} />
          Add Vehicle
        </Button>
      </div>

      {/* Summary Cards */}
      <FleetSummaryCards 
        summary={summary} 
        loading={loading} 
        onFilterClick={handleFilterClick}
      />

      {/* Main Table */}
      <VehicleStatusTable 
        vehicles={filteredVehicles} 
        loading={loading} 
        onViewDetails={handleViewDetails}
        onManage={handleManage}
        preselectedFilter={activeFilter}
      />

      {/* Maintenance Section */}
      <div ref={maintenanceSectionRef}>
        <MaintenanceScheduleList 
          tasks={filteredMaintenanceTasks} 
          loading={loading} 
          onRefresh={loadData}
          onTaskStatusUpdated={(taskId, status) => {
            localMaintenanceUpdatesRef.current[taskId] = status;
            setMaintenanceTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
          }}
        />
      </div>

      {/* Dialogs & Drawers */}
      <VehicleDetailsDrawer 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
        vehicle={selectedVehicle} 
      />

      <VehicleManageDrawer 
        isOpen={isManageOpen} 
        onClose={() => { setIsManageOpen(false); setSelectedVehicle(null); }} 
        vehicle={selectedVehicle} 
        onUpdate={handleUpdateVehicle}
        onScheduleMaintenance={handleScheduleMaintenance}
      />

      <AddVehicleModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onSuccess={(newVehicle) => {
          if (newVehicle) {
            localVehiclesRef.current = [...localVehiclesRef.current, newVehicle];
            setVehicles(prev => [...prev, newVehicle]);
            loadData();
          }
        }}
      />
    </div>
  );
}
