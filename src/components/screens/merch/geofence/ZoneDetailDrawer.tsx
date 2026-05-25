import React, { useState, useEffect } from 'react';
import { Zone, ZoneType, Store } from './types';
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "../../../ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/tabs";
import { Badge } from "../../../ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../ui/alert-dialog";
import { Edit, Archive, Map, Save, X, Copy, Power } from 'lucide-react';
import { GeofenceMap } from './GeofenceMap';
import { polygonAreaSqKm, cleanPolygon } from './geofenceUtils';

interface ZoneDetailDrawerProps {
  zone: Zone | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (zone: Zone) => void;
  onUpdate?: (zoneId: string, updates: Partial<Zone>) => void;
  onArchive: (zone: Zone) => void;
  onDuplicate?: (zone: Zone) => void;
  onToggleStatus?: (zone: Zone) => void;
  isEditMode?: boolean;
  onEditModeChange?: (mode: boolean) => void;
  allZones?: Zone[];
  stores?: Store[];
}

export function ZoneDetailDrawer({
  zone,
  isOpen,
  onClose,
  onEdit,
  onUpdate,
  onArchive,
  onDuplicate,
  onToggleStatus,
  isEditMode = false,
  onEditModeChange,
  allZones = [],
  stores = [],
}: ZoneDetailDrawerProps) {
  const [editData, setEditData] = useState<Partial<Zone>>({});
  const [editPolygon, setEditPolygon] = useState<{ lat: number; lng: number }[]>([]);
  const [isRedrawing, setIsRedrawing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (zone) {
      setEditData({
        name: zone.name,
        type: zone.type,
        color: zone.color,
        status: zone.status,
        description: zone.description,
        settings: { ...zone.settings },
      });
      setEditPolygon(cleanPolygon(zone.polygon ?? []));
      setIsRedrawing(false);
    }
  }, [zone, isEditMode, isOpen]);

  if (!zone) return null;

  const analytics = zone.analytics ?? {};
  const settings = isEditMode ? (editData.settings ?? zone.settings ?? {}) : (zone.settings ?? {});
  const polygon = isEditMode ? editPolygon : (zone.polygon ?? []);
  const otherZones = allZones.filter((z) => z.id !== zone.id);

  const handleSave = () => {
    if (!onUpdate) return;
    if (!editData.name?.trim()) return;
    const updates: Partial<Zone> = { ...editData, name: editData.name.trim() };
    if (editPolygon.length >= 3) {
      updates.polygon = editPolygon;
      updates.areaSqKm = polygonAreaSqKm(editPolygon);
    }
    onUpdate(zone.id, updates);
    onEditModeChange?.(false);
    setIsRedrawing(false);
  };

  const handleCancel = () => {
    if (zone) {
      setEditData({
        name: zone.name,
        type: zone.type,
        color: zone.color,
        status: zone.status,
        description: zone.description,
        settings: { ...zone.settings },
      });
      setEditPolygon(cleanPolygon(zone.polygon ?? []));
    }
    onEditModeChange?.(false);
    setIsRedrawing(false);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (!isEditMode || !isRedrawing) return;
    setEditPolygon((prev) => [...prev, { lat, lng }]);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto px-6 pb-28">
          <SheetHeader className="mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: isEditMode ? editData.color : zone.color }} />
              <SheetTitle className="text-xl">{isEditMode ? editData.name : zone.name}</SheetTitle>
              <Badge variant={(isEditMode ? editData.status : zone.status) === 'Active' ? 'default' : 'secondary'}>
                {isEditMode ? editData.status : zone.status}
              </Badge>
            </div>
            <SheetDescription>{zone.description || 'Service area boundary and delivery rules'}</SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="boundaries">Boundaries</TabsTrigger>
              <TabsTrigger value="promos">Promos</TabsTrigger>
              <TabsTrigger value="perf">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {isEditMode ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Zone name</Label>
                    <Input
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Zone type</Label>
                    <Select
                      value={editData.type}
                      onValueChange={(val) => setEditData({ ...editData, type: val as ZoneType })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Serviceable">Serviceable area</SelectItem>
                        <SelectItem value="Exclusion">Exclusion zone</SelectItem>
                        <SelectItem value="Priority">Priority delivery</SelectItem>
                        <SelectItem value="Promo-Only">Promo only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editData.status}
                      onValueChange={(val) => setEditData({ ...editData, status: val as 'Active' | 'Inactive' })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-2">
                      {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${editData.color === color ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setEditData({ ...editData, color })}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div className="space-y-2">
                      <Label>Delivery fee (₹)</Label>
                      <Input
                        type="number"
                        value={settings.deliveryFee ?? 39}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            settings: { ...settings, deliveryFee: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Min order (₹)</Label>
                      <Input
                        type="number"
                        value={settings.minOrderValue ?? 149}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            settings: { ...settings, minOrderValue: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Est. delivery (min)</Label>
                      <Input
                        type="number"
                        value={settings.estimatedDeliveryTime ?? 30}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            settings: { ...settings, estimatedDeliveryTime: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Surge multiplier</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settings.surgeMultiplier ?? 1}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            settings: { ...settings, surgeMultiplier: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Type</label>
                    <p className="font-medium">{zone.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Area</label>
                    <p className="font-medium">{zone.areaSqKm} km²</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Stores covered</label>
                    <p className="font-medium">{zone.storesCovered || 0}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Vertices</label>
                    <p className="font-medium">{polygon.length || zone.points.length}</p>
                  </div>
                </div>
              )}

              {!isEditMode && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <h4 className="font-semibold mb-2">Configuration</h4>
                  <div className="text-sm space-y-2">
                    <p><span className="text-gray-500">Delivery fee:</span> ₹{settings.deliveryFee ?? 39}</p>
                    <p><span className="text-gray-500">Est. delivery:</span> {settings.estimatedDeliveryTime ?? 30} mins</p>
                    <p><span className="text-gray-500">Min order:</span> ₹{settings.minOrderValue ?? 149}</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="boundaries" className="mt-4 space-y-3">
              {isEditMode && (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant={isRedrawing ? 'default' : 'outline'}
                    onClick={() => {
                      setIsRedrawing(true);
                      setEditPolygon([]);
                    }}
                  >
                    Redraw boundary
                  </Button>
                  {isRedrawing && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditPolygon(cleanPolygon(zone.polygon ?? []));
                        setIsRedrawing(false);
                      }}
                    >
                      Cancel redraw
                    </Button>
                  )}
                  {isRedrawing && editPolygon.length > 0 && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditPolygon((p) => p.slice(0, -1))}>
                      Undo point
                    </Button>
                  )}
                </div>
              )}
              {isEditMode && isRedrawing ? (
                <div className="h-48 border rounded-lg overflow-hidden">
                  <GeofenceMap
                    zones={otherZones}
                    stores={stores}
                    onZoneClick={() => {}}
                    onStoreClick={() => {}}
                    isDrawing
                    drawingPolygon={editPolygon}
                    onMapClick={handleMapClick}
                  />
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Map size={16} /> Polygon
                  </h4>
                  <p className="text-xs font-mono text-gray-500 break-all max-h-32 overflow-auto">
                    {JSON.stringify(polygon.length ? polygon : zone.points)}
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-500">
                {polygon.length} vertices
                {isEditMode && isRedrawing && editPolygon.length < 3 && ' — click the map to add at least 3 points'}
              </p>
            </TabsContent>

            <TabsContent value="promos" className="mt-4">
              <div className="space-y-3">
                {zone.type === 'Promo-Only' || zone.type === 'Priority' ? (
                  <div className="p-3 border rounded-lg">
                    <div className="flex justify-between">
                      <span className="font-medium text-green-600">{zone.name} campaigns</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Surge: {settings.surgeMultiplier ?? 1}x • Capacity {analytics.capacityUsage ?? 0}%
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No promo-only rules for this zone type.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="perf" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium">Daily orders</p>
                  <p className="text-2xl font-bold">{analytics.dailyOrders ?? 0}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600 font-medium">Revenue</p>
                  <p className="text-2xl font-bold">₹{Number(analytics.revenue ?? 0).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600 font-medium">Active orders</p>
                  <p className="text-2xl font-bold">{analytics.activeOrders ?? 0}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-orange-600 font-medium">Avg delivery</p>
                  <p className="text-2xl font-bold">{analytics.avgDeliveryTime ?? 0}m</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <SheetFooter className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t flex-col gap-2 sm:flex-row sm:justify-between">
            {isEditMode ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!editData.name?.trim() || (isRedrawing && editPolygon.length > 0 && editPolygon.length < 3)}
                >
                  <Save className="mr-2 h-4 w-4" /> Save changes
                </Button>
              </>
            ) : (
              <>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Archive className="mr-2 h-4 w-4" /> Delete
                  </Button>
                  {onToggleStatus && (
                    <Button variant="outline" onClick={() => onToggleStatus(zone)}>
                      <Power className="mr-2 h-4 w-4" />
                      {zone.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                  {onDuplicate && (
                    <Button variant="outline" onClick={() => onDuplicate(zone)}>
                      <Copy className="mr-2 h-4 w-4" /> Duplicate
                    </Button>
                  )}
                  <Button onClick={() => onEdit(zone)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </div>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete zone?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>{zone.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                onArchive(zone);
                setConfirmDelete(false);
                onClose();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
