import React from 'react';
import { AlertTriangle, Search, Plus } from 'lucide-react';

export function InventoryExceptions() {
  const exceptions = [
    { id: 'EX-001', item: 'Avocados (Large)', sku: '8839201', reason: 'Out of Stock', reportedBy: 'Mike R.', time: '10 mins ago', status: 'Open' },
    { id: 'EX-002', item: 'Whole Milk 1L', sku: '2231122', reason: 'Damaged Batch', reportedBy: 'Sarah L.', time: '25 mins ago', status: 'Investigating' },
    { id: 'EX-003', item: 'Ben & Jerry Phish Food', sku: '9922110', reason: 'Missing in Zone', reportedBy: 'System', time: '1 hour ago', status: 'Open' },
    { id: 'EX-004', item: 'Sourdough Bread', sku: '4433221', reason: 'Expired', reportedBy: 'Alex M.', time: '2 hours ago', status: 'Resolved' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inventory Exceptions</h2>
          <p className="text-slate-500 text-sm">Review and resolve reported inventory issues.</p>
        </div>
        <button className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-red-700 transition-colors shadow-sm">
          <Plus size={18} />
          Report Issue
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-500">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">Active Issues: 3</span>
          </div>
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input type="text" placeholder="Search SKU..." className="pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
        
        <table className="w-full text-left text-sm">
          <thead className="bg-white text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-6 py-3 font-medium">Exception ID</th>
              <th className="px-6 py-3 font-medium">Item Name</th>
              <th className="px-6 py-3 font-medium">SKU</th>
              <th className="px-6 py-3 font-medium">Reason</th>
              <th className="px-6 py-3 font-medium">Reported</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {exceptions.map((ex) => (
              <tr key={ex.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono text-slate-600">{ex.id}</td>
                <td className="px-6 py-4 font-medium text-slate-900">{ex.item}</td>
                <td className="px-6 py-4 text-slate-500">{ex.sku}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    ex.reason === 'Out of Stock' ? 'bg-red-100 text-red-700' :
                    ex.reason === 'Damaged Batch' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {ex.reason}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  <div className="flex flex-col">
                    <span>{ex.time}</span>
                    <span className="text-xs text-slate-400">by {ex.reportedBy}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      ex.status === 'Open' ? 'bg-red-500' :
                      ex.status === 'Investigating' ? 'bg-amber-500' : 'bg-green-500'
                    }`} />
                    <span>{ex.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-blue-600 font-medium hover:underline">Resolve</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
