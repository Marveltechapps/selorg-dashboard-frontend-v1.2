import React, { useState, useEffect } from 'react';
import { Plus, Edit2, MapPin, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { warehouseApi } from '../../../api/merch/warehouseApi';
import { toast } from 'sonner';

interface Warehouse {
  warehouseId: string;
  warehouseName: string;
  code: string;
  type: 'DC' | 'REGIONAL_HUB' | 'STORE';
  tier: number;
  capacity: {
    maxCapacity: number;
    currentUtilization: number;
  };
  location: {
    city: string;
    state: string;
  };
  isActive: boolean;
}

export function WarehouseManagement({ searchQuery = "" }: { searchQuery?: string }) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<number | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  useEffect(() => {
    loadWarehouses();
  }, [selectedTier]);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      let data;
      if (selectedTier === 'all') {
        data = await warehouseApi.getAllWarehouses();
      } else {
        data = await warehouseApi.getWarehousesByTier(selectedTier);
      }
      setWarehouses(data?.data || mockWarehouses);
    } catch (error) {
      console.error('Error loading warehouses:', error);
      setWarehouses(mockWarehouses);
    } finally {
      setLoading(false);
    }
  };

  const filteredWarehouses = warehouses.filter(w =>
    w.warehouseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTierBadgeColor = (tier: number) => {
    switch (tier) {
      case 1:
        return 'bg-purple-100 text-purple-800';
      case 2:
        return 'bg-blue-100 text-blue-800';
      case 3:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierLabel = (tier: number) => {
    switch (tier) {
      case 1:
        return 'Distribution Center';
      case 2:
        return 'Regional Hub';
      case 3:
        return 'Store';
      default:
        return 'Unknown';
    }
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-100';
    if (percentage < 80) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Warehouse Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={16} />
          Add Warehouse
        </button>
      </div>

      {/* Tier Filter */}
      <div className="bg-white rounded-lg p-4">
        <h3 className="font-semibold mb-3">Filter by Tier</h3>
        <div className="flex gap-2">
          {['all', 1, 2, 3].map(tier => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-4 py-2 rounded-lg transition ${
                selectedTier === tier
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tier === 'all' ? 'All Tiers' : getTierLabel(tier)}
            </button>
          ))}
        </div>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWarehouses.length === 0 ? (
          <div className="col-span-full bg-gray-50 rounded-lg p-8 text-center">
            <Package size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600">No warehouses found</p>
          </div>
        ) : (
          filteredWarehouses.map(warehouse => {
            const utilizationPercentage = (warehouse.capacity.currentUtilization / warehouse.capacity.maxCapacity) * 100;
            return (
              <div
                key={warehouse.warehouseId}
                className="bg-white rounded-lg p-4 shadow hover:shadow-lg transition cursor-pointer"
                onClick={() => setSelectedWarehouse(warehouse)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-sm">{warehouse.warehouseName}</h3>
                    <p className="text-xs text-gray-600">{warehouse.code}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${getTierBadgeColor(warehouse.tier)}`}>
                    {getTierLabel(warehouse.tier)}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
                  <MapPin size={14} />
                  <span>{warehouse.location.city}, {warehouse.location.state}</span>
                </div>

                {/* Capacity Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">Capacity</span>
                    <span className="text-gray-600">{Math.round(utilizationPercentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition ${getUtilizationColor(utilizationPercentage)}`}
                      style={{ width: `${utilizationPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {warehouse.capacity.currentUtilization} / {warehouse.capacity.maxCapacity}
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded ${
                    warehouse.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {warehouse.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    className="text-blue-600 hover:text-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWarehouse(warehouse);
                    }}
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Warehouse Details Modal */}
      {selectedWarehouse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedWarehouse.warehouseName}</h2>
              <button
                onClick={() => setSelectedWarehouse(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">Code</p>
                  <p className="font-semibold">{selectedWarehouse.code}</p>
                </div>
                <div>
                  <p className="text-gray-600">Type</p>
                  <p className="font-semibold">{selectedWarehouse.type}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">Tier</p>
                  <p className="font-semibold">{getTierLabel(selectedWarehouse.tier)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className={`font-semibold ${selectedWarehouse.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedWarehouse.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-gray-600">Location</p>
                <p className="font-semibold">{selectedWarehouse.location.city}, {selectedWarehouse.location.state}</p>
              </div>

              <div>
                <p className="text-gray-600 mb-2">Capacity Utilization</p>
                <div className="space-y-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-blue-600"
                      style={{
                        width: `${(selectedWarehouse.capacity.currentUtilization / selectedWarehouse.capacity.maxCapacity) * 100}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-600">
                    {selectedWarehouse.capacity.currentUtilization} / {selectedWarehouse.capacity.maxCapacity} units
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setSelectedWarehouse(null)}
                className="flex-1 px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  toast.success('Edit functionality coming soon');
                  setSelectedWarehouse(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Warehouse Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Add New Warehouse</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Warehouse Name"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Warehouse Code"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <select className="w-full px-3 py-2 border rounded-lg text-sm">
                <option>Select Type</option>
                <option>DC</option>
                <option>REGIONAL_HUB</option>
                <option>STORE</option>
              </select>
              <input
                type="number"
                placeholder="Max Capacity"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success('Warehouse created successfully');
                  setShowCreateModal(false);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const mockWarehouses: Warehouse[] = [
  {
    warehouseId: 'WH-001',
    warehouseName: 'Main Distribution Center',
    code: 'DC-MAIN',
    type: 'DC',
    tier: 1,
    capacity: { maxCapacity: 10000, currentUtilization: 7500 },
    location: { city: 'New York', state: 'NY' },
    isActive: true,
  },
  {
    warehouseId: 'WH-002',
    warehouseName: 'Northeast Regional Hub',
    code: 'HUB-NE',
    type: 'REGIONAL_HUB',
    tier: 2,
    capacity: { maxCapacity: 5000, currentUtilization: 3200 },
    location: { city: 'Boston', state: 'MA' },
    isActive: true,
  },
  {
    warehouseId: 'WH-003',
    warehouseName: 'Manhattan Store 1',
    code: 'STORE-MAN-1',
    type: 'STORE',
    tier: 3,
    capacity: { maxCapacity: 500, currentUtilization: 425 },
    location: { city: 'New York', state: 'NY' },
    isActive: true,
  },
  {
    warehouseId: 'WH-004',
    warehouseName: 'Chicago Regional Hub',
    code: 'HUB-CHI',
    type: 'REGIONAL_HUB',
    tier: 2,
    capacity: { maxCapacity: 5000, currentUtilization: 2100 },
    location: { city: 'Chicago', state: 'IL' },
    isActive: true,
  },
  {
    warehouseId: 'WH-005',
    warehouseName: 'Los Angeles Store 2',
    code: 'STORE-LAX-2',
    type: 'STORE',
    tier: 3,
    capacity: { maxCapacity: 500, currentUtilization: 200 },
    location: { city: 'Los Angeles', state: 'CA' },
    isActive: true,
  },
  {
    warehouseId: 'WH-006',
    warehouseName: 'Denver Secondary Hub',
    code: 'HUB-DEN',
    type: 'REGIONAL_HUB',
    tier: 2,
    capacity: { maxCapacity: 3000, currentUtilization: 4800 },
    location: { city: 'Denver', state: 'CO' },
    isActive: false,
  },
];
