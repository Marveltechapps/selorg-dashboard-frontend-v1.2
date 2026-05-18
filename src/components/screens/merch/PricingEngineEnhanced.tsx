import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Loader2, BarChart3, LineChart } from 'lucide-react';
import { pricingApi, competitorApi } from '../../../api/merch/analyticsApi';
import { toast } from 'sonner';

export function PricingEngine({ searchQuery = "" }: { searchQuery?: string }) {
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSKU, setSelectedSKU] = useState<string | null>(null);
  const [showOptimize, setShowOptimize] = useState(false);

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    try {
      setLoading(true);
      setPrices(mockPrices);
    } catch (error) {
      console.error('Error loading prices:', error);
      setPrices(mockPrices);
    } finally {
      setLoading(false);
    }
  };

  const optimizePrice = async (sku: string) => {
    try {
      await pricingApi.optimizePrice(sku);
      toast.success(`Price optimized for ${sku}`);
      loadPrices();
    } catch (error) {
      toast.error('Failed to optimize price');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} /></div>;
  }

  const filteredPrices = prices.filter(p =>
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dynamic Pricing Engine</h1>
        <button
          onClick={() => setShowOptimize(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Optimize All Prices
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Avg Price</p>
          <p className="text-2xl font-bold mt-1">$87.50</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Price Variance</p>
          <p className="text-2xl font-bold mt-1">12.5%</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Optimized SKUs</p>
          <p className="text-2xl font-bold text-green-600 mt-1">78</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Revenue Impact</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">+8.3%</p>
        </div>
      </div>

      <div className="bg-white rounded-lg overflow-hidden shadow">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold">SKU</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Base Price</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Current Price</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Change</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPrices.map(price => (
              <tr key={price.sku} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{price.sku}</td>
                <td className="px-4 py-3">${price.basePrice}</td>
                <td className="px-4 py-3 font-semibold">${price.currentPrice}</td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1 ${price.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {price.change > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {Math.abs(price.change)}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded ${price.optimized ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {price.optimized ? 'Optimized' : 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => optimizePrice(price.sku)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Optimize
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const mockPrices = [
  { sku: 'SKU-001', basePrice: 100, currentPrice: 95, change: -5, optimized: true },
  { sku: 'SKU-002', basePrice: 75, currentPrice: 82, change: 9.3, optimized: true },
  { sku: 'SKU-003', basePrice: 150, currentPrice: 155, change: 3.3, optimized: false },
  { sku: 'SKU-004', basePrice: 50, currentPrice: 48, change: -4, optimized: true },
  { sku: 'SKU-005', basePrice: 200, currentPrice: 210, change: 5, optimized: false },
];
