import React, { useState, useMemo } from "react";
import { Vehicle } from "./fleetApi";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  ArrowUpDown, 
  BatteryCharging, 
  Fuel, 
  Bike,
  Car
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VehicleStatusTableProps {
  vehicles: Vehicle[];
  loading: boolean;
  onViewDetails: (vehicle: Vehicle) => void;
  onManage: (vehicle: Vehicle) => void;
  preselectedFilter?: "all" | "maintenance" | "ev" | "scheduled" | null;
}

export function VehicleStatusTable({ 
  vehicles, 
  loading, 
  onViewDetails, 
  onManage,
  preselectedFilter 
}: VehicleStatusTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Sync preselected filter prop to local state
  React.useEffect(() => {
    if (preselectedFilter === "maintenance") setStatusFilter("maintenance");
    else if (preselectedFilter === "ev") {
        // We don't have a direct EV filter in local state for simplicity, 
        // but we can implement a more complex filter logic if needed.
        // For now, let's just reset or handle it in the filtering logic below
    }
    else if (preselectedFilter === "all") {
        setStatusFilter("all");
        setTypeFilter("all");
    }
  }, [preselectedFilter]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesSearch = 
        v.vehicleId.toLowerCase().includes(search.toLowerCase()) || 
        (v.assignedRiderName && v.assignedRiderName.toLowerCase().includes(search.toLowerCase()));
      
      const matchesStatus = statusFilter === "all" || v.status === statusFilter;
      const matchesType = typeFilter === "all" || v.type === typeFilter;
      
      // Special handling for the EV "card filter" if passed via props, 
      // but here we are just using local state. 
      // If we wanted to support the "EV Usage" card click perfectly, we might add a `fuelFilter` state.
      const matchesFuel = preselectedFilter === "ev" ? v.fuelType === "EV" : true;

      return matchesSearch && matchesStatus && matchesType && matchesFuel;
    });
  }, [vehicles, search, statusFilter, typeFilter, preselectedFilter]);

  const paginatedVehicles = filteredVehicles.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredVehicles.length / pageSize);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Active</Badge>;
      case "maintenance": return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">Maintenance</Badge>;
      case "inactive": return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-none">Inactive</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getConditionColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    return "text-orange-600";
  };

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl shadow-sm flex flex-col">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-[#E0E0E0] flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by ID or Rider..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
           <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Vehicle Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Electric Scooter">E-Scooter</SelectItem>
              <SelectItem value="Motorbike (Gas)">Motorbike</SelectItem>
              <SelectItem value="Bicycle">Bicycle</SelectItem>
              <SelectItem value="Car">Car</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[150px]">Vehicle ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Assigned Rider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">Loading vehicles...</TableCell>
              </TableRow>
            ) : paginatedVehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-gray-500">No vehicles found matching filters.</TableCell>
              </TableRow>
            ) : (
              paginatedVehicles.map((vehicle) => (
                <TableRow key={vehicle.id} className="hover:bg-gray-50/50">
                  <TableCell className="font-medium text-[#212121]">
                    {vehicle.vehicleId}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       {vehicle.fuelType === "EV" ? <BatteryCharging size={14} className="text-green-600"/> : <Fuel size={14} className="text-gray-500"/>}
                       <span className="text-sm text-gray-600">{vehicle.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {vehicle.assignedRiderName ? (
                      <span className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">
                        {vehicle.assignedRiderName}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(vehicle.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className={`text-sm font-semibold ${getConditionColor(vehicle.conditionScore)}`}>
                        {vehicle.conditionLabel}
                      </span>
                      <span className="text-xs text-gray-400">{vehicle.conditionScore}% Health</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onViewDetails(vehicle)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onManage(vehicle)}>
                          Manage Vehicle
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-[#E0E0E0] flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Showing {Math.min((page - 1) * pageSize + 1, filteredVehicles.length)} to {Math.min(page * pageSize, filteredVehicles.length)} of {filteredVehicles.length} vehicles
        </span>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
