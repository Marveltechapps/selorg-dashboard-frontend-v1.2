import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Store,
  Warehouse,
  Staff,
  DeliveryZone,
  fetchStores,
  fetchWarehouses,
  fetchStaff,
  fetchDeliveryZones,
  fetchStorePerformance,
  deleteStore,
  updateStore,
  bulkUpdateStoreStatus,
  getStoreStats,
  fetchInventories,
  fetchStockMovements,
  fetchGRNs,
  fetchPutawayTasks,
  fetchBins,
  type InventoryItem,
  type StockMovement,
  type GRN,
  type PutawayTask,
  type Bin,
} from './storeWarehouseApi';
import { AddStoreModal } from './modals/AddStoreModal';
import { toast } from 'sonner';
import {
  Store as StoreIcon,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  Clock,
  Users,
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2,
  Navigation,
  Package,
  Activity,
  CheckCircle,
  AlertCircle,
  Wrench,
  Warehouse as WarehouseIcon,
  Briefcase,
  Target,
  RefreshCw,
  Eye,
  Star,
  Boxes,
  ArrowRightLeft,
  ClipboardList,
  Layers,
  Container,
} from 'lucide-react';

export function StoreWarehouseManagement() {
  const [stores, setStores] = useState<Store[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Sub-sections (Inventories, Stock Movements, GRNs, Putaway, Bins) - lazy loaded
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [inventoriesMeta, setInventoriesMeta] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  const [inventoriesLoading, setInventoriesLoading] = useState(false);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [stockMovementsMeta, setStockMovementsMeta] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  const [stockMovementsLoading, setStockMovementsLoading] = useState(false);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [grnsMeta, setGrnsMeta] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  const [grnsLoading, setGrnsLoading] = useState(false);
  const [putawayTasks, setPutawayTasks] = useState<PutawayTask[]>([]);
  const [putawayMeta, setPutawayMeta] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  const [putawayLoading, setPutawayLoading] = useState(false);
  const [bins, setBins] = useState<Bin[]>([]);
  const [binsMeta, setBinsMeta] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  const [binsLoading, setBinsLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');

  // Modals
  const [addStoreOpen, setAddStoreOpen] = useState(false);
  const [addWarehouseOpen, setAddWarehouseOpen] = useState(false);
  const [editStore, setEditStore] = useState<Store | null>(null);
  const [storeType, setStoreType] = useState<'store' | 'warehouse'>('store');
  const [storeDetailsOpen, setStoreDetailsOpen] = useState(false);
  const [selectedStoreDetails, setSelectedStoreDetails] = useState<Store | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [storesRes, warehousesRes, staffData, zonesData, perfData, statsData] = await Promise.all([
        fetchStores({ limit: 100 }),
        fetchWarehouses({ limit: 100 }),
        fetchStaff(),
        fetchDeliveryZones(),
        fetchStorePerformance(),
        getStoreStats(),
      ]);
      setStores(storesRes.data);
      setWarehouses(warehousesRes.data);
      setStaff(staffData);
      setZones(zonesData);
      setPerformance(perfData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load store data:', error);
      toast.error('Failed to load store data. Please retry.');
      setLoadError(true);
      setStores([]);
      setWarehouses([]);
      setStaff([]);
      setZones([]);
      setPerformance([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStore = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await deleteStore(id);
      toast.success('Store deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete store');
    }
  };

  const handleEditStore = (store: Store) => {
    setEditStore(store);
    setAddStoreOpen(true);
  };

  const handleToggleStatus = async (store: Store) => {
    const newStatus = store.status === 'active' ? 'inactive' : 'active';
    try {
      await updateStore(store.id, { status: newStatus });
      toast.success(`Store ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update store');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1"><CheckCircle size={12} />Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="gap-1"><AlertCircle size={12} />Inactive</Badge>;
      case 'maintenance':
        return <Badge className="bg-amber-500 hover:bg-amber-600 gap-1"><Wrench size={12} />Maintenance</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'store':
        return <Badge variant="outline">🏪 Store</Badge>;
      case 'dark_store':
        return <Badge variant="outline">🌙 Dark Store</Badge>;
      case 'warehouse':
        return <Badge variant="outline">📦 Warehouse</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getCapacityColor = (current: number, max: number) => {
    const percent = (current / max) * 100;
    if (percent >= 90) return 'text-rose-600';
    if (percent >= 70) return 'text-amber-600';
    return 'text-emerald-600';
  };

  // Filtering
  const filteredStores = stores.filter(store => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        store.name.toLowerCase().includes(query) ||
        store.code.toLowerCase().includes(query) ||
        store.address.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    if (statusFilter !== 'all' && store.status !== statusFilter) return false;
    if (cityFilter !== 'all' && store.city !== cityFilter) return false;
    return true;
  });

  const cities = [...new Set(stores.map(s => s.city))];

  const loadInventories = async () => {
    setInventoriesLoading(true);
    try {
      const res = await fetchInventories({ page: 1, limit: 50 });
      setInventories(res.data);
      setInventoriesMeta(res.meta);
    } catch {
      toast.error('Failed to load inventories');
      setInventories([]);
      setInventoriesMeta(null);
    } finally {
      setInventoriesLoading(false);
    }
  };
  const loadStockMovements = async () => {
    setStockMovementsLoading(true);
    try {
      const res = await fetchStockMovements({ page: 1, limit: 50 });
      setStockMovements(res.data);
      setStockMovementsMeta(res.meta);
    } catch {
      toast.error('Failed to load stock movements');
      setStockMovements([]);
      setStockMovementsMeta(null);
    } finally {
      setStockMovementsLoading(false);
    }
  };
  const loadGRNs = async () => {
    setGrnsLoading(true);
    try {
      const res = await fetchGRNs({ page: 1, limit: 50 });
      setGrns(res.data);
      setGrnsMeta(res.meta);
    } catch {
      toast.error('Failed to load GRNs');
      setGrns([]);
      setGrnsMeta(null);
    } finally {
      setGrnsLoading(false);
    }
  };
  const loadPutaway = async () => {
    setPutawayLoading(true);
    try {
      const res = await fetchPutawayTasks({ page: 1, limit: 50 });
      setPutawayTasks(res.data);
      setPutawayMeta(res.meta);
    } catch {
      toast.error('Failed to load putaway tasks');
      setPutawayTasks([]);
      setPutawayMeta(null);
    } finally {
      setPutawayLoading(false);
    }
  };
  const loadBins = async () => {
    setBinsLoading(true);
    try {
      const res = await fetchBins({ page: 1, limit: 50 });
      setBins(res.data);
      setBinsMeta(res.meta);
    } catch {
      toast.error('Failed to load bins');
      setBins([]);
      setBinsMeta(null);
    } finally {
      setBinsLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Store & Warehouse Management</h1>
          <p className="text-[#71717a] text-sm">Manage fulfillment centers, inventory, and operations</p>
        </div>
        <Button size="sm" onClick={loadData} variant="outline">
          <RefreshCw size={14} className="mr-1.5" /> Refresh
        </Button>
      </div>

      {loadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center justify-between">
          <p className="text-sm text-rose-800">Failed to load data. Please check your connection and retry.</p>
          <Button size="sm" variant="outline" onClick={loadData} className="border-rose-300 text-rose-700 hover:bg-rose-100">
            <RefreshCw size={14} className="mr-1.5" /> Retry
          </Button>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#71717a] uppercase tracking-wider">Total Stores</p>
                <p className="text-2xl font-bold text-[#18181b] mt-1">{stats.totalStores}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <StoreIcon className="text-blue-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#71717a] uppercase tracking-wider">Active Stores</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.activeStores}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-emerald-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#71717a] uppercase tracking-wider">Warehouses</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalWarehouses}</p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <WarehouseIcon className="text-purple-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#71717a] uppercase tracking-wider">Total Staff</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.totalStaff}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <Users className="text-amber-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#71717a] uppercase tracking-wider">Avg Rating</p>
                <p className="text-2xl font-bold text-[#18181b] mt-1">{stats.avgRating} ⭐</p>
              </div>
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Star className="text-yellow-600" size={20} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="stores" className="space-y-4" onValueChange={(v) => {
          if (v === 'inventories' && inventoriesMeta === null && !inventoriesLoading) loadInventories();
          if (v === 'stock-movements' && stockMovementsMeta === null && !stockMovementsLoading) loadStockMovements();
          if (v === 'grns' && grnsMeta === null && !grnsLoading) loadGRNs();
          if (v === 'putaway' && putawayMeta === null && !putawayLoading) loadPutaway();
          if (v === 'bins' && binsMeta === null && !binsLoading) loadBins();
        }}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="stores">
            <StoreIcon size={14} className="mr-1.5" /> Stores
          </TabsTrigger>
          <TabsTrigger value="warehouses">
            <WarehouseIcon size={14} className="mr-1.5" /> Warehouses
          </TabsTrigger>
          <TabsTrigger value="staff">
            <Users size={14} className="mr-1.5" /> Staff
          </TabsTrigger>
          <TabsTrigger value="zones">
            <MapPin size={14} className="mr-1.5" /> Delivery Zones
          </TabsTrigger>
          <TabsTrigger value="performance">
            <TrendingUp size={14} className="mr-1.5" /> Performance
          </TabsTrigger>
          <TabsTrigger value="inventories">
            <Boxes size={14} className="mr-1.5" /> Inventories
          </TabsTrigger>
          <TabsTrigger value="stock-movements">
            <ArrowRightLeft size={14} className="mr-1.5" /> Stock Movements
          </TabsTrigger>
          <TabsTrigger value="grns">
            <ClipboardList size={14} className="mr-1.5" /> GRNs
          </TabsTrigger>
          <TabsTrigger value="putaway">
            <Layers size={14} className="mr-1.5" /> Putaway
          </TabsTrigger>
          <TabsTrigger value="bins">
            <Container size={14} className="mr-1.5" /> Bins
          </TabsTrigger>
        </TabsList>

        {/* Stores Tab */}
        <TabsContent value="stores">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            {/* Controls */}
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" size={14} />
                <Input
                  placeholder="Search stores by name, code, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                size="sm" 
                onClick={() => {
                  setStoreType('store');
                  setEditStore(null);
                  setAddStoreOpen(true);
                }}
              >
                <Plus size={14} className="mr-1.5" /> Add Store
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-auto max-h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-[#f9fafb] z-10">
                  <TableRow>
                    <TableHead>Store Details</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead className="text-center">Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-[#71717a]">
                        Loading stores...
                      </TableCell>
                    </TableRow>
                  ) : filteredStores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-[#71717a]">
                        No stores found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStores.map((store) => (
                      <TableRow key={store.id} className="hover:bg-[#fcfcfc]">
                        <TableCell>
                          <div>
                            <div className="font-medium text-[#18181b] flex items-center gap-2">
                              {store.name}
                              {store.rating >= 4.5 && <Star size={12} className="text-amber-500 fill-amber-500" />}
                            </div>
                            <div className="text-xs text-[#71717a] font-mono">{store.code}</div>
                            <div className="text-xs text-[#a1a1aa] flex items-center gap-1 mt-1">
                              <Phone size={10} /> {store.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(store.type)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="text-[#52525b] flex items-center gap-1">
                              <MapPin size={12} className="text-[#a1a1aa]" />
                              {store.city}
                            </div>
                            <div className="text-xs text-[#a1a1aa] mt-0.5">{store.pincode}</div>
                            <div className="text-xs text-[#a1a1aa] flex items-center gap-1 mt-0.5">
                              <Navigation size={10} /> {store.deliveryRadius}km radius
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="text-[#52525b]">{store.manager}</div>
                            <div className="text-xs text-[#a1a1aa] flex items-center gap-1 mt-0.5">
                              <Users size={10} /> {store.staffCount} staff
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className={`font-bold ${getCapacityColor(store.currentLoad, store.maxCapacity)}`}>
                            {store.currentLoad} / {store.maxCapacity}
                          </div>
                          <div className="text-xs text-[#71717a] mt-1">
                            {Math.round((store.currentLoad / store.maxCapacity) * 100)}% utilized
                          </div>
                          <div className="w-full h-1.5 bg-[#e4e4e7] rounded-full overflow-hidden mt-1">
                            <div 
                              className={`h-full ${
                                (store.currentLoad / store.maxCapacity) >= 0.9 ? 'bg-rose-500' :
                                (store.currentLoad / store.maxCapacity) >= 0.7 ? 'bg-amber-500' :
                                'bg-emerald-500'
                              } transition-all`}
                              style={{ width: `${Math.min((store.currentLoad / store.maxCapacity) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(store.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditStore(store)}>
                                <Edit size={14} className="mr-2" /> Edit Store
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedStoreDetails(store);
                                setStoreDetailsOpen(true);
                              }}>
                                <Eye size={14} className="mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(store)}>
                                {store.status === 'active' ? (
                                  <><AlertCircle size={14} className="mr-2" /> Deactivate</>
                                ) : (
                                  <><CheckCircle size={14} className="mr-2" /> Activate</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteStore(store.id, store.name)}
                                className="text-rose-600"
                              >
                                <Trash2 size={14} className="mr-2" /> Delete
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

            {/* Footer */}
            <div className="p-4 border-t border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <p className="text-sm text-[#71717a]">
                Showing {filteredStores.length} of {stores.length} stores
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <h3 className="font-bold text-[#18181b]">Warehouse Inventory Centers</h3>
              <Button 
                size="sm" 
                onClick={() => {
                  setStoreType('warehouse');
                  setEditStore(null);
                  setAddStoreOpen(true);
                }}
              >
                <Plus size={14} className="mr-1.5" /> Add Warehouse
              </Button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                {warehouses.map((warehouse) => (
                  <div key={warehouse.id} className="border border-[#e4e4e7] rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                            <WarehouseIcon className="text-purple-600" size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-[#18181b]">{warehouse.name}</h4>
                            <p className="text-xs text-[#71717a] font-mono">{warehouse.code}</p>
                          </div>
                          {warehouse.status === 'active' && (
                            <Badge className="bg-emerald-500">Active</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-[#71717a] uppercase">Location</p>
                            <p className="text-sm font-medium text-[#18181b] mt-1">{warehouse.city}</p>
                            <p className="text-xs text-[#a1a1aa]">{warehouse.address}</p>
                          </div>

                          <div>
                            <p className="text-xs text-[#71717a] uppercase">Storage Capacity</p>
                            <p className="text-sm font-medium text-[#18181b] mt-1">
                              {warehouse.storageCapacity.toLocaleString()} m³
                            </p>
                            <p className="text-xs text-[#a1a1aa]">{warehouse.currentUtilization}% utilized</p>
                          </div>

                          <div>
                            <p className="text-xs text-[#71717a] uppercase">Inventory Value</p>
                            <p className="text-sm font-medium text-[#18181b] mt-1">
                              ₹{(warehouse.inventoryValue / 1000000).toFixed(1)}M
                            </p>
                            <p className="text-xs text-[#a1a1aa]">{warehouse.productCount.toLocaleString()} products</p>
                          </div>

                          <div>
                            <p className="text-xs text-[#71717a] uppercase">Manager</p>
                            <p className="text-sm font-medium text-[#18181b] mt-1">{warehouse.manager}</p>
                            <p className="text-xs text-[#a1a1aa]">{warehouse.zones.length} zones</p>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="w-full h-2 bg-[#e4e4e7] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 transition-all"
                              style={{ width: `${warehouse.currentUtilization}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Store Staff Directory</h3>
            </div>

            <div className="overflow-auto max-h-[600px]">
              {staff.length === 0 ? (
                <div className="p-12 text-center text-[#71717a]">
                  <p>No staff data available</p>
                  <p className="text-xs mt-2">Staff information will appear here once added</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-[#f9fafb] z-10">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((member) => (
                      <TableRow key={member.id} className="hover:bg-[#fcfcfc]">
                        <TableCell>
                          <div className="font-medium text-[#18181b]">{member.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {member.role === 'manager' && '👔'}
                            {member.role === 'picker' && '📦'}
                            {member.role === 'packer' && '📮'}
                            {member.role === 'delivery' && '🚴'}
                            {member.role === 'supervisor' && '👨‍💼'}
                            {' '}{member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-[#52525b]">{member.storeName}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{member.shift.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div className="text-[#52525b]">{member.phone}</div>
                            <div className="text-[#a1a1aa]">{member.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-[#e4e4e7] rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${
                                  member.performance >= 90 ? 'bg-emerald-500' :
                                  member.performance >= 70 ? 'bg-amber-500' :
                                  'bg-rose-500'
                                }`}
                                style={{ width: `${member.performance}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium">{member.performance}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.status === 'active' && <Badge className="bg-emerald-500">Active</Badge>}
                          {member.status === 'on_leave' && <Badge className="bg-amber-500">On Leave</Badge>}
                          {member.status === 'inactive' && <Badge variant="secondary">Inactive</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Zones Tab */}
        <TabsContent value="zones">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Delivery Zone Coverage</h3>
            </div>

            <div className="p-6">
              {zones.length === 0 ? (
                <div className="p-12 text-center text-[#71717a]">
                  <p>No delivery zones configured</p>
                  <p className="text-xs mt-2">Delivery zones will appear here once added</p>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {zones.map((zone) => (
                  <div key={zone.id} className="border border-[#e4e4e7] rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-[#18181b]">{zone.name}</h4>
                        <p className="text-xs text-[#71717a]">{zone.storeName}</p>
                      </div>
                      {zone.isActive && <Badge className="bg-emerald-500">Active</Badge>}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#71717a]">Radius</span>
                        <span className="font-medium text-[#18181b]">{zone.radius} km</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#71717a]">Avg Delivery Time</span>
                        <span className="font-medium text-[#18181b]">{zone.avgDeliveryTime} min</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#71717a]">Order Volume</span>
                        <span className="font-medium text-[#18181b]">{zone.orderVolume.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs text-[#71717a] mb-1">Coverage Areas:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {zone.areas.map(area => (
                          <Badge key={area} variant="secondary" className="text-xs">{area}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Store Performance Metrics</h3>
            </div>

            <div className="overflow-auto max-h-[600px]">
              {performance.length === 0 ? (
                <div className="p-12 text-center text-[#71717a]">
                  <p>No performance data available</p>
                  <p className="text-xs mt-2">Performance metrics will appear here once stores start operating</p>
                </div>
              ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-[#f9fafb] z-10">
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead className="text-center">Today</TableHead>
                    <TableHead className="text-center">This Week</TableHead>
                    <TableHead className="text-center">This Month</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead className="text-center">On-Time %</TableHead>
                    <TableHead className="text-center">Capacity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance.map((perf) => (
                    <TableRow key={perf.storeId} className="hover:bg-[#fcfcfc]">
                      <TableCell>
                        <div className="font-medium text-[#18181b]">{perf.storeName}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="font-medium text-[#18181b]">{perf.ordersToday}</div>
                        <div className="text-xs text-[#71717a]">₹{(perf.revenueToday / 1000).toFixed(0)}K</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="font-medium text-[#18181b]">{perf.ordersWeek}</div>
                        <div className="text-xs text-[#71717a]">₹{(perf.revenueWeek / 1000).toFixed(0)}K</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="font-medium text-[#18181b]">{perf.ordersMonth.toLocaleString()}</div>
                        <div className="text-xs text-[#71717a]">₹{(perf.revenueMonth / 1000000).toFixed(1)}M</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="font-medium text-[#18181b]">{perf.avgRating} ⭐</div>
                        <div className="text-xs text-[#71717a]">{perf.totalReviews} reviews</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={`font-medium ${
                          perf.onTimeDelivery >= 95 ? 'text-emerald-600' :
                          perf.onTimeDelivery >= 85 ? 'text-amber-600' :
                          'text-rose-600'
                        }`}>
                          {perf.onTimeDelivery}%
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={`font-medium ${
                          perf.capacityUtilization >= 90 ? 'text-rose-600' :
                          perf.capacityUtilization >= 70 ? 'text-amber-600' :
                          'text-emerald-600'
                        }`}>
                          {perf.capacityUtilization}%
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Inventories Tab */}
        <TabsContent value="inventories">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <h3 className="font-bold text-[#18181b]">Inventory Items</h3>
              <Button size="sm" variant="outline" onClick={loadInventories} disabled={inventoriesLoading}>
                <RefreshCw size={14} className="mr-1.5" /> Refresh
              </Button>
            </div>
            <div className="overflow-auto max-h-[500px]">
              {inventoriesLoading ? (
                <div className="p-12 text-center text-[#71717a]">Loading inventories...</div>
              ) : inventories.length === 0 ? (
                <div className="p-12 text-center text-[#71717a]">
                  <p>No inventory items yet</p>
                  <p className="text-xs mt-2">Inventory will appear here once added</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-[#f9fafb] z-10">
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventories.map((item) => (
                      <TableRow key={item.id} className="hover:bg-[#fcfcfc]">
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right">
                          <span className={item.currentStock < item.minStock ? 'text-rose-600 font-medium' : ''}>
                            {item.currentStock} / {item.maxStock}
                          </span>
                        </TableCell>
                        <TableCell>{item.location}</TableCell>
                        <TableCell className="text-right">₹{item.value?.toLocaleString() ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            {inventoriesMeta && (
              <div className="p-3 border-t border-[#e4e4e7] text-xs text-[#71717a]">
                Showing {inventories.length} of {inventoriesMeta.total} items
              </div>
            )}
          </div>
        </TabsContent>

        {/* Stock Movements Tab */}
        <TabsContent value="stock-movements">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <h3 className="font-bold text-[#18181b]">Stock Movements</h3>
              <Button size="sm" variant="outline" onClick={loadStockMovements} disabled={stockMovementsLoading}>
                <RefreshCw size={14} className="mr-1.5" /> Refresh
              </Button>
            </div>
            <div className="overflow-auto max-h-[500px]">
              {stockMovementsLoading ? (
                <div className="p-12 text-center text-[#71717a]">Loading stock movements...</div>
              ) : stockMovements.length === 0 ? (
                <div className="p-12 text-center text-[#71717a]">
                  <p>No stock movements yet</p>
                  <p className="text-xs mt-2">Transfers and adjustments will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-[#f9fafb] z-10">
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockMovements.map((m) => (
                      <TableRow key={m.id} className="hover:bg-[#fcfcfc]">
                        <TableCell className="font-mono text-sm">{m.reference}</TableCell>
                        <TableCell>{m.fromLocation}</TableCell>
                        <TableCell>{m.toLocation}</TableCell>
                        <TableCell>{m.sku ?? '-'}</TableCell>
                        <TableCell className="text-right">{m.quantity}</TableCell>
                        <TableCell><Badge variant="outline">{m.status}</Badge></TableCell>
                        <TableCell className="text-xs text-[#71717a]">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            {stockMovementsMeta && (
              <div className="p-3 border-t border-[#e4e4e7] text-xs text-[#71717a]">
                Showing {stockMovements.length} of {stockMovementsMeta.total} movements
              </div>
            )}
          </div>
        </TabsContent>

        {/* GRNs Tab */}
        <TabsContent value="grns">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <h3 className="font-bold text-[#18181b]">Goods Received Notes (GRNs)</h3>
              <Button size="sm" variant="outline" onClick={loadGRNs} disabled={grnsLoading}>
                <RefreshCw size={14} className="mr-1.5" /> Refresh
              </Button>
            </div>
            <div className="overflow-auto max-h-[500px]">
              {grnsLoading ? (
                <div className="p-12 text-center text-[#71717a]">Loading GRNs...</div>
              ) : grns.length === 0 ? (
                <div className="p-12 text-center text-[#71717a]">
                  <p>No GRNs yet</p>
                  <p className="text-xs mt-2">Goods received notes will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-[#f9fafb] z-10">
                    <TableRow>
                      <TableHead>GRN ID</TableHead>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grns.map((g) => (
                      <TableRow key={g.id} className="hover:bg-[#fcfcfc]">
                        <TableCell className="font-mono text-sm">{g.id}</TableCell>
                        <TableCell>{g.poNumber}</TableCell>
                        <TableCell>{g.vendor}</TableCell>
                        <TableCell className="text-right">{g.items}</TableCell>
                        <TableCell><Badge variant={g.status === 'completed' ? 'default' : 'outline'}>{g.status}</Badge></TableCell>
                        <TableCell className="text-xs text-[#71717a]">{g.timestamp ? new Date(g.timestamp).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            {grnsMeta && (
              <div className="p-3 border-t border-[#e4e4e7] text-xs text-[#71717a]">
                Showing {grns.length} of {grnsMeta.total} GRNs
              </div>
            )}
          </div>
        </TabsContent>

        {/* Putaway Tab */}
        <TabsContent value="putaway">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <h3 className="font-bold text-[#18181b]">Putaway Tasks</h3>
              <Button size="sm" variant="outline" onClick={loadPutaway} disabled={putawayLoading}>
                <RefreshCw size={14} className="mr-1.5" /> Refresh
              </Button>
            </div>
            <div className="overflow-auto max-h-[500px]">
              {putawayLoading ? (
                <div className="p-12 text-center text-[#71717a]">Loading putaway tasks...</div>
              ) : putawayTasks.length === 0 ? (
                <div className="p-12 text-center text-[#71717a]">
                  <p>No putaway tasks yet</p>
                  <p className="text-xs mt-2">Putaway tasks will appear here once created</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-[#f9fafb] z-10">
                    <TableRow>
                      <TableHead>Task ID</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {putawayTasks.map((t) => (
                      <TableRow key={t.id} className="hover:bg-[#fcfcfc]">
                        <TableCell className="font-mono text-sm">{t.id}</TableCell>
                        <TableCell>{t.sku}</TableCell>
                        <TableCell>{t.productName}</TableCell>
                        <TableCell className="text-right">{t.quantity}</TableCell>
                        <TableCell>{t.location}</TableCell>
                        <TableCell>{t.assignedTo ?? '-'}</TableCell>
                        <TableCell><Badge variant={t.status === 'completed' ? 'default' : 'outline'}>{t.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            {putawayMeta && (
              <div className="p-3 border-t border-[#e4e4e7] text-xs text-[#71717a]">
                Showing {putawayTasks.length} of {putawayMeta.total} tasks
              </div>
            )}
          </div>
        </TabsContent>

        {/* Bins Tab */}
        <TabsContent value="bins">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <h3 className="font-bold text-[#18181b]">Storage Bins</h3>
              <Button size="sm" variant="outline" onClick={loadBins} disabled={binsLoading}>
                <RefreshCw size={14} className="mr-1.5" /> Refresh
              </Button>
            </div>
            <div className="overflow-auto max-h-[500px]">
              {binsLoading ? (
                <div className="p-12 text-center text-[#71717a]">Loading bins...</div>
              ) : bins.length === 0 ? (
                <div className="p-12 text-center text-[#71717a]">
                  <p>No bins configured yet</p>
                  <p className="text-xs mt-2">Storage locations will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-[#f9fafb] z-10">
                    <TableRow>
                      <TableHead>Aisle</TableHead>
                      <TableHead>Rack</TableHead>
                      <TableHead>Shelf</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bins.map((b) => (
                      <TableRow key={b.id} className="hover:bg-[#fcfcfc]">
                        <TableCell>{b.aisle}</TableCell>
                        <TableCell>{b.rack}</TableCell>
                        <TableCell>{b.shelf}</TableCell>
                        <TableCell>{b.zone ?? '-'}</TableCell>
                        <TableCell>{b.sku ?? '-'}</TableCell>
                        <TableCell className="text-right">{b.quantity ?? '-'}</TableCell>
                        <TableCell><Badge variant={b.status === 'occupied' ? 'default' : 'outline'}>{b.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            {binsMeta && (
              <div className="p-3 border-t border-[#e4e4e7] text-xs text-[#71717a]">
                Showing {bins.length} of {binsMeta.total} bins
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddStoreModal
        open={addStoreOpen}
        onOpenChange={(open) => {
          setAddStoreOpen(open);
          if (!open) {
            setEditStore(null);
            setStoreType('store');
          }
        }}
        onSuccess={loadData}
        editStore={editStore}
        storeType={storeType}
      />

      {/* Store Details Sheet */}
      <Sheet open={storeDetailsOpen} onOpenChange={setStoreDetailsOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Store Details</SheetTitle>
          </SheetHeader>
          {selectedStoreDetails && (
            <div className="mt-6 space-y-6">
              <div>
                <h4 className="font-bold text-[#18181b] flex items-center gap-2">
                  {selectedStoreDetails.name}
                  {selectedStoreDetails.rating >= 4.5 && <Star size={14} className="text-amber-500 fill-amber-500" />}
                </h4>
                <p className="text-xs text-[#71717a] font-mono">{selectedStoreDetails.code}</p>
                {getTypeBadge(selectedStoreDetails.type)}
                {getStatusBadge(selectedStoreDetails.status)}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-[#71717a] uppercase">Address</p>
                <p className="text-sm text-[#18181b]">{selectedStoreDetails.address}, {selectedStoreDetails.city}, {selectedStoreDetails.state} - {selectedStoreDetails.pincode}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-[#71717a]">Phone</p>
                  <p className="text-sm font-medium">{selectedStoreDetails.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-[#71717a]">Email</p>
                  <p className="text-sm font-medium truncate">{selectedStoreDetails.email}</p>
                </div>
                <div>
                  <p className="text-xs text-[#71717a]">Manager</p>
                  <p className="text-sm font-medium">{selectedStoreDetails.manager}</p>
                </div>
                <div>
                  <p className="text-xs text-[#71717a]">Staff</p>
                  <p className="text-sm font-medium">{selectedStoreDetails.staffCount}</p>
                </div>
                <div>
                  <p className="text-xs text-[#71717a]">Capacity</p>
                  <p className="text-sm font-medium">{selectedStoreDetails.currentLoad} / {selectedStoreDetails.maxCapacity}</p>
                </div>
                <div>
                  <p className="text-xs text-[#71717a]">Delivery radius</p>
                  <p className="text-sm font-medium">{selectedStoreDetails.deliveryRadius} km</p>
                </div>
                <div>
                  <p className="text-xs text-[#71717a]">Rating</p>
                  <p className="text-sm font-medium">{selectedStoreDetails.rating} ⭐</p>
                </div>
                <div>
                  <p className="text-xs text-[#71717a]">Total orders</p>
                  <p className="text-sm font-medium">{selectedStoreDetails.totalOrders?.toLocaleString() ?? '-'}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-[#e4e4e7] flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { handleEditStore(selectedStoreDetails); setStoreDetailsOpen(false); }}>
                  <Edit size={14} className="mr-1.5" /> Edit Store
                </Button>
                <Button size="sm" variant="outline" onClick={() => setStoreDetailsOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}