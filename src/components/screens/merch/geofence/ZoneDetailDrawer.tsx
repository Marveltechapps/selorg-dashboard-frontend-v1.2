import React, { useState, useEffect } from 'react';
import { Zone, ZoneType } from './types';
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
import { Edit, Archive, Map, Save, X } from 'lucide-react';

interface ZoneDetailDrawerProps {
  zone: Zone | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (zone: Zone) => void;
  onUpdate?: (zoneId: string, updates: Partial<Zone>) => void;
  onArchive: (zone: Zone) => void;
  isEditMode?: boolean;
  onEditModeChange?: (mode: boolean) => void;
}

export function ZoneDetailDrawer({ 
  zone, 
  isOpen, 
  onClose, 
  onEdit, 
  onUpdate,
  onArchive,
  isEditMode = false,
  onEditModeChange
}: ZoneDetailDrawerProps) {
  const [editData, setEditData] = useState<Partial<Zone>>({});

  useEffect(() => {
    if (zone) {
      setEditData({
        name: zone.name,
        type: zone.type,
        color: zone.color,
        status: zone.status,
        description: zone.description
      });
    }
  }, [zone, isEditMode]);

  if (!zone) return null;

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(zone.id, editData);
    }
    if (onEditModeChange) {
      onEditModeChange(false);
    }
  };

  const handleCancel = () => {
    if (zone) {
      setEditData({
        name: zone.name,
        type: zone.type,
        color: zone.color,
        status: zone.status,
        description: zone.description
      });
    }
    if (onEditModeChange) {
      onEditModeChange(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-3">
             <div className="w-4 h-4 rounded-full" style={{ backgroundColor: zone.color }} />
             <SheetTitle className="text-xl">{zone.name}</SheetTitle>
             <Badge variant={zone.status === 'Active' ? 'default' : 'secondary'}>{zone.status}</Badge>
          </div>
          <SheetDescription>{zone.description}</SheetDescription>
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
                  <Label>Zone Name</Label>
                  <Input 
                    value={editData.name || ''} 
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zone Type</Label>
                  <Select 
                    value={editData.type} 
                    onValueChange={(val) => setEditData({...editData, type: val as ZoneType})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Serviceable">Serviceable Area</SelectItem>
                      <SelectItem value="Exclusion">Exclusion Zone</SelectItem>
                      <SelectItem value="Priority">Priority Delivery</SelectItem>
                      <SelectItem value="Promo-Only">Promo Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={editData.status} 
                    onValueChange={(val) => setEditData({...editData, status: val as 'Active' | 'Inactive'})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map(color => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${editData.color === color ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setEditData({...editData, color})}
                      />
                    ))}
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
                    <p className="font-medium">{zone.areaSqKm} sq km</p>
                </div>
                 <div>
                    <label className="text-sm font-medium text-gray-500">Stores Covered</label>
                    <p className="font-medium">{zone.storesCovered || 0}</p>
                </div>
            </div>
            )}

             <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h4 className="font-semibold mb-2">Configuration</h4>
                <div className="text-sm space-y-2">
                    <p><span className="text-gray-500">Pricing Tier:</span> Standard</p>
                    <p><span className="text-gray-500">Delivery SLA:</span> 30-45 mins</p>
                    <p><span className="text-gray-500">Min Order:</span> ₹15.00</p>
                </div>
            </div>
          </TabsContent>
          
          <TabsContent value="boundaries" className="mt-4">
             <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 mb-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Map size={16} /> Polygon Data
                </h4>
                <p className="text-xs font-mono text-gray-500 break-all">
                    {JSON.stringify(zone.points)}
                </p>
            </div>
             <p className="text-sm text-gray-500">
                This zone is defined by {zone.points.length} vertices. It was last updated 2 days ago.
            </p>
          </TabsContent>

          <TabsContent value="promos" className="mt-4">
            <div className="space-y-3">
                 <div className="p-3 border rounded-lg">
                    <div className="flex justify-between">
                        <span className="font-medium text-green-600">Summer Sale</span>
                        <Badge variant="outline">Active</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Free delivery for orders over ₹30</p>
                 </div>
                 <div className="p-3 border rounded-lg opacity-60">
                    <div className="flex justify-between">
                        <span className="font-medium">Winter Blast</span>
                        <Badge variant="secondary">Expired</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">10% off all hot drinks</p>
                 </div>
            </div>
          </TabsContent>
          
          <TabsContent value="perf" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium">Monthly Orders</p>
                      <p className="text-2xl font-bold">1,245</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-600 font-medium">Revenue</p>
                      <p className="text-2xl font-bold">₹45.2k</p>
                  </div>
                   <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-600 font-medium">Promo Redemptions</p>
                      <p className="text-2xl font-bold">312</p>
                  </div>
                   <div className="p-3 bg-orange-50 rounded-lg">
                      <p className="text-xs text-orange-600 font-medium">Avg Delivery</p>
                      <p className="text-2xl font-bold">28m</p>
                  </div>
              </div>
          </TabsContent>
        </Tabs>

        <SheetFooter className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t mt-auto flex-col gap-3 sm:flex-row sm:justify-between">
          {isEditMode ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="destructive" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => onArchive(zone)}>
                <Archive className="mr-2 h-4 w-4" /> Archive Zone
              </Button>
              <Button onClick={() => onEdit(zone)}>
                <Edit className="mr-2 h-4 w-4" /> Edit Zone
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
