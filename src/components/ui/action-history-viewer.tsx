import React, { useState, useEffect } from 'react';
import { History, Clock, User, Info, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { fetchAuditLogs } from '../../api/inventory-management/auditLog.api';
import { getActiveStoreId } from '../../contexts/AuthContext';

interface ActionHistoryViewerProps {
  module?: string;
  action?: string;
  sku?: string;
  storeId?: string;
  limit?: number;
  className?: string;
}

export function ActionHistoryViewer({
  module,
  action,
  sku,
  storeId = getActiveStoreId() || '',
  limit = 10,
  className
}: ActionHistoryViewerProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [module, action, sku, storeId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: any = { limit, storeId };
      if (module) params.module = module;
      if (action) params.action = action;
      if (sku) params.sku = sku;
      
      const response = await fetchAuditLogs(params);
      if (response && response.success) {
        setLogs(response.logs || []);
      }
    } catch (error) {
      console.error('Failed to load action history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <RefreshCw size={24} className="text-[#1677FF] animate-spin mb-2" />
        <p className="text-xs text-[#9E9E9E]">Loading history...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <History size={32} className="text-[#E0E0E0] mb-2" />
        <p className="text-xs font-medium text-[#757575]">No history found</p>
        <p className="text-[10px] text-[#9E9E9E]">No actions recorded for this module yet.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {logs.map((log) => (
        <div key={log.id} className="p-3 bg-[#F9FAFB] border border-[#E0E0E0] rounded-lg">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-bold text-[#212121] uppercase tracking-tight">
              {log.action?.split('_').join(' ') || 'Action'}
            </span>
            <span className="text-[10px] text-[#9E9E9E] flex items-center gap-1">
              <Clock size={10} />
              {new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <User size={10} className="text-[#757575]" />
            <span className="text-[10px] text-[#616161]">Performed by: <span className="font-bold">{log.user}</span></span>
          </div>

          {log.details && (
            <div className="mt-2 pt-2 border-t border-[#E0E0E0] grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(log.details).map(([key, value]: [string, any]) => (
                <div key={key} className="flex flex-col">
                  <span className="text-[9px] text-[#9E9E9E] uppercase font-bold">{key.split('_').join(' ')}</span>
                  <span className="text-[10px] text-[#212121] font-medium truncate">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

