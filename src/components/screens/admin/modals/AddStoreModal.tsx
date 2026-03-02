import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Store, City, Zone, Manager, createStore, updateStore, createWarehouse, Warehouse, fetchCities, fetchZones, fetchManagers } from '../storeWarehouseApi';
import { toast } from 'sonner';
import { Store as StoreIcon, MapPin, Clock, Users } from 'lucide-react';

interface AddStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editStore?: Store | null;
  storeType?: 'store' | 'warehouse';
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function AddStoreModal({ open, onOpenChange, onSuccess, editStore, storeType = 'store' }: AddStoreModalProps) {
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: (storeType === 'warehouse' ? 'warehouse' : 'store') as 'store' | 'dark_store' | 'warehouse',
    address: '',
    cityId: '',
    zoneId: '',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '',
    latitude: '',
    longitude: '',
    phone: '',
    email: '',
    managerId: '',
    manager: '',
    deliveryRadius: '5',
    maxCapacity: '100',
    status: 'active' as 'active' | 'inactive' | 'maintenance' | 'offline',
  });

  const [operationalHours, setOperationalHours] = useState<{
    [key: string]: { open: string; close: string; isOpen: boolean };
  }>({
    monday: { open: '06:00', close: '23:00', isOpen: true },
    tuesday: { open: '06:00', close: '23:00', isOpen: true },
    wednesday: { open: '06:00', close: '23:00', isOpen: true },
    thursday: { open: '06:00', close: '23:00', isOpen: true },
    friday: { open: '06:00', close: '23:00', isOpen: true },
    saturday: { open: '06:00', close: '23:00', isOpen: true },
    sunday: { open: '07:00', close: '22:00', isOpen: true },
  });

  useEffect(() => {
    if (open) {
      Promise.all([fetchCities(), fetchManagers()]).then(([c, m]) => {
        setCities(c);
        setManagers(m);
      }).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (open && formData.cityId) {
      fetchZones(formData.cityId).then(setZones).catch(() => setZones([]));
    } else if (open) {
      setZones([]);
    }
  }, [open, formData.cityId]);

  useEffect(() => {
    if (open) {
      if (editStore) {
        const cityId = (editStore as any).cityId ?? '';
        const zoneId = (editStore as any).zoneId ?? '';
        const managerId = (editStore as any).managerId ?? '';
        setFormData({
          name: editStore.name,
          code: editStore.code,
          type: editStore.type,
          address: editStore.address,
          cityId: typeof cityId === 'object' ? (cityId as any)?._id : cityId,
          zoneId: typeof zoneId === 'object' ? (zoneId as any)?._id : zoneId,
          city: editStore.city,
          state: editStore.state,
          pincode: editStore.pincode,
          latitude: String(editStore.latitude ?? ''),
          longitude: String(editStore.longitude ?? ''),
          phone: editStore.phone,
          email: editStore.email,
          managerId: typeof managerId === 'object' ? (managerId as any)?._id : managerId,
          manager: editStore.manager,
          deliveryRadius: String(editStore.deliveryRadius ?? 5),
          maxCapacity: String(editStore.maxCapacity ?? 100),
          status: editStore.status as any,
        });
        setOperationalHours(editStore.operationalHours ?? {});
      } else {
        resetForm();
        if (storeType === 'warehouse') {
          setFormData(prev => ({ ...prev, type: 'warehouse' }));
        }
      }
    }
  }, [open, editStore, storeType]);

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: 'store',
      address: '',
      cityId: '',
      zoneId: '',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '',
      latitude: '',
      longitude: '',
      phone: '',
      email: '',
      managerId: '',
      manager: '',
      deliveryRadius: '5',
      maxCapacity: '100',
      status: 'active',
    });
    setOperationalHours({
      monday: { open: '06:00', close: '23:00', isOpen: true },
      tuesday: { open: '06:00', close: '23:00', isOpen: true },
      wednesday: { open: '06:00', close: '23:00', isOpen: true },
      thursday: { open: '06:00', close: '23:00', isOpen: true },
      friday: { open: '06:00', close: '23:00', isOpen: true },
      saturday: { open: '06:00', close: '23:00', isOpen: true },
      sunday: { open: '07:00', close: '22:00', isOpen: true },
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleHourChange = (day: string, field: 'open' | 'close' | 'isOpen', value: any) => {
    setOperationalHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Store name is required');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('Store code is required');
      return;
    }
    if (!formData.address.trim()) {
      toast.error('Address is required');
      return;
    }
    if (storeType !== 'warehouse' && formData.type !== 'warehouse') {
      if (!formData.cityId) {
        toast.error('Please select a city');
        return;
      }
      if (!formData.zoneId) {
        toast.error('Please select a zone');
        return;
      }
    }

    if (formData.type === 'dark_store') {
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      if (!formData.latitude || !formData.longitude || isNaN(lat) || isNaN(lng)) {
        toast.error('Latitude and Longitude are required for darkstores');
        return;
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        toast.error('Invalid coordinates. Latitude must be -90 to 90, Longitude -180 to 180.');
        return;
      }
    }

    setLoading(true);
    try {
      const cityName = cities.find(c => c.id === formData.cityId || (c as any)._id === formData.cityId)?.name ?? formData.city;
      const storeData: Partial<Store> = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        type: formData.type,
        address: formData.address.trim(),
        cityId: formData.cityId || undefined,
        zoneId: formData.zoneId || undefined,
        city: cityName,
        state: formData.state,
        pincode: formData.pincode.trim(),
        latitude: parseFloat(formData.latitude) || 12.9716,
        longitude: parseFloat(formData.longitude) || 77.5946,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        managerId: formData.managerId || undefined,
        manager: formData.manager.trim(),
        deliveryRadius: parseInt(formData.deliveryRadius, 10) || 5,
        maxCapacity: parseInt(formData.maxCapacity, 10) || 100,
        status: formData.status,
        operationalHours,
      };

      let createdStore: Store | Warehouse;
      if (editStore) {
        createdStore = await updateStore(editStore.id, storeData);
        toast.success(`${editStore.type === 'warehouse' ? 'Warehouse' : 'Store'} "${formData.name}" updated successfully`);
      } else {
        // Check if creating warehouse
        if (storeType === 'warehouse' || formData.type === 'warehouse') {
          const warehouseData = {
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            address: formData.address.trim(),
            city: formData.city,
            manager: formData.manager.trim(),
            storageCapacity: parseInt(formData.maxCapacity) || 1000,
            status: formData.status === 'active' ? 'active' as const : 'inactive' as const,
            zones: [],
          };
          createdStore = await createWarehouse(warehouseData);
          toast.success(`Warehouse "${formData.name}" created successfully`);
        } else {
          createdStore = await createStore(storeData);
          toast.success(`Store "${formData.name}" created successfully`);
        }
      }

      // Ensure onSuccess is called to refresh the list
      onOpenChange(false);
      resetForm();
      setLoading(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Store creation error:', error);
      const errorMessage = error?.message || (editStore ? 'Failed to update store' : 'Failed to create store');
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#e4e4e7] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <StoreIcon className="text-blue-600" size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {editStore 
                  ? `Edit ${editStore.type === 'warehouse' ? 'Warehouse' : 'Store'}` 
                  : storeType === 'warehouse' 
                    ? 'Add New Warehouse' 
                    : 'Add New Store'}
              </DialogTitle>
              <DialogDescription>
                {editStore 
                  ? `Update ${editStore.type === 'warehouse' ? 'warehouse' : 'store'} information and settings` 
                  : storeType === 'warehouse'
                    ? 'Create a new warehouse or fulfillment center'
                    : 'Create a new store or fulfillment center'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="basic" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-2 flex-shrink-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="location">Location & Contact</TabsTrigger>
              <TabsTrigger value="hours">Operational Hours</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-6 min-h-0 overflow-y-auto">
            <TabsContent value="basic" className="space-y-4 mt-4 pb-6">
              {/* Store Name */}
              <div className="space-y-2">
                <Label htmlFor="store-name">Store Name *</Label>
                <Input
                  id="store-name"
                  placeholder="e.g., Indiranagar Express"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              </div>

              {/* Store Code */}
              <div className="space-y-2">
                <Label htmlFor="store-code">Store Code *</Label>
                <Input
                  id="store-code"
                  placeholder="e.g., BLR-IND-001"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                  disabled={!!editStore}
                  className="font-mono"
                />
                {editStore && (
                  <p className="text-xs text-[#71717a]">Store code cannot be changed</p>
                )}
              </div>

              {/* Store Type */}
              <div className="space-y-2">
                <Label>Store Type</Label>
                <Select value={formData.type} onValueChange={(val: any) => handleChange('type', val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store">🏪 Regular Store</SelectItem>
                    <SelectItem value="dark_store">🌙 Dark Store (24/7)</SelectItem>
                    <SelectItem value="warehouse">📦 Warehouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Manager */}
              <div className="space-y-2">
                <Label>Store Manager</Label>
                <Select
                  value={formData.managerId || '_none'}
                  onValueChange={(v) => handleChange('managerId', v === '_none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Capacity & Radius */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Max Capacity (orders/hour)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    placeholder="100"
                    value={formData.maxCapacity}
                    onChange={(e) => handleChange('maxCapacity', e.target.value)}
                    min="10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="radius">Delivery Radius (km)</Label>
                  <Input
                    id="radius"
                    type="number"
                    placeholder="5"
                    value={formData.deliveryRadius}
                    onChange={(e) => handleChange('deliveryRadius', e.target.value)}
                    min="1"
                    max="20"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(val: any) => handleChange('status', val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">🟢 Active</SelectItem>
                    <SelectItem value="offline">⚫ Offline</SelectItem>
                    <SelectItem value="inactive">⚪ Inactive</SelectItem>
                    <SelectItem value="maintenance">🔧 Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="location" className="space-y-4 mt-4 pb-6">
              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Street Address *</Label>
                <Textarea
                  id="address"
                  placeholder="100 Feet Road, Indiranagar"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={2}
                />
              </div>

              {/* City, Zone, State, Pincode */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Select
                    value={formData.cityId || '_none'}
                    onValueChange={(v) => {
                      handleChange('cityId', v === '_none' ? '' : v);
                      handleChange('zoneId', '');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Select —</SelectItem>
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Zone</Label>
                  <Select
                    value={formData.zoneId || '_none'}
                    onValueChange={(v) => handleChange('zoneId', v === '_none' ? '' : v)}
                    disabled={!formData.cityId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.cityId ? 'Select zone' : 'Select city first'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Select —</SelectItem>
                      {zones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="Karnataka"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    placeholder="560038"
                    value={formData.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value)}
                  />
                </div>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="0.0001"
                    placeholder="12.9716"
                    value={formData.latitude}
                    onChange={(e) => handleChange('latitude', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="0.0001"
                    placeholder="77.5946"
                    value={formData.longitude}
                    onChange={(e) => handleChange('longitude', e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  💡 Tip: Use Google Maps to find accurate coordinates. Right-click on location → "What's here?"
                </p>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+91-80-4567-8901"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="store@quickcommerce.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="hours" className="space-y-4 mt-4 pb-6">
              <div className="space-y-3">
                {DAYS.map(day => (
                  <div key={day} className="flex items-center gap-3 p-3 bg-[#f4f4f5] rounded-lg">
                    <div className="flex items-center gap-2 w-32">
                      <Switch
                        checked={operationalHours[day].isOpen}
                        onCheckedChange={(checked) => handleHourChange(day, 'isOpen', checked)}
                      />
                      <Label className="capitalize cursor-pointer">
                        {day}
                      </Label>
                    </div>

                    {operationalHours[day].isOpen ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={operationalHours[day].open}
                          onChange={(e) => handleHourChange(day, 'open', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-[#71717a]">to</span>
                        <Input
                          type="time"
                          value={operationalHours[day].close}
                          onChange={(e) => handleHourChange(day, 'close', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    ) : (
                      <span className="text-[#a1a1aa] text-sm">Closed</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allOpen = { open: '06:00', close: '23:00', isOpen: true };
                    setOperationalHours(DAYS.reduce((acc, day) => ({ ...acc, [day]: allOpen }), {}));
                  }}
                >
                  Set All 6AM - 11PM
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allDay = { open: '00:00', close: '23:59', isOpen: true };
                    setOperationalHours(DAYS.reduce((acc, day) => ({ ...acc, [day]: allDay }), {}));
                  }}
                >
                  Set 24/7
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer - Always visible */}
        <div className="px-6 py-4 border-t border-[#e4e4e7] flex justify-end gap-3 flex-shrink-0 bg-white">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? 'Saving...' : editStore ? 'Update Store' : 'Create Store'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}