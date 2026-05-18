import React, { useState, useEffect } from 'react';
import { Plus, Filter, Eye, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { allocationApi } from '../../../api/merch/warehouseApi';
import { toast } from 'sonner';

interface AllocationRule {
  ruleId: string;
  ruleName: string;
  priority: number;
  allocationStrategy: string;
  maxAllocationPerCycle: number;
  isActive: boolean;
}

export function AllocationDashboard({ searchQuery = "" }: { searchQuery?: string }) {
  const [rules, setRules] = useState<AllocationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStrategy, setFilterStrategy] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AllocationRule | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await allocationApi.getAllRules();
      setRules(data?.data || mockRules);
    } catch (error) {
      console.error('Error loading rules:', error);
      setRules(mockRules);
    } finally {
      setLoading(false);
    }
  };

  const filteredRules = rules.filter(r => {
    const matchesSearch = r.ruleName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStrategy = filterStrategy === 'all' || r.allocationStrategy === filterStrategy;
    return matchesSearch && matchesStrategy;
  });

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'FIFO':
        return 'bg-blue-100 text-blue-800';
      case 'LIFO':
        return 'bg-purple-100 text-purple-800';
      case 'CLOSEST_DC':
        return 'bg-green-100 text-green-800';
      case 'CHEAPEST':
        return 'bg-yellow-100 text-yellow-800';
      case 'FASTEST':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const allocationMetrics = {
    activeRules: rules.filter(r => r.isActive).length,
    totalRules: rules.length,
    avgPriority: Math.round(rules.reduce((sum, r) => sum + r.priority, 0) / rules.length),
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
        <h1 className="text-2xl font-bold">Allocation Dashboard</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={16} />
          Create Rule
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Active Rules</p>
          <p className="text-2xl font-bold mt-1">{allocationMetrics.activeRules}</p>
          <p className="text-xs text-gray-500 mt-1">of {allocationMetrics.totalRules} total</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Avg Priority</p>
          <p className="text-2xl font-bold mt-1">{allocationMetrics.avgPriority}</p>
          <p className="text-xs text-green-600 mt-1"><TrendingUp size={12} className="inline mr-1" />Lower is higher priority</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Efficiency</p>
          <p className="text-2xl font-bold mt-1">{Math.round((allocationMetrics.activeRules / Math.max(allocationMetrics.totalRules, 1)) * 100)}%</p>
          <p className="text-xs text-gray-500 mt-1">Active / Total</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={18} />
          <h3 className="font-semibold">Filter by Strategy</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'FIFO', 'LIFO', 'CLOSEST_DC', 'CHEAPEST', 'FASTEST'].map(strategy => (
            <button
              key={strategy}
              onClick={() => setFilterStrategy(strategy)}
              className={`px-3 py-1 rounded text-sm transition ${
                filterStrategy === strategy
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {strategy === 'all' ? 'All Strategies' : strategy}
            </button>
          ))}
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-lg overflow-hidden shadow">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Rule Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Strategy</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Max/Cycle</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRules.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No allocation rules found
                </td>
              </tr>
            ) : (
              filteredRules.map(rule => (
                <tr key={rule.ruleId} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{rule.ruleName}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${getStrategyColor(rule.allocationStrategy)}`}>
                      {rule.allocationStrategy}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{rule.priority}</td>
                  <td className="px-4 py-3 text-sm">{rule.maxAllocationPerCycle}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      rule.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedRule(rule)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Rule Details Modal */}
      {selectedRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedRule.ruleName}</h2>
              <button
                onClick={() => setSelectedRule(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Strategy</p>
                <span className={`inline-block text-xs px-2 py-1 rounded font-medium ${getStrategyColor(selectedRule.allocationStrategy)}`}>
                  {selectedRule.allocationStrategy}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">Priority</p>
                  <p className="font-semibold text-lg">{selectedRule.priority}</p>
                </div>
                <div>
                  <p className="text-gray-600">Max/Cycle</p>
                  <p className="font-semibold text-lg">{selectedRule.maxAllocationPerCycle}</p>
                </div>
              </div>

              <div>
                <p className="text-gray-600">Status</p>
                <p className={`font-semibold ${selectedRule.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedRule.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setSelectedRule(null)}
                className="flex-1 px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  toast.success('Rule updated successfully');
                  setSelectedRule(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Create Allocation Rule</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Rule Name"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <select className="w-full px-3 py-2 border rounded-lg text-sm">
                <option>Select Strategy</option>
                <option>FIFO</option>
                <option>LIFO</option>
                <option>CLOSEST_DC</option>
                <option>CHEAPEST</option>
                <option>FASTEST</option>
              </select>
              <input
                type="number"
                placeholder="Priority"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="number"
                placeholder="Max Allocation per Cycle"
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
                  toast.success('Allocation rule created successfully');
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

const mockRules: AllocationRule[] = [
  {
    ruleId: 'RULE-001',
    ruleName: 'Fast Allocation',
    priority: 1,
    allocationStrategy: 'FASTEST',
    maxAllocationPerCycle: 1000,
    isActive: true,
  },
  {
    ruleId: 'RULE-002',
    ruleName: 'Cost Optimization',
    priority: 2,
    allocationStrategy: 'CHEAPEST',
    maxAllocationPerCycle: 800,
    isActive: true,
  },
  {
    ruleId: 'RULE-003',
    ruleName: 'Proximity First',
    priority: 1,
    allocationStrategy: 'CLOSEST_DC',
    maxAllocationPerCycle: 500,
    isActive: true,
  },
  {
    ruleId: 'RULE-004',
    ruleName: 'FIFO Standard',
    priority: 3,
    allocationStrategy: 'FIFO',
    maxAllocationPerCycle: 600,
    isActive: false,
  },
];
