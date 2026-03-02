import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  fetchZones,
  fetchCoverageStats,
  fetchZonePerformance,
  fetchZoneHistory,
  fetchOverlapWarnings,
  createZone,
  updateZone,
  deleteZone,
  toggleZoneStatus,
  cloneZone,
  GeofenceZone,
  CoverageStats,
  ZonePerformance,
  ZoneHistory,
  OverlapWarning,
} from './geofenceApi';
import { toast } from 'sonner';
import {
  Map,
  Plus,
  Minus,
  RefreshCw,
  MapPin,
  Edit,
  Trash2,
  Copy,
  Eye,
  Power,
  AlertTriangle,
  TrendingUp,
  Users,
  Package,
  Clock,
  Star,
  Download,
  Upload,
  Search,
  Filter,
  Layers,
  Maximize2,
  Settings,
} from 'lucide-react';

export function GeofenceManager() {
  const [zones, setZones] = useState<GeofenceZone[]>([]);
  const [coverageStats, setCoverageStats] = useState<CoverageStats | null>(null);
  const [zonePerformance, setZonePerformance] = useState<ZonePerformance[]>([]);
  const [history, setHistory] = useState<ZoneHistory[]>([]);
  const [overlaps, setOverlaps] = useState<OverlapWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<GeofenceZone | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Form states
  const [zoneForm, setZoneForm] = useState({
    name: '',
    city: 'Mumbai',
    region: 'West',
    type: 'standard' as GeofenceZone['type'],
  });

  // Drawing state
  const [drawingPoints, setDrawingPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [editDrawingPoints, setEditDrawingPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [isEditDrawing, setIsEditDrawing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  
  // Map view filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [showLayers, setShowLayers] = useState(true);

  const [settingsForm, setSettingsForm] = useState({
    deliveryFee: 39,
    minOrderValue: 149,
    maxDeliveryRadius: 4,
    estimatedDeliveryTime: 30,
    surgeMultiplier: 1.0,
    maxCapacity: 100,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [zonesData, statsData, performanceData, historyData, overlapsData] = await Promise.all([
        fetchZones(),
        fetchCoverageStats(),
        fetchZonePerformance(),
        fetchZoneHistory(),
        fetchOverlapWarnings(),
      ]);

      setZones(zonesData);
      setCoverageStats(statsData);
      setZonePerformance(performanceData);
      setHistory(historyData);
      setOverlaps(overlapsData);
    } catch (error) {
      toast.error('Failed to load geofence data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateZone = async () => {
    if (!zoneForm.name.trim()) {
      toast.error('Zone name is required');
      return;
    }
    if (drawingPoints.length < 3) {
      toast.error('Please add at least 3 points to create a zone boundary');
      return;
    }
    try {
      const center = {
        lat: drawingPoints.reduce((sum, p) => sum + p.lat, 0) / drawingPoints.length,
        lng: drawingPoints.reduce((sum, p) => sum + p.lng, 0) / drawingPoints.length,
      };
      await createZone({
        ...zoneForm,
        polygon: drawingPoints,
        center,
      });
      toast.success('Zone created successfully');
      setShowCreateModal(false);
      setZoneForm({ name: '', city: 'Mumbai', region: 'West', type: 'standard' });
      setDrawingPoints([]);
      setIsDrawing(false);
      loadData();
    } catch (error) {
      console.error('Create zone error:', error);
      toast.error('Failed to create zone');
    }
  };

  const handleEditMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditDrawing || !showEditModal) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lat = 19.0760 + (y / rect.height - 0.5) * 0.1;
    const lng = 72.8777 + (x / rect.width - 0.5) * 0.1;
    setEditDrawingPoints([...editDrawingPoints, { lat, lng }]);
    toast.success(`Point ${editDrawingPoints.length + 1} added`);
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !showCreateModal) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lat = 19.0760 + (y / rect.height - 0.5) * 0.1;
    const lng = 72.8777 + (x / rect.width - 0.5) * 0.1;
    setDrawingPoints([...drawingPoints, { lat, lng }]);
    toast.success(`Point ${drawingPoints.length + 1} added`);
  };

  const handleClearPoints = () => {
    setDrawingPoints([]);
    toast.info('Boundary points cleared');
  };

  const handleToggleStatus = async (zoneId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await toggleZoneStatus(zoneId, newStatus);
      toast.success(`Zone ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update zone status');
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    try {
      await deleteZone(zoneId);
      toast.success('Zone deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete zone');
    }
  };

  const handleCloneZone = async (zoneId: string, zoneName: string) => {
    try {
      await cloneZone(zoneId, `${zoneName} (Copy)`);
      toast.success('Zone cloned successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to clone zone');
    }
  };

  const handleExportZones = () => {
    try {
      const csv = [
        ['Zone Name', 'City', 'Region', 'Type', 'Status', 'Coverage Area (km²)', 'Daily Orders', 'Revenue', 'Population'],
        ...zones.map(zone => [
          zone.name,
          zone.city,
          zone.region,
          zone.type,
          zone.status,
          zone.analytics?.areaSize?.toString() || '0',
          zone.analytics?.dailyOrders?.toString() || '0',
          zone.analytics?.revenue?.toString() || '0',
          zone.analytics?.population?.toString() || '0',
        ])
      ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `geofence-zones-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Exported ${zones.length} zone(s) successfully`);
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error(`Failed to export zones: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleImportZones = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          toast.error('CSV file must have at least a header row and one data row');
          return;
        }
        toast.info('Import feature - CSV parsing in progress. Full import functionality coming soon.');
        console.log('CSV content:', text);
      } catch (error: any) {
        console.error('Import failed:', error);
        toast.error(`Failed to import zones: ${error.message || 'Unknown error'}`);
      }
    };
    input.click();
  };

  const getZoneTypeColor = (type: string) => {
    const typeMap: Record<string, string> = {
      standard: 'bg-blue-500',
      express: 'bg-emerald-500',
      'no-service': 'bg-rose-500',
      premium: 'bg-purple-500',
      surge: 'bg-amber-500',
    };
    return typeMap[type] || 'bg-gray-500';
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; className: string }> = {
      active: { variant: 'default', className: 'bg-emerald-500' },
      inactive: { variant: 'secondary', className: 'bg-gray-400' },
      testing: { variant: 'default', className: 'bg-amber-500' },
    };
    const config = statusMap[status] || { variant: 'outline', className: '' };
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Don't block rendering on loading - show data as it loads

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Geofence Manager</h1>
          <p className="text-[#71717a] text-sm">Manage delivery zones and coverage areas</p>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={async () => {
              await loadData();
              toast.success('Geofence data refreshed');
            }} 
            variant="outline"
          >
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleImportZones}
          >
            <Upload size={14} className="mr-1.5" /> Import
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleExportZones}
          >
            <Download size={14} className="mr-1.5" /> Export
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus size={14} className="mr-1.5" /> New Zone
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Total Zones</p>
            <Layers className="text-blue-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{coverageStats?.totalZones ?? 0}</p>
          <p className="text-xs text-emerald-600 mt-2">{coverageStats?.activeZones ?? 0} active</p>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Coverage Area</p>
            <Maximize2 className="text-emerald-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {(coverageStats?.totalCoverage ?? 0).toFixed(1)} km²
          </p>
          <p className="text-xs text-[#71717a] mt-2">Total service area</p>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Population</p>
            <Users className="text-purple-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {(coverageStats?.totalPopulation || 0) >= 1000000
              ? `${((coverageStats?.totalPopulation || 0) / 1000000).toFixed(1)}M`
              : `${((coverageStats?.totalPopulation || 0) / 1000).toFixed(0)}K`}
          </p>
          <p className="text-xs text-[#71717a] mt-2">Covered population</p>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Active Orders</p>
            <Package className="text-amber-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-amber-600">{coverageStats?.activeOrders ?? 0}</p>
          <p className="text-xs text-[#71717a] mt-2">Currently processing</p>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Total Riders</p>
            <MapPin className="text-rose-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-rose-600">{coverageStats?.totalRiders ?? 0}</p>
          <p className="text-xs text-[#71717a] mt-2">Active across zones</p>
        </div>
      </div>

      {/* Overlap Warnings */}
      {overlaps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 mb-1">Zone Overlap Detected</h3>
              <p className="text-sm text-amber-800">
                {overlaps.length} zone overlap{overlaps.length > 1 ? 's' : ''} detected. Review zones to prevent
                conflicts.
              </p>
              <div className="mt-2 space-y-1">
                {overlaps.map((overlap, idx) => (
                  <div key={idx} className="text-xs text-amber-700">
                    • {overlap.zone1} and {overlap.zone2} overlap by {overlap.overlapArea} km² (
                    {overlap.severity} severity)
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="zones" className="space-y-4">
        <TabsList>
          <TabsTrigger value="zones">
            <Layers size={14} className="mr-1.5" /> All Zones
          </TabsTrigger>
          <TabsTrigger value="map">
            <Map size={14} className="mr-1.5" /> Map View
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp size={14} className="mr-1.5" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings size={14} className="mr-1.5" /> Settings
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock size={14} className="mr-1.5" /> History
          </TabsTrigger>
        </TabsList>

        {/* All Zones Tab */}
        <TabsContent value="zones">
          {loading ? (
            <div className="bg-white border border-[#e4e4e7] rounded-xl p-12 text-center">
              <RefreshCw className="animate-spin mx-auto mb-4 text-[#71717a]" size={32} />
              <p className="text-[#71717a]">Loading zones...</p>
            </div>
          ) : zones.length === 0 ? (
            <div className="bg-white border border-[#e4e4e7] rounded-xl p-12 text-center">
              <Map size={48} className="mx-auto mb-4 text-[#a1a1aa]" />
              <h3 className="font-bold text-[#18181b] mb-2">No zones yet</h3>
              <p className="text-[#71717a] text-sm mb-4">Create your first delivery zone to get started</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus size={14} className="mr-1.5" /> New Zone
              </Button>
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-4">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Zone Header */}
                <div
                  className="h-24 relative"
                  style={{
                    background: `linear-gradient(135deg, ${zone.color}88 0%, ${zone.color}44 100%)`,
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Map size={48} style={{ color: zone.color }} className="opacity-40" />
                  </div>
                  <div className="absolute top-3 right-3 flex gap-2">
                    {getStatusBadge(zone.status)}
                    <Badge className={getZoneTypeColor(zone.type)}>{zone.type}</Badge>
                  </div>
                </div>

                {/* Zone Details */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-[#18181b] mb-1">{zone.name}</h3>
                      <p className="text-xs text-[#71717a]">
                        {zone.city}, {zone.region} • {zone.id}
                      </p>
                    </div>
                  </div>

                  {/* Zone Metrics */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-[#f4f4f5] rounded-lg p-2">
                      <p className="text-xs text-[#71717a] mb-0.5">Area</p>
                      <p className="text-sm font-bold text-[#18181b]">{zone.analytics?.areaSize ?? 0} km²</p>
                    </div>
                    <div className="bg-[#f4f4f5] rounded-lg p-2">
                      <p className="text-xs text-[#71717a] mb-0.5">Orders</p>
                      <p className="text-sm font-bold text-[#18181b]">{zone.analytics?.activeOrders ?? 0}</p>
                    </div>
                    <div className="bg-[#f4f4f5] rounded-lg p-2">
                      <p className="text-xs text-[#71717a] mb-0.5">Riders</p>
                      <p className="text-sm font-bold text-[#18181b]">{zone.analytics?.riderCount ?? 0}</p>
                    </div>
                  </div>

                  {/* Zone Settings */}
                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <div>
                      <span className="text-[#71717a]">Delivery Fee:</span>{' '}
                      <span className="font-medium text-[#18181b]">₹{zone.settings?.deliveryFee ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-[#71717a]">Min Order:</span>{' '}
                      <span className="font-medium text-[#18181b]">₹{zone.settings?.minOrderValue ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-[#71717a]">Est Time:</span>{' '}
                      <span className="font-medium text-[#18181b]">{zone.settings?.estimatedDeliveryTime ?? 0}m</span>
                    </div>
                    <div>
                      <span className="text-[#71717a]">Capacity:</span>{' '}
                      <span className="font-medium text-[#18181b]">{zone.settings?.maxCapacity ?? 0}</span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  {zone.type !== 'no-service' && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#71717a]">Capacity Usage</span>
                        <span className="font-medium text-[#18181b]">{zone.analytics?.capacityUsage ?? 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#e4e4e7] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            (zone.analytics?.capacityUsage ?? 0) > 80
                              ? 'bg-rose-500'
                              : (zone.analytics?.capacityUsage ?? 0) > 60
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${zone.analytics?.capacityUsage ?? 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedZone(zone);
                        setShowMapModal(true);
                      }}
                    >
                      <Eye size={14} className="mr-1" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedZone(zone);
                        setZoneForm({
                          name: zone.name,
                          city: zone.city,
                          region: zone.region,
                          type: zone.type,
                        });
                        setEditDrawingPoints(zone.polygon?.length ? [...zone.polygon] : []);
                        setIsEditDrawing(false);
                        setShowEditModal(true);
                      }}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedZone(zone);
                        setSettingsForm({
                          deliveryFee: zone.settings.deliveryFee,
                          minOrderValue: zone.settings.minOrderValue,
                          maxDeliveryRadius: zone.settings.maxDeliveryRadius,
                          estimatedDeliveryTime: zone.settings.estimatedDeliveryTime,
                          surgeMultiplier: zone.settings.surgeMultiplier,
                          maxCapacity: zone.settings.maxCapacity,
                        });
                        setShowSettingsModal(true);
                      }}
                    >
                      <Settings size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        zone.status !== 'inactive' &&
                        handleToggleStatus(zone.id, zone.status)
                      }
                    >
                      <Power size={14} />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleCloneZone(zone.id, zone.name)}>
                      <Copy size={14} />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteZone(zone.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </TabsContent>

        {/* Map View Tab */}
        <TabsContent value="map">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#18181b]">Interactive Map View</h3>
                <p className="text-xs text-[#71717a] mt-1">Visualize all zones on the map</p>
              </div>
              <div className="flex gap-2">
                <Select 
                  value={statusFilter || 'all'} 
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    const filtered = zones.filter(z => val === 'all' || z.status === val);
                    toast.info(`Showing ${filtered.length} zone(s)`);
                  }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={cityFilter || 'all'} 
                  onValueChange={(val) => {
                    setCityFilter(val);
                    const filtered = zones.filter(z => val === 'all' || z.city === val);
                    toast.info(`Showing ${filtered.length} zone(s)`);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {Array.from(new Set(zones.map(z => z.city))).map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setShowLayers(!showLayers);
                    toast.info(showLayers ? 'Layers hidden' : 'Layers visible');
                  }}
                >
                  <Layers size={14} className="mr-1.5" /> {showLayers ? 'Hide' : 'Show'} Layers
                </Button>
              </div>
            </div>

            {/* Map Container */}
            <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 h-[600px] overflow-hidden">
              {/* Map Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `repeating-linear-gradient(0deg, #e5e7eb 0px, #e5e7eb 1px, transparent 1px, transparent 20px),
                                      repeating-linear-gradient(90deg, #e5e7eb 0px, #e5e7eb 1px, transparent 1px, transparent 20px)`,
                  }}
                />
              </div>

              {/* Zone Overlays - apply mapZoom via transform */}
              <div 
                className="absolute inset-0 flex items-center justify-center origin-center transition-transform duration-200"
                style={{ transform: `scale(${mapZoom})` }}
              >
                {zones
                  .filter((z) => (statusFilter === 'all' || z.status === statusFilter) && (cityFilter === 'all' || z.city === cityFilter))
                  .map((zone, idx) => (
                    <div
                      key={zone.id}
                      className="absolute rounded-2xl border-4 flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
                      style={{
                        borderColor: zone.color,
                        backgroundColor: `${zone.color}20`,
                        width: `${120 + idx * 30}px`,
                        height: `${120 + idx * 30}px`,
                        left: `${15 + idx * 12}%`,
                        top: `${20 + (idx % 3) * 15}%`,
                      }}
                      onClick={() => {
                        setSelectedZone(zone);
                        setShowMapModal(true);
                      }}
                    >
                      <div className="text-center p-2">
                        <div className="font-bold text-xs mb-1" style={{ color: zone.color }}>
                          {zone.name}
                        </div>
                        <Badge className={getZoneTypeColor(zone.type)} style={{ fontSize: '9px' }}>
                          {zone.type}
                        </Badge>
                        <div className="text-xs mt-1 font-medium" style={{ color: zone.color }}>
                          {zone.analytics?.activeOrders ?? 0} orders
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Map Legend */}
              <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 border border-[#e4e4e7]">
                <h4 className="text-xs font-bold text-[#18181b] mb-2">Zone Types</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-[#52525b]">Standard</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[#52525b]">Express</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-[#52525b]">Premium</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-[#52525b]">Surge</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-[#52525b]">No Service</span>
                  </div>
                </div>
              </div>

              {/* Map Controls */}
              <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-[#e4e4e7] overflow-hidden">
                <button 
                  className="w-10 h-10 flex items-center justify-center hover:bg-[#f4f4f5] border-b border-[#e4e4e7]"
                  onClick={() => {
                    setMapZoom(prev => Math.min(prev + 0.1, 2));
                    toast.success(`Zoom: ${Math.round((mapZoom + 0.1) * 100)}%`);
                  }}
                  title="Zoom In"
                >
                  <Plus size={16} />
                </button>
                <button 
                  className="w-10 h-10 flex items-center justify-center hover:bg-[#f4f4f5]"
                  onClick={() => {
                    setMapZoom(prev => Math.max(prev - 0.1, 0.5));
                    toast.success(`Zoom: ${Math.round((mapZoom - 0.1) * 100)}%`);
                  }}
                  title="Zoom Out"
                >
                  <Minus size={16} />
                </button>
              </div>

              {/* Active Orders Markers */}
              <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 border border-[#e4e4e7]">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="text-amber-600" size={16} />
                  <span className="text-sm font-bold text-[#18181b]">Live Orders</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">{coverageStats?.activeOrders ?? 0}</p>
                <p className="text-xs text-[#71717a]">Across {coverageStats?.activeZones ?? 0} zones</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="space-y-4">
            {/* Zone Performance Table */}
            <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
                <h3 className="font-bold text-[#18181b]">Zone Performance Ranking</h3>
                <p className="text-xs text-[#71717a] mt-1">Top performing zones by daily metrics</p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Zone Name</TableHead>
                    <TableHead>Daily Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Avg Delivery</TableHead>
                    <TableHead>On-Time %</TableHead>
                    <TableHead>Cancellation</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zonePerformance.map((perf, idx) => (
                    <TableRow key={perf.zoneId}>
                      <TableCell>
                        <Badge
                          className={
                            idx === 0
                              ? 'bg-amber-500'
                              : idx === 1
                              ? 'bg-gray-400'
                              : idx === 2
                              ? 'bg-orange-600'
                              : 'bg-gray-300'
                          }
                        >
                          #{idx + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{perf.zoneName}</TableCell>
                      <TableCell className="font-bold">{perf.orders}</TableCell>
                      <TableCell className="font-bold text-emerald-600">
                        ₹{(perf.revenue / 1000).toFixed(0)}K
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            perf.avgDeliveryTime < 20
                              ? 'border-emerald-500 text-emerald-600'
                              : perf.avgDeliveryTime < 30
                              ? 'border-amber-500 text-amber-600'
                              : 'border-rose-500 text-rose-600'
                          }
                        >
                          {perf.avgDeliveryTime}m
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500">{perf.onTimeRate}%</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            perf.cancellationRate < 2
                              ? 'bg-emerald-500'
                              : perf.cancellationRate < 3
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }
                        >
                          {perf.cancellationRate}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="text-amber-500" size={14} fill="#f59e0b" />
                          <span className="font-medium">{perf.rating}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Zone Metrics Grid */}
            <div className="grid grid-cols-3 gap-4">
              {zones
                .filter((z) => z.status === 'active')
                .slice(0, 6)
                .map((zone) => (
                  <div key={zone.id} className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-[#18181b] text-sm">{zone.name}</h4>
                      <Badge className={getZoneTypeColor(zone.type)} style={{ fontSize: '10px' }}>
                        {zone.type}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#71717a]">Daily Orders:</span>
                        <span className="font-bold text-[#18181b]">{zone.analytics.dailyOrders}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#71717a]">Revenue:</span>
                        <span className="font-bold text-emerald-600">
                          ₹{(zone.analytics.revenue / 1000).toFixed(0)}K
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#71717a]">Avg Delivery:</span>
                        <span className="font-bold text-[#18181b]">{zone.analytics.avgDeliveryTime}m</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#71717a]">Satisfaction:</span>
                        <div className="flex items-center gap-1">
                          <Star className="text-amber-500" size={12} fill="#f59e0b" />
                          <span className="font-bold text-[#18181b]">{zone.analytics.customerSatisfaction}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="grid grid-cols-2 gap-4">
            {zones
              .filter((z) => z.type !== 'no-service')
              .map((zone) => (
                <div key={zone.id} className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-[#18181b]">{zone.name}</h4>
                      <p className="text-xs text-[#71717a]">{zone.id}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedZone(zone);
                        setShowSettingsModal(true);
                        setSettingsForm({
                          deliveryFee: zone.settings.deliveryFee,
                          minOrderValue: zone.settings.minOrderValue,
                          maxDeliveryRadius: zone.settings.maxDeliveryRadius,
                          estimatedDeliveryTime: zone.settings.estimatedDeliveryTime,
                          surgeMultiplier: zone.settings.surgeMultiplier,
                          maxCapacity: zone.settings.maxCapacity,
                        });
                      }}
                    >
                      <Edit size={14} className="mr-1" /> Edit
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-[#71717a] block mb-1">Delivery Fee</label>
                        <Input
                          type="number"
                          value={zone.settings.deliveryFee}
                          className="h-8 text-sm"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#71717a] block mb-1">Min Order Value</label>
                        <Input
                          type="number"
                          value={zone.settings.minOrderValue}
                          className="h-8 text-sm"
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-[#71717a] block mb-1">Max Radius (km)</label>
                        <Input
                          type="number"
                          value={zone.settings.maxDeliveryRadius}
                          className="h-8 text-sm"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#71717a] block mb-1">Est. Time (min)</label>
                        <Input
                          type="number"
                          value={zone.settings.estimatedDeliveryTime}
                          className="h-8 text-sm"
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-[#71717a] block mb-1">Surge Multiplier</label>
                        <Input
                          type="number"
                          step="0.1"
                          value={zone.settings.surgeMultiplier}
                          className="h-8 text-sm"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#71717a] block mb-1">Max Capacity</label>
                        <Input
                          type="number"
                          value={zone.settings.maxCapacity}
                          className="h-8 text-sm"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Zone Modification History</h3>
              <p className="text-xs text-[#71717a] mt-1">Complete audit trail of zone changes</p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>Performed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-[#71717a]">
                      No zone modification history yet
                    </TableCell>
                  </TableRow>
                ) : history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs">{new Date(item.timestamp).toLocaleString()}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{item.zoneName}</div>
                        <div className="text-xs text-[#71717a]">{item.zoneId}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          item.action === 'created'
                            ? 'border-emerald-500 text-emerald-600'
                            : item.action === 'updated'
                            ? 'border-blue-500 text-blue-600'
                            : item.action === 'activated'
                            ? 'border-purple-500 text-purple-600'
                            : item.action === 'deactivated'
                            ? 'border-amber-500 text-amber-600'
                            : 'border-rose-500 text-rose-600'
                        }
                      >
                        {item.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-md">{item.changes}</TableCell>
                    <TableCell className="text-xs text-[#71717a]">{item.performedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Zone Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Zone</DialogTitle>
            <DialogDescription>Define a new delivery zone with custom boundaries</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#18181b] mb-1 block">Zone Name</label>
              <Input
                placeholder="e.g., Whitefield Tech Park"
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">City</label>
                <Select value={zoneForm.city} onValueChange={(value) => setZoneForm({ ...zoneForm, city: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mumbai">Mumbai</SelectItem>
                    <SelectItem value="Bangalore">Bangalore</SelectItem>
                    <SelectItem value="Delhi">Delhi</SelectItem>
                    <SelectItem value="Kolkata">Kolkata</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">Region</label>
                <Select
                  value={zoneForm.region}
                  onValueChange={(value) => setZoneForm({ ...zoneForm, region: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="North">North</SelectItem>
                    <SelectItem value="South">South</SelectItem>
                    <SelectItem value="East">East</SelectItem>
                    <SelectItem value="West">West</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#18181b] mb-1 block">Zone Type</label>
              <Select value={zoneForm.type} onValueChange={(value: any) => setZoneForm({ ...zoneForm, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Delivery</SelectItem>
                  <SelectItem value="express">Express Zone</SelectItem>
                  <SelectItem value="premium">Premium Zone</SelectItem>
                  <SelectItem value="surge">Surge Zone</SelectItem>
                  <SelectItem value="no-service">No Service Zone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-[#f4f4f5] rounded-lg p-4">
              <p className="text-sm font-medium text-[#18181b] mb-2">Draw Zone Boundaries</p>
              <p className="text-xs text-[#71717a] mb-3">Click on the map to add points and create a polygon boundary</p>
              <div className="flex gap-2 mb-3">
                <Button 
                  size="sm" 
                  variant={isDrawing ? "default" : "outline"}
                  onClick={() => {
                    setIsDrawing(!isDrawing);
                    if (!isDrawing) {
                      toast.info('Drawing mode enabled. Click on the map to add points.');
                    } else {
                      toast.info('Drawing mode disabled.');
                    }
                  }}
                >
                  {isDrawing ? 'Stop Drawing' : 'Start Drawing'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleClearPoints}
                  disabled={drawingPoints.length === 0}
                >
                  Clear Points ({drawingPoints.length})
                </Button>
              </div>
              <div 
                className="bg-gray-200 rounded h-64 flex flex-col items-center justify-center text-sm text-[#71717a] relative overflow-hidden border-2 border-dashed border-gray-400 cursor-crosshair"
                onClick={handleMapClick}
              >
                {drawingPoints.length === 0 ? (
                  <>
                    <Map size={48} className="mb-2 text-gray-500" />
                    <p className="mb-2">Interactive Map Drawing Tool</p>
                    <p className="text-xs mb-4">{isDrawing ? 'Click on the map to add boundary points' : 'Click "Start Drawing" to begin'}</p>
                  </>
                ) : (
                  <>
                    <p className="mb-2 font-bold">{drawingPoints.length} point{drawingPoints.length !== 1 ? 's' : ''} added</p>
                    <p className="text-xs mb-4">{isDrawing ? 'Continue clicking to add more points' : 'Click "Start Drawing" to add more'}</p>
                    {drawingPoints.map((point, idx) => (
                      <div
                        key={idx}
                        className="absolute w-3 h-3 bg-[#e11d48] rounded-full border-2 border-white"
                        style={{
                          left: `${50 + (point.lng - 72.8777) * 1000}%`,
                          top: `${50 + (point.lat - 19.0760) * 1000}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        title={`Point ${idx + 1}: ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`}
                      />
                    ))}
                    {drawingPoints.length >= 3 && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <polygon
                          points={drawingPoints.map((p) => {
                            const x = 50 + (p.lng - 72.8777) * 1000;
                            const y = 50 + (p.lat - 19.0760) * 1000;
                            return `${x}%,${y}%`;
                          }).join(' ')}
                          fill="rgba(225, 29, 72, 0.2)"
                          stroke="#e11d48"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                        />
                      </svg>
                    )}
                  </>
                )}
              </div>
              {drawingPoints.length > 0 && (
                <div className="mt-3 p-2 bg-white rounded text-xs">
                  <p className="font-medium mb-1">Points added:</p>
                  <div className="max-h-20 overflow-y-auto">
                    {drawingPoints.map((point, idx) => (
                      <div key={idx} className="text-[#71717a]">
                        {idx + 1}. {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3 text-xs text-[#71717a]">
                <p>💡 Tip: Add at least 3 points to create a zone. Click "Start Drawing" then click on the map to add points.</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateZone}>Create Zone</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone Details Modal */}
      <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedZone?.name}</DialogTitle>
            <DialogDescription>
              {selectedZone?.city}, {selectedZone?.region} • {selectedZone?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedZone && (
            <div className="space-y-4">
              {/* Zone Map */}
              <div
                className="h-64 rounded-lg flex items-center justify-center relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${selectedZone.color}22 0%, ${selectedZone.color}11 100%)`,
                }}
              >
                <div
                  className="w-48 h-48 rounded-2xl border-4 flex items-center justify-center"
                  style={{
                    borderColor: selectedZone.color,
                    backgroundColor: `${selectedZone.color}30`,
                  }}
                >
                  <div className="text-center">
                    <Map size={48} style={{ color: selectedZone.color }} className="mx-auto mb-2" />
                    <p className="font-bold text-sm" style={{ color: selectedZone.color }}>
                      {selectedZone.name}
                    </p>
                    <Badge className={`mt-2 ${getZoneTypeColor(selectedZone.type)}`}>{selectedZone.type}</Badge>
                  </div>
                </div>
              </div>

              {/* Zone Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#f4f4f5] rounded-lg p-3">
                  <p className="text-xs text-[#71717a] mb-1">Area</p>
                  <p className="text-lg font-bold text-[#18181b]">{selectedZone.analytics.areaSize} km²</p>
                </div>
                <div className="bg-[#f4f4f5] rounded-lg p-3">
                  <p className="text-xs text-[#71717a] mb-1">Active Orders</p>
                  <p className="text-lg font-bold text-amber-600">{selectedZone.analytics.activeOrders}</p>
                </div>
                <div className="bg-[#f4f4f5] rounded-lg p-3">
                  <p className="text-xs text-[#71717a] mb-1">Riders</p>
                  <p className="text-lg font-bold text-blue-600">{selectedZone.analytics.riderCount}</p>
                </div>
                <div className="bg-[#f4f4f5] rounded-lg p-3">
                  <p className="text-xs text-[#71717a] mb-1">Capacity</p>
                  <p className="text-lg font-bold text-emerald-600">{selectedZone.analytics.capacityUsage}%</p>
                </div>
              </div>

              {/* Polygon Coordinates */}
              <div>
                <h4 className="text-sm font-bold text-[#18181b] mb-2">Zone Coordinates</h4>
                <div className="bg-[#f4f4f5] rounded-lg p-3 font-mono text-xs text-[#52525b] max-h-32 overflow-auto">
                  {selectedZone.polygon.map((coord, idx) => (
                    <div key={idx}>
                      Point {idx + 1}: {coord.lat.toFixed(4)}, {coord.lng.toFixed(4)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowMapModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Zone Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Zone - {selectedZone?.name}</DialogTitle>
            <DialogDescription>
              Update zone details and polygon boundary
            </DialogDescription>
          </DialogHeader>

          {selectedZone && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">Zone Name *</label>
                <Input
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#18181b] mb-1 block">City</label>
                  <Input
                    value={zoneForm.city}
                    onChange={(e) => setZoneForm({ ...zoneForm, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#18181b] mb-1 block">Region</label>
                  <Input
                    value={zoneForm.region}
                    onChange={(e) => setZoneForm({ ...zoneForm, region: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">Zone Type</label>
                <Select value={zoneForm.type} onValueChange={(val: any) => setZoneForm({ ...zoneForm, type: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="express">Express</SelectItem>
                    <SelectItem value="no-service">No Service</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="surge">Surge</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-[#f4f4f5] rounded-lg p-4">
                <p className="text-sm font-medium text-[#18181b] mb-2">Edit Zone Boundary (Polygon)</p>
                <p className="text-xs text-[#71717a] mb-3">Click on the map to add points. Changes are saved when you click Update Zone.</p>
                <div className="flex gap-2 mb-3">
                  <Button
                    size="sm"
                    variant={isEditDrawing ? 'default' : 'outline'}
                    onClick={() => {
                      setIsEditDrawing(!isEditDrawing);
                      toast.info(isEditDrawing ? 'Drawing disabled' : 'Click on the map to add or modify polygon points');
                    }}
                  >
                    {isEditDrawing ? 'Stop Drawing' : 'Draw Polygon'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditDrawingPoints([]);
                      toast.info('Boundary points cleared');
                    }}
                    disabled={editDrawingPoints.length === 0}
                  >
                    Clear Points ({editDrawingPoints.length})
                  </Button>
                </div>
                <div
                  className="bg-gray-200 rounded h-48 flex flex-col items-center justify-center text-sm text-[#71717a] relative overflow-hidden border-2 border-dashed border-gray-400 cursor-crosshair"
                  onClick={handleEditMapClick}
                >
                  {editDrawingPoints.length === 0 ? (
                    <><Map size={32} className="mb-1 text-gray-500" /><p>{isEditDrawing ? 'Click to add boundary points' : 'Click "Draw Polygon" to edit boundary'}</p></>
                  ) : (
                    <>
                      <p className="mb-1 font-bold">{editDrawingPoints.length} point{editDrawingPoints.length !== 1 ? 's' : ''}</p>
                      {editDrawingPoints.map((point, idx) => (
                        <div
                          key={idx}
                          className="absolute w-3 h-3 bg-[#e11d48] rounded-full border-2 border-white"
                          style={{
                            left: `${50 + (point.lng - 72.8777) * 1000}%`,
                            top: `${50 + (point.lat - 19.0760) * 1000}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        />
                      ))}
                      {editDrawingPoints.length >= 3 && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                          <polygon
                            points={editDrawingPoints.map((p) => {
                              const x = 50 + (p.lng - 72.8777) * 1000;
                              const y = 50 + (p.lat - 19.0760) * 1000;
                              return `${x}%,${y}%`;
                            }).join(' ')}
                            fill="rgba(225, 29, 72, 0.2)"
                            stroke="#e11d48"
                            strokeWidth="2"
                          />
                        </svg>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!selectedZone || !zoneForm.name.trim()) {
                toast.error('Zone name is required');
                return;
              }
              const polygonToSave = editDrawingPoints.length >= 3 ? editDrawingPoints : selectedZone.polygon;
              if (!polygonToSave || polygonToSave.length < 3) {
                toast.error('Zone must have at least 3 boundary points');
                return;
              }
              try {
                const center = {
                  lat: polygonToSave.reduce((sum, p) => sum + p.lat, 0) / polygonToSave.length,
                  lng: polygonToSave.reduce((sum, p) => sum + p.lng, 0) / polygonToSave.length,
                };
                await updateZone(selectedZone.id, {
                  name: zoneForm.name,
                  city: zoneForm.city,
                  region: zoneForm.region,
                  type: zoneForm.type,
                  polygon: polygonToSave,
                  center,
                });
                toast.success('Zone updated successfully');
                setShowEditModal(false);
                loadData();
              } catch (error) {
                toast.error('Failed to update zone');
              }
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Zone Settings - {selectedZone?.name}</DialogTitle>
            <DialogDescription>
              Update delivery settings and operational parameters for this zone
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">Delivery Fee (₹)</label>
                <Input
                  type="number"
                  value={settingsForm.deliveryFee}
                  onChange={(e) => setSettingsForm({ ...settingsForm, deliveryFee: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">Min Order Value (₹)</label>
                <Input
                  type="number"
                  value={settingsForm.minOrderValue}
                  onChange={(e) => setSettingsForm({ ...settingsForm, minOrderValue: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">Max Delivery Radius (km)</label>
                <Input
                  type="number"
                  value={settingsForm.maxDeliveryRadius}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maxDeliveryRadius: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">Est. Delivery Time (min)</label>
                <Input
                  type="number"
                  value={settingsForm.estimatedDeliveryTime}
                  onChange={(e) => setSettingsForm({ ...settingsForm, estimatedDeliveryTime: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">Surge Multiplier</label>
                <Input
                  type="number"
                  step="0.1"
                  value={settingsForm.surgeMultiplier}
                  onChange={(e) => setSettingsForm({ ...settingsForm, surgeMultiplier: parseFloat(e.target.value) || 1.0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#18181b] mb-1 block">Max Capacity</label>
                <Input
                  type="number"
                  value={settingsForm.maxCapacity}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maxCapacity: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!selectedZone) return;
              try {
                await updateZone(selectedZone.id, {
                  settings: {
                    ...selectedZone.settings,
                    deliveryFee: settingsForm.deliveryFee,
                    minOrderValue: settingsForm.minOrderValue,
                    maxDeliveryRadius: settingsForm.maxDeliveryRadius,
                    estimatedDeliveryTime: settingsForm.estimatedDeliveryTime,
                    surgeMultiplier: settingsForm.surgeMultiplier,
                    maxCapacity: settingsForm.maxCapacity,
                  },
                });
                toast.success('Zone settings updated successfully');
                setShowSettingsModal(false);
                loadData();
              } catch (error) {
                toast.error('Failed to update zone settings');
              }
            }}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
