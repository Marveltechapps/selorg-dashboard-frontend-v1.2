import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "../../ui/button";
import { Skeleton } from "../../ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { CheckCircle2, ShieldAlert, RefreshCcw, History } from 'lucide-react';
import { toast } from 'sonner';

import { 
    FinanceAlert, 
    AlertActionPayload,
    AlertStatus,
    fetchAlerts, 
    performAlertAction, 
    clearResolvedAlerts 
} from './financeAlertsApi';

import { FinanceAlertCard } from './FinanceAlertCard';
import { AlertDetailsDrawer } from './AlertDetailsDrawer';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";

export function FinanceAlerts() {
  const [alerts, setAlerts] = useState<FinanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter State
  const [statusFilter, setStatusFilter] = useState<'open' | 'all'>('open');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showHistory, setShowHistory] = useState(false);
  
  // Drawer State
  const [selectedAlert, setSelectedAlert] = useState<FinanceAlert | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Clear Confirm State
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const loadData = async () => {
      setIsLoading(true);
      try {
          const statusToFetch = statusFilter === 'open' ? 'open' : 'all';
          const data = await fetchAlerts(statusToFetch);
          setAlerts(data);
      } catch (e) {
          console.error('Failed to load alerts:', e);
          toast.error("Failed to load alerts");
          setAlerts([]);
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      loadData();
  }, [statusFilter]);

  // Filter alerts based on filters
  const filteredAlerts = useMemo(() => {
    let filtered = [...alerts];
    
    // Status filter
    if (statusFilter === 'open') {
      filtered = filtered.filter(a => ['open', 'in_progress', 'acknowledged'].includes(a.status));
    } else if (!showHistory) {
      // If not showing history, filter out resolved/dismissed
      filtered = filtered.filter(a => !['resolved', 'dismissed'].includes(a.status));
    }
    
    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(a => a.severity === severityFilter);
    }
    
    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(a => a.type === typeFilter);
    }
    
    return filtered;
  }, [alerts, statusFilter, severityFilter, typeFilter, showHistory]);

  const handleAlertAction = async (id: string, payload: AlertActionPayload) => {
      // Optimistic update - update UI immediately
      const alertBeforeUpdate = alerts.find(a => a.id === id);
      let newStatus: AlertStatus = alertBeforeUpdate?.status || 'open';
      
      if (payload.actionType === 'dismiss') newStatus = 'dismissed';
      else if (payload.actionType === 'resolve') newStatus = 'resolved';
      else if (payload.actionType === 'acknowledge') newStatus = 'acknowledged';
      else if (['check_gateway', 'review_txn', 'reconcile'].includes(payload.actionType)) newStatus = 'in_progress';
      
      // Update UI immediately
      const updatedAlert = alertBeforeUpdate ? {
          ...alertBeforeUpdate,
          status: newStatus,
          lastUpdatedAt: new Date().toISOString()
      } : null;

      if (updatedAlert) {
          setAlerts(prev => prev.map(a => a.id === id ? updatedAlert : a));
      }

      try {
          // Persist the action
          const persisted = await performAlertAction(id, payload);
          
          // Update with persisted data (in case there are additional fields)
          if (persisted) {
              setAlerts(prev => prev.map(a => a.id === id ? persisted : a));
          }

          // Show appropriate success message
          switch (payload.actionType) {
              case 'dismiss':
                  toast.success("Alert dismissed");
                  // Remove from view after a short delay
                  setTimeout(() => {
                      setAlerts(prev => prev.filter(a => a.id !== id));
                  }, 500);
                  break;
              case 'resolve':
                  toast.success("Alert marked as resolved");
                  // Remove from view after a short delay
                  setTimeout(() => {
                      setAlerts(prev => prev.filter(a => a.id !== id));
                  }, 500);
                  break;
              case 'acknowledge':
                  toast.success("Alert acknowledged");
                  break;
              case 'check_gateway':
                  toast.success("Gateway check initiated");
                  break;
              case 'review_txn':
                  toast.success("Transaction flagged for review");
                  break;
              case 'reconcile':
                  toast.success("Reconciliation initiated");
                  break;
              case 'add_note':
                  toast.success("Flagged for manual review");
                  break;
              default:
                  toast.success("Alert updated successfully");
          }

      } catch (e) {
          console.error('Failed to update alert:', e);
          toast.error("Failed to update alert");
          // Revert optimistic update
          if (alertBeforeUpdate) {
              setAlerts(prev => prev.map(a => a.id === id ? alertBeforeUpdate : a));
          }
      }
  };

  const handleClearResolved = async () => {
      try {
          await clearResolvedAlerts();
          await loadData();
          toast.success("Resolved alerts cleared", {
            description: 'Resolved and dismissed alerts have been removed from view'
          });
          setIsClearConfirmOpen(false);
      } catch (e) {
          toast.error("Failed to clear alerts");
      }
  };

  const handleCardClick = (alert: FinanceAlert) => {
      setSelectedAlert(alert);
      setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Alerts & Exceptions</h1>
          <p className="text-[#757575] text-sm">Payment failures, SLA breaches, and high-value alerts</p>
        </div>
        <div className="flex gap-2">
            <Button 
              variant={showHistory ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowHistory(!showHistory)}
            >
                <History className="h-4 w-4 mr-2" /> {showHistory ? 'Hide' : 'Show'} History
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                loadData();
              }}
              type="button"
            >
                <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button 
                variant="secondary" 
                size="sm" 
                className="bg-white border border-[#E0E0E0] text-[#212121] hover:bg-[#F5F5F5]"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsClearConfirmOpen(true);
                }}
                type="button"
            >
                Clear Resolved
            </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm">
        <Select 
          value={statusFilter} 
          onValueChange={(value) => setStatusFilter(value as 'open' | 'all')}
        >
          <SelectTrigger className="w-[150px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open Alerts</SelectItem>
            <SelectItem value="all">All Status</SelectItem>
          </SelectContent>
        </Select>
        
        <Select 
          value={severityFilter} 
          onValueChange={setSeverityFilter}
        >
          <SelectTrigger className="w-[150px] text-xs">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        
        <Select 
          value={typeFilter} 
          onValueChange={setTypeFilter}
        >
          <SelectTrigger className="w-[180px] text-xs">
            <SelectValue placeholder="Alert Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="gateway_failure_rate">Gateway Failure</SelectItem>
            <SelectItem value="high_value_txn">High Value Txn</SelectItem>
            <SelectItem value="settlement_mismatch">Settlement Mismatch</SelectItem>
            <SelectItem value="risk_fraud">Risk/Fraud</SelectItem>
            <SelectItem value="sla_breach">SLA Breach</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 min-h-[400px]">
          {isLoading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
          ) : filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-gray-300 rounded-xl">
                  <div className="p-4 bg-green-50 text-green-600 rounded-full mb-4">
                      <CheckCircle2 size={48} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">All Systems Operational</h3>
                  <p className="text-gray-500 mt-1">No active alerts. Payment systems look healthy.</p>
              </div>
          ) : (
              filteredAlerts.map(alert => (
                  <FinanceAlertCard 
                      key={alert.id} 
                      alert={alert} 
                      onAction={handleAlertAction}
                      onClick={handleCardClick}
                  />
              ))
          )}
      </div>

      <AlertDetailsDrawer 
          alert={selectedAlert}
          open={drawerOpen}
          onClose={() => {
              setDrawerOpen(false);
              // Update selectedAlert to reflect any changes
              if (selectedAlert) {
                  const updated = alerts.find(a => a.id === selectedAlert.id);
                  if (updated) {
                      setSelectedAlert(updated);
                  }
              }
          }}
          onAction={handleAlertAction}
      />

      <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Clear resolved alerts?</AlertDialogTitle>
            <AlertDialogDescription>
                This will hide all alerts that are marked Resolved or Dismissed from your view. This action cannot be undone.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearResolved}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
