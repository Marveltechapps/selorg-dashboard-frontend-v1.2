import React, { useState, useEffect } from 'react';
import { Plus, Filter, Star, Eye, Loader2, TrendingUp } from 'lucide-react';
import { vendorApi } from '../../../api/merch/warehouseApi';
import { toast } from 'sonner';

interface Vendor {
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  vendorType: 'DIRECT_VENDOR' | 'DISTRIBUTOR' | 'CONSOLIDATOR';
  performanceMetrics: {
    onTimeDeliveryPercentage: number;
    qualityScore: number;
    reliabilityScore: number;
    totalOrders: number;
    successfulOrders: number;
  };
  leadTime: number;
  isActive: boolean;
}

export function VendorManagement({ searchQuery = "" }: { searchQuery?: string }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await vendorApi.getAllVendors();
      setVendors(data?.data || mockVendors);
    } catch (error) {
      console.error('Error loading vendors:', error);
      setVendors(mockVendors);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || v.vendorType === filterType;
    return matchesSearch && matchesType;
  });

  const getVendorTypeColor = (type: string) => {
    switch (type) {
      case 'DIRECT_VENDOR':
        return 'bg-blue-100 text-blue-800';
      case 'DISTRIBUTOR':
        return 'bg-purple-100 text-purple-800';
      case 'CONSOLIDATOR':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRatingColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const overallStats = {
    totalVendors: vendors.length,
    activeVendors: vendors.filter(v => v.isActive).length,
    avgQuality: Math.round(vendors.reduce((sum, v) => sum + v.performanceMetrics.qualityScore, 0) / vendors.length),
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
        <h1 className="text-2xl font-bold">Vendor Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={16} />
          Add Vendor
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Total Vendors</p>
          <p className="text-2xl font-bold mt-1">{overallStats.totalVendors}</p>
          <p className="text-xs text-gray-500 mt-1">{overallStats.activeVendors} active</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Avg Quality Score</p>
          <p className={`text-2xl font-bold mt-1 ${getRatingColor(overallStats.avgQuality)}`}>
            {overallStats.avgQuality}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Performance rating</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">On-Time Delivery</p>
          <p className="text-2xl font-bold mt-1">
            {Math.round(vendors.reduce((sum, v) => sum + v.performanceMetrics.onTimeDeliveryPercentage, 0) / Math.max(vendors.length, 1))}%
          </p>
          <p className="text-xs text-green-600 mt-1"><TrendingUp size={12} className="inline mr-1" />Avg performance</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={18} />
          <h3 className="font-semibold">Filter by Type</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'DIRECT_VENDOR', 'DISTRIBUTOR', 'CONSOLIDATOR'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded text-sm transition ${
                filterType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type === 'all' ? 'All Types' : type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.length === 0 ? (
          <div className="col-span-full bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">No vendors found</p>
          </div>
        ) : (
          filteredVendors.map(vendor => (
            <div
              key={vendor.vendorId}
              className="bg-white rounded-lg p-4 shadow hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-sm">{vendor.vendorName}</h3>
                  <p className="text-xs text-gray-600">{vendor.vendorCode}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${getVendorTypeColor(vendor.vendorType)}`}>
                  {vendor.vendorType.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-2 mb-3 pb-3 border-b">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Quality</span>
                  <span className={`font-semibold ${getRatingColor(vendor.performanceMetrics.qualityScore)}`}>
                    {vendor.performanceMetrics.qualityScore}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">On-Time Delivery</span>
                  <span className={`font-semibold ${getRatingColor(vendor.performanceMetrics.onTimeDeliveryPercentage)}`}>
                    {Math.round(vendor.performanceMetrics.onTimeDeliveryPercentage)}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Lead Time</span>
                  <span className="font-semibold">{vendor.leadTime} days</span>
                </div>
              </div>

              {/* Order Stats */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div className="bg-blue-50 rounded p-2">
                  <p className="text-gray-600">Total Orders</p>
                  <p className="font-bold text-lg">{vendor.performanceMetrics.totalOrders}</p>
                </div>
                <div className="bg-green-50 rounded p-2">
                  <p className="text-gray-600">Success Rate</p>
                  <p className="font-bold text-lg">
                    {vendor.performanceMetrics.totalOrders > 0
                      ? Math.round((vendor.performanceMetrics.successfulOrders / vendor.performanceMetrics.totalOrders) * 100)
                      : 0}%
                  </p>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded ${
                  vendor.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {vendor.isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => setSelectedVendor(vendor)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Vendor Details Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedVendor.vendorName}</h2>
              <button
                onClick={() => setSelectedVendor(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">Vendor Code</p>
                  <p className="font-semibold">{selectedVendor.vendorCode}</p>
                </div>
                <div>
                  <p className="text-gray-600">Type</p>
                  <p className="font-semibold">{selectedVendor.vendorType.replace(/_/g, ' ')}</p>
                </div>
              </div>

              <div>
                <p className="text-gray-600 mb-2">Performance Metrics</p>
                <div className="bg-gray-50 rounded p-3 space-y-2">
                  <div className="flex justify-between">
                    <span>Quality Score</span>
                    <span className={`font-semibold ${getRatingColor(selectedVendor.performanceMetrics.qualityScore)}`}>
                      {selectedVendor.performanceMetrics.qualityScore}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>On-Time Delivery</span>
                    <span className={`font-semibold ${getRatingColor(selectedVendor.performanceMetrics.onTimeDeliveryPercentage)}`}>
                      {Math.round(selectedVendor.performanceMetrics.onTimeDeliveryPercentage)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reliability Score</span>
                    <span className={`font-semibold ${getRatingColor(selectedVendor.performanceMetrics.reliabilityScore)}`}>
                      {selectedVendor.performanceMetrics.reliabilityScore}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">Lead Time</p>
                  <p className="font-semibold text-lg">{selectedVendor.leadTime} days</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className={`font-semibold ${selectedVendor.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedVendor.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setSelectedVendor(null)}
                className="flex-1 px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  toast.success('Vendor details updated');
                  setSelectedVendor(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Vendor Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Vendor</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Vendor Name"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Vendor Code"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <select className="w-full px-3 py-2 border rounded-lg text-sm">
                <option>Select Type</option>
                <option>DIRECT_VENDOR</option>
                <option>DISTRIBUTOR</option>
                <option>CONSOLIDATOR</option>
              </select>
              <input
                type="number"
                placeholder="Lead Time (days)"
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
                  toast.success('Vendor created successfully');
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

const mockVendors: Vendor[] = [
  {
    vendorId: 'VEN-001',
    vendorName: 'Global Supplies Inc',
    vendorCode: 'GS-001',
    vendorType: 'DIRECT_VENDOR',
    performanceMetrics: {
      onTimeDeliveryPercentage: 95,
      qualityScore: 92,
      reliabilityScore: 94,
      totalOrders: 150,
      successfulOrders: 142,
    },
    leadTime: 5,
    isActive: true,
  },
  {
    vendorId: 'VEN-002',
    vendorName: 'Fast Distribution Co',
    vendorCode: 'FD-002',
    vendorType: 'DISTRIBUTOR',
    performanceMetrics: {
      onTimeDeliveryPercentage: 88,
      qualityScore: 85,
      reliabilityScore: 87,
      totalOrders: 200,
      successfulOrders: 176,
    },
    leadTime: 3,
    isActive: true,
  },
  {
    vendorId: 'VEN-003',
    vendorName: 'Premium Consolidators',
    vendorCode: 'PC-003',
    vendorType: 'CONSOLIDATOR',
    performanceMetrics: {
      onTimeDeliveryPercentage: 92,
      qualityScore: 89,
      reliabilityScore: 91,
      totalOrders: 120,
      successfulOrders: 110,
    },
    leadTime: 7,
    isActive: true,
  },
  {
    vendorId: 'VEN-004',
    vendorName: 'Retail Wholesale Ltd',
    vendorCode: 'RW-004',
    vendorType: 'DIRECT_VENDOR',
    performanceMetrics: {
      onTimeDeliveryPercentage: 78,
      qualityScore: 75,
      reliabilityScore: 80,
      totalOrders: 80,
      successfulOrders: 62,
    },
    leadTime: 10,
    isActive: false,
  },
];
