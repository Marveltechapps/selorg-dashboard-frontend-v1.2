import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Button } from "../../../ui/button";
import { Zone, Store, KPIStats } from './types';
import { ZoneControls } from './ZoneControls';
import { GeofenceMap } from './GeofenceMap';
import { KPICards } from './KPICards';
import { ZoneDetailDrawer } from './ZoneDetailDrawer';
import { AddZoneWizard } from './AddZoneWizard';
import { ActiveZonesModal, StoreCoverageModal } from './GeofenceModals';
import { geofenceApi, HeatmapMetric, PromoHeatmapRow } from './geofenceApi';
import { mapZoneFromApi, mapStoreFromApi, buildCreateZonePayload, buildUpdateZonePayload } from './geofenceUtils';
import { toast } from 'sonner';
import { HeatmapDetailsDrawer } from './HeatmapDetailsDrawer';
import { ZonesManagementPanel } from './ZonesManagementPanel';

const EMPTY_KPI_STATS: KPIStats = {
  totalZones: 0,
  activeZones: 0,
  inactiveZones: 0,
  totalArea: 0,
  storesFullyCovered: 0,
  storesPartial: 0,
  storesNone: 0,
  storesTotal: 0,
  topPromoZone: '—',
  topPromoMetric: 'redemptions',
  topPromoValue: 0,
  heatmapDays: 30,
};

export function GeofenceTargeting({ searchQuery = "" }: { searchQuery?: string }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [mapFocusedZoneId, setMapFocusedZoneId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isZoneListOpen, setIsZoneListOpen] = useState(false);
  const [isStoreCoverageOpen, setIsStoreCoverageOpen] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isHeatmapDrawerOpen, setIsHeatmapDrawerOpen] = useState(false);
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('revenue');
  const [heatmapRows, setHeatmapRows] = useState<PromoHeatmapRow[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [kpiStats, setKpiStats] = useState<KPIStats>(EMPTY_KPI_STATS);
  const [kpiLoading, setKpiLoading] = useState(false);

  const refreshKpis = useCallback(async () => {
    try {
      setKpiLoading(true);
      const stats = await geofenceApi.getStats(30);
      setKpiStats({
        totalZones: stats.totalZones ?? 0,
        activeZones: stats.activeZones ?? 0,
        inactiveZones: stats.inactiveZones ?? 0,
        totalArea: stats.totalArea ?? 0,
        storesFullyCovered: stats.storesFullyCovered ?? 0,
        storesPartial: stats.storesPartial ?? 0,
        storesNone: stats.storesNone ?? 0,
        storesTotal: stats.storesTotal ?? 0,
        topPromoZone: stats.topPromoZone ?? '—',
        topPromoMetric: stats.topPromoMetric ?? 'redemptions',
        topPromoValue: stats.topPromoValue ?? 0,
        heatmapDays: stats.heatmapDays ?? 30,
      });
    } catch {
      setKpiStats(EMPTY_KPI_STATS);
    } finally {
      setKpiLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [zonesRes, storesRes] = await Promise.all([
        geofenceApi.getZones(),
        geofenceApi.getStores(),
        refreshKpis(),
      ]);
      const zonesList = Array.isArray(zonesRes) ? zonesRes : (zonesRes as { data?: unknown[] })?.data ?? [];
      const storesList = Array.isArray(storesRes) ? storesRes : (storesRes as { data?: unknown[] })?.data ?? [];
      setZones(zonesList.map((z: Record<string, unknown>) => mapZoneFromApi(z)));
      setStores(storesList.map((s: Record<string, unknown>) => mapStoreFromApi(s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load geofence data');
      setZones([]);
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [refreshKpis]);

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
      void refreshKpis();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update visibility');
    }
  };

  const focusZoneOnMap = useCallback((zone: Zone) => {
    setMapFocusedZoneId(zone.id);
  }, []);

  const handleZoneClick = (zone: Zone) => {
    focusZoneOnMap(zone);
    setSelectedZone(zone);
    setIsDrawerOpen(true);
  };

  const handleZoneListSelect = (zone: Zone) => {
    focusZoneOnMap(zone);
  };

  const handleStoreClick = (store: Store) => {
    toast.info(`Store: ${store.name}`);
  };

  const handleAddZone = async (
    newZone: Zone & {
      polygon?: { lat: number; lng: number }[];
      settings?: Zone['settings'];
      linkedStoreIds?: string[];
    },
  ) => {
    try {
      if (!newZone.name?.trim()) {
        toast.error('Zone name is required');
        return;
      }
      if (!newZone.polygon || newZone.polygon.length < 3) {
        toast.error('Draw a polygon with at least 3 points');
        return;
      }
      const payload = buildCreateZonePayload({
        name: newZone.name.trim(),
        type: newZone.type,
        status: newZone.status,
        color: newZone.color,
        isVisible: newZone.isVisible,
        polygon: newZone.polygon,
        areaSqKm: newZone.areaSqKm,
        city: 'Mumbai',
        region: 'West',
        settings: newZone.settings,
      });
      const created = await geofenceApi.createZone(payload);
      const mapped = mapZoneFromApi(created);

      const storeIds = newZone.linkedStoreIds ?? [];
      if (storeIds.length > 0) {
        await Promise.all(
          storeIds.map(async (storeId) => {
            const store = stores.find((s) => s.id === storeId);
            if (!store) return;
            const zones = [...new Set([...store.zones, mapped.name])];
            await geofenceApi.updateStore(storeId, { zones, serviceStatus: 'Full' });
          }),
        );
        const storesRes = await geofenceApi.getStores();
        const storesList = Array.isArray(storesRes) ? storesRes : (storesRes as { data?: unknown[] })?.data ?? [];
        setStores(storesList.map((s: Record<string, unknown>) => mapStoreFromApi(s)));
      }

      setZones((prev) => [mapped, ...prev]);
      setSelectedZone(mapped);
      setIsDrawerOpen(true);
      setIsWizardOpen(false);
      void refreshKpis();
      toast.success('Zone created');
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
      const payload = buildUpdateZonePayload(updates as Record<string, unknown>);
      const updated = await geofenceApi.updateZone(zoneId, payload);
      const mapped = mapZoneFromApi(updated);
      setZones(prev => prev.map(z => z.id === zoneId ? mapped : z));
      setSelectedZone(mapped);
      void refreshKpis();
      toast.success('Zone Updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update zone');
    }
  };

  const handleDeleteZone = async (zone: Zone) => {
    try {
      await geofenceApi.deleteZone(zone.id);
      setZones((prev) => prev.filter((z) => z.id !== zone.id));
      if (selectedZone?.id === zone.id) {
        setIsDrawerOpen(false);
        setSelectedZone(null);
      }
      if (mapFocusedZoneId === zone.id) {
        setMapFocusedZoneId(null);
      }
      void refreshKpis();
      toast.success('Zone deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete zone');
    }
  };

  const handleDuplicateZone = async (zone: Zone) => {
    if (!zone.polygon || zone.polygon.length < 3) {
      toast.error('Zone has no boundary to duplicate');
      return;
    }
    try {
      const payload = buildCreateZonePayload({
        name: `${zone.name} (Copy)`,
        type: zone.type,
        status: zone.status,
        color: zone.color,
        isVisible: true,
        polygon: zone.polygon,
        areaSqKm: zone.areaSqKm,
        city: 'Mumbai',
        region: 'West',
        settings: zone.settings,
      });
      const created = await geofenceApi.createZone(payload);
      const mapped = mapZoneFromApi(created);
      setZones((prev) => [mapped, ...prev]);
      setSelectedZone(mapped);
      setIsDrawerOpen(true);
      void refreshKpis();
      toast.success('Zone duplicated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to duplicate zone');
    }
  };

  const handleToggleStatus = async (zone: Zone) => {
    const next = zone.status === 'Active' ? 'inactive' : 'active';
    try {
      const updated = await geofenceApi.toggleZoneStatus(zone.id, next);
      const mapped = mapZoneFromApi(updated);
      setZones((prev) => prev.map((z) => (z.id === zone.id ? mapped : z)));
      if (selectedZone?.id === zone.id) setSelectedZone(mapped);
      void refreshKpis();
      toast.success(next === 'active' ? 'Zone activated' : 'Zone deactivated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const refreshHeatmap = useCallback(async () => {
    try {
      const data = await geofenceApi.getPromoHeatmap(30);
      setHeatmapRows(data.rows ?? []);
      void refreshKpis();
    } catch {
      setHeatmapRows([]);
    }
  }, [refreshKpis]);

  const handleHeatmapZoneFocus = (zoneId: string) => {
    const zone = zones.find((z) => z.id === zoneId);
    if (zone) focusZoneOnMap(zone);
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
    <div className="flex flex-col gap-4">
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
          <Button onClick={() => setIsWizardOpen(true)} className="bg-[#212121] hover:bg-black">
            <MapPin className="mr-2 h-4 w-4" /> Add zone
          </Button>
        </div>
      </div>

      <div className="shrink-0">
        <KPICards
          stats={kpiStats}
          loading={kpiLoading}
          onViewActiveZones={() => setIsZoneListOpen(true)}
          onViewStoresCovered={() => setIsStoreCoverageOpen(true)}
          onViewHeatmap={() => {
            setShowHeatmap(true);
            setIsHeatmapDrawerOpen(true);
            void refreshHeatmap();
          }}
        />
      </div>

      <div
        className="h-96 shrink-0 bg-white rounded-xl border border-[#E0E0E0] shadow-sm relative overflow-hidden"
        style={{ minHeight: 320 }}
        aria-label="Geofence map"
      >
        <div className="absolute inset-0">
          <GeofenceMap
            className="h-full w-full"
            zones={filteredZones}
            stores={filteredStores}
            onZoneClick={handleZoneClick}
            onStoreClick={handleStoreClick}
            showHeatmap={showHeatmap}
            heatmapRows={heatmapRows}
            heatmapMetric={heatmapMetric}
            focusedZoneId={mapFocusedZoneId}
          />
          <ZoneControls
            zones={filteredZones}
            onToggleVisibility={handleToggleVisibility}
            onZoneClick={handleZoneClick}
            onEditZone={handleEditZone}
            onArchiveZone={handleDeleteZone}
          />
        </div>
      </div>

      <ZonesManagementPanel
        zones={filteredZones}
        selectedZoneId={mapFocusedZoneId}
        onEditZone={handleEditZone}
        onSelectZone={handleZoneListSelect}
        onViewZone={handleZoneClick}
        onDeleteZone={handleDeleteZone}
        onDuplicateZone={handleDuplicateZone}
        onToggleVisibility={handleToggleVisibility}
        onToggleStatus={handleToggleStatus}
      />

      <ZoneDetailDrawer
        zone={selectedZone}
        isOpen={isDrawerOpen}
        onClose={() => { setIsDrawerOpen(false); setIsEditMode(false); }}
        onEdit={handleEditZone}
        onUpdate={handleUpdateZone}
        onArchive={handleDeleteZone}
        onDuplicate={handleDuplicateZone}
        onToggleStatus={handleToggleStatus}
        allZones={zones}
        stores={stores}
        isEditMode={isEditMode}
        onEditModeChange={setIsEditMode}
      />

      <HeatmapDetailsDrawer
        isOpen={isHeatmapDrawerOpen}
        onClose={() => { setIsHeatmapDrawerOpen(false); setShowHeatmap(false); }}
        onMetricChange={setHeatmapMetric}
        onZoneFocus={handleHeatmapZoneFocus}
        onDataLoaded={setHeatmapRows}
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
        onViewOnMap={(zone) => {
          setIsZoneListOpen(false);
          focusZoneOnMap(zone);
        }}
        onArchiveZone={handleDeleteZone}
        onDuplicateZone={handleDuplicateZone}
        onCreateZone={() => { setIsZoneListOpen(false); setIsWizardOpen(true); }}
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
        onStoresUpdated={async () => {
          await loadData();
          void refreshKpis();
        }}
      />
    </div>
  );
}
