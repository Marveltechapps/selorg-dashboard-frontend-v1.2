import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Loader2, AlertTriangle } from 'lucide-react';
import { forecastApi } from '../../../api/merch/analyticsApi';
import { toast } from 'sonner';

export function ForecastingDashboard({ searchQuery = "" }: { searchQuery?: string }) {
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSKU, setSelectedSKU] = useState<string>('');

  useEffect(() => {
    loadForecasts();
  }, []);

  const loadForecasts = async () => {
    try {
      setLoading(true);
      setForecast(mockForecasts);
    } catch (error) {
      setForecast(mockForecasts);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} /></div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Demand & Sales Forecasting</h1>
        <select className="px-3 py-2 border rounded-lg">
          <option>Next 30 Days</option>
          <option>Next 60 Days</option>
          <option>Next 90 Days</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Predicted Sales</p>
          <p className="text-2xl font-bold mt-1">$2.8M</p>
          <p className="text-xs text-green-600 mt-1">+12% vs last period</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Predicted Units</p>
          <p className="text-2xl font-bold mt-1">18.5K</p>
          <p className="text-xs text-gray-600 mt-1">Confidence: 87%</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-600 text-sm">Model Accuracy</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">92%</p>
          <p className="text-xs text-gray-600 mt-1">MAPE: 5.2%</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="font-bold mb-3">Pessimistic Scenario</h3>
          <p className="text-xl font-bold text-red-600">$2.1M</p>
          <p className="text-xs text-gray-600 mt-1">Lower bound estimate</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="font-bold mb-3">Base Case</h3>
          <p className="text-xl font-bold text-blue-600">$2.8M</p>
          <p className="text-xs text-gray-600 mt-1">Most likely outcome</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="font-bold mb-3">Optimistic Scenario</h3>
          <p className="text-xl font-bold text-green-600">$3.5M</p>
          <p className="text-xs text-gray-600 mt-1">Upper bound estimate</p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="font-bold mb-4">Forecast Accuracy Metrics</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">MAPE (Mean Absolute %)</span>
            <span className="font-semibold">5.2%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">RMSE (Root Mean Square)</span>
            <span className="font-semibold">42.3K</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">MAE (Mean Absolute)</span>
            <span className="font-semibold">28.1K</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Forecast Method</span>
            <span className="font-semibold">ML Time Series</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="font-bold mb-4">Top Forecasted SKUs</h3>
        <div className="space-y-2 text-sm">
          {['SKU-001', 'SKU-002', 'SKU-003'].map((sku, idx) => (
            <div key={sku} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span>{sku}</span>
              <span className="font-semibold">{2500 - idx * 300} units</span>
              <span className="text-xs text-gray-600">Confidence: {85 + idx * 2}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const mockForecasts = {
  sales: 2800000,
  units: 18500,
  confidence: 87,
  scenarios: {
    pessimistic: 2100000,
    base: 2800000,
    optimistic: 3500000,
  },
};
