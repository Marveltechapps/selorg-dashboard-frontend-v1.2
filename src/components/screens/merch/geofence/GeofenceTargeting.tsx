import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Button } from "../../../ui/button";
import { Zone, Store } from './types';
import { ZoneControls } from './ZoneControls';
import { MapArea } from './MapArea';
import { KPICards } from './KPICards';
import { ZoneDetailDrawer } from './ZoneDetailDrawer';
import { AddZoneWizard } from './AddZoneWizard';
import { ActiveZonesModal, StoreCoverageModal } from './GeofenceModals';
import { Switch } from "../../../ui/switch";
import { Label } from "../../../ui/label";
import { geofenceApi } from './geofenceApi';
import { mapZoneFromApi, mapStoreFromApi, pointsToPolygon } from './geofenceUtils';
import { toast } from 'sonner';
import { HeatmapDetailsDrawer } from './HeatmapDetailsDrawer';

export function GeofenceTargeting({ searchQuery = "" }: { searchQuery?: string }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isZoneListOpen, setIsZoneListOpen] = useState(false);
  const [isStoreCoverageOpen, setIsStoreCoverageOpen] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isHeatmapDrawerOpen, setIsHeatmapDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [zonesRes, storesRes] = await Promise.all([
        geofenceApi.getZones(),
        geofenceApi.getStores(),
      ]);
      const zonesList = Array.isArray(zonesRes) ? zonesRes : (zonesRes as any)?.data ?? [];
      const storesList = Array.isArray(storesRes) ? storesRes : (storesRes as any)?.data ?? [];
      setZones(zonesList.map((z: any) => mapZoneFromApi(z)));
      setStores(storesList.map((s: any) => mapStoreFromApi(s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load geofence data');
      setZones([]);
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredZones = useMemo(() => {
    if (!searchQuery) return zones;
    return zones.filter(z => z.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [zones, searchQuery]);

  const filteredStores = useMemo(() => {
    if (!searchQuery) return stores;
    return stores.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.address || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stores, searchQuery]);

  const handleToggleVisibility = async (id: string) => {
    const zone = zones.find(z => z.id === id);
    if (!zone) return;
    try {
      const updated = await geofenceApi.updateZone(id, { isVisible: !zone.isVisible });
      setZones(prev => prev.map(z => z.id === id ? mapZoneFromApi(updated) : z));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update visibility');
    }
  };

  const handleZoneClick = (zone: Zone) => {
    setSelectedZone(zone);
    setIsDrawerOpen(true);
  };

  const handleStoreClick = (store: Store) => {
    toast.info(`Store: ${store.name}`);
  };

  const handleAddZone = async (newZone: Zone) => {
    try {
      const polygon = (newZone as any).points?.length >= 3
        ? pointsToPolygon((newZone as any).points)
        : (newZone as any).polygon ?? [];
      const payload: Record<string, unknown> = {
        name: newZone.name,
        type: (newZone as any).type === 'Serviceable' ? 'standard' : (newZone as any).type === 'Exclusion' ? 'no-service' : 'standard',
        status: newZone.status === 'Active' ? 'active' : 'inactive',
        color: newZone.color,
        isVisible: newZone.isVisible,
        areaSqKm: (newZone as any).areaSqKm,
        city: 'Mumbai',
        region: 'West',
      };
      if (polygon.length >= 3) payload.polygon = polygon;
      const created = await geofenceApi.createZone(payload);
      const mapped = mapZoneFromApi(created);
      setZones(prev => [mapped, ...prev]);
      setSelectedZone(mapped);
      setIsDrawerOpen(true);
      setIsWizardOpen(false);
      toast.success('Zone Created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create zone');
    }
  };

  const handleEditZone = (zone: Zone) => {
    setSelectedZone(zone);
    setIsEditMode(true);
    setIsDrawerOpen(true);
  };

  const handleUpdateZone = async (zoneId: string, updates: Partial<Zone>) => {
    try {
      const payload: Record<string, unknown> = {};
      if (updates.name != null) payload.name = updates.name;
      if (updates.type != null) payload.type = updates.type === 'Serviceable' ? 'standard' : updates.type === 'Exclusion' ? 'no-service' : updates.type;
      if (updates.status != null) payload.status = updates.status === 'Active' ? 'active' : 'inactive';
      if (updates.color != null) payload.color = updates.color;
      if (updates.isVisible != null) payload.isVisible = updates.isVisible;
      if (updates.areaSqKm != null) payload.areaSqKm = updates.areaSqKm;
      if ((updates as any).polygon?.length >= 3) payload.polygon = (updates as any).polygon;
      const updated = await geofenceApi.updateZone(zoneId, payload);
      const mapped = mapZoneFromApi(updated);
      setZones(prev => prev.map(z => z.id === zoneId ? mapped : z));
      setSelectedZone(mapped);
      toast.success('Zone Updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update zone');
    }
  };

  const handleArchiveZone = async (zone: Zone) => {
    if (!confirm(`Are you sure you want to archive ${zone.name}?`)) return;
    try {
      await geofenceApi.deleteZone(zone.id);
      setZones(prev => prev.filter(z => z.id !== zone.id));
      setIsDrawerOpen(false);
      setSelectedZone(null);
      toast.success('Zone Archived');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive zone');
    }
  };

  const handleHeatmapToggle = () => {
    const newState = !showHeatmap;
    setShowHeatmap(newState);
    if (newState) setIsHeatmapDrawerOpen(true);
  };

  const handleSeedData = async () => {
    try {
      await geofenceApi.seedData();
      await loadData();
      toast.success('Data seeded successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to seed data');
    }
  };

  const kpiStats = {
    activeZones: zones.filter(z => z.status === 'Active' || (z as any).status === 'active').length,
    totalArea: zones.reduce((acc, z) => acc + (z.areaSqKm || 0), 0),
    storesFullyCovered: stores.filter(s => s.serviceStatus === 'Full').length,
    storesTotal: stores.length,
    topPromoZone: zones[0]?.name ?? '—'
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 text-[#7C3AED] animate-spin" />
        <p className="text-gray-500 font-medium">Loading Geofence Services...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-red-600">{error}</p>
        <Button variant="outline" onClick={loadData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Geofence & Targeting</h1>
          <p className="text-[#757575] text-sm">Manage serviceable areas, exclusion zones, and location-based promotions</p>
        </div>
        <div className="flex items-center gap-4">
          {zones.length === 0 && (
            <Button variant="outline" onClick={handleSeedData} className="text-xs h-9">
              Seed Data
            </Button>
          )}
          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
            <Switch id="heatmap-mode" checked={showHeatmap} onCheckedChange={handleHeatmapToggle} />
            <Label htmlFor="heatmap-mode" className="text-sm font-medium">Promo Heatmap</Label>
          </div>
          <Button onClick={() => setIsWizardOpen(true)} className="bg-[#212121] hover:bg-black">
            <MapPin className="mr-2 h-4 w-4" /> Add Zone
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-xl border border-[#E0E0E0] shadow-sm relative overflow-hidden flex flex-col">
        <div className="flex-1 relative">
          <MapArea
            zones={filteredZones}
            stores={filteredStores}
            onZoneClick={handleZoneClick}
            onStoreClick={handleStoreClick}
            showHeatmap={showHeatmap}
          />
          <ZoneControls
            zones={filteredZones}
            onToggleVisibility={handleToggleVisibility}
            onZoneClick={handleZoneClick}
            onEditZone={handleEditZone}
            onArchiveZone={handleArchiveZone}
          />
        </div>
      </div>

      <div className="shrink-0">
        <KPICards
          stats={kpiStats}
          onViewActiveZones={() => setIsZoneListOpen(true)}
          onViewStoresCovered={() => setIsStoreCoverageOpen(true)}
          onViewHeatmap={() => { setShowHeatmap(true); setIsHeatmapDrawerOpen(true); }}
        />
      </div>

      <ZoneDetailDrawer
        zone={selectedZone}
        isOpen={isDrawerOpen}
        onClose={() => { setIsDrawerOpen(false); setIsEditMode(false); }}
        onEdit={handleEditZone}
        onUpdate={handleUpdateZone}
        onArchive={handleArchiveZone}
        isEditMode={isEditMode}
        onEditModeChange={setIsEditMode}
      />

      <HeatmapDetailsDrawer
        isOpen={isHeatmapDrawerOpen}
        onClose={() => { setIsHeatmapDrawerOpen(false); setShowHeatmap(false); }}
        zones={zones}
      />

      <AddZoneWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSave={handleAddZone}
        existingZones={zones}
        stores={stores}
      />

      <ActiveZonesModal
        isOpen={isZoneListOpen}
        onClose={() => setIsZoneListOpen(false)}
        zones={zones}
        onEditZone={handleEditZone}
        onViewOnMap={(zone) => { setIsZoneListOpen(false); handleZoneClick(zone); }}
        onArchiveZone={handleArchiveZone}
      />

      <StoreCoverageModal
        isOpen={isStoreCoverageOpen}
        onClose={() => setIsStoreCoverageOpen(false)}
        stores={stores}
        zones={zones}
        onViewTargeting={(store) => {
          toast.info(`Viewing targeting for ${store.name}`, {
            description: `Zones: ${(store.zones ?? []).join(', ') || 'None assigned'}`
          });
        }}
        onStoresUpdated={loadData}
      />
    </div>
  );
}
