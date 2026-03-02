import React, { useState, useEffect } from 'react';
import { FinanceAlert, AlertActionPayload } from './financeAlertsApi';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "../../ui/sheet";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import { ScrollArea } from "../../ui/scroll-area";
import { Loader2, AlertTriangle, Activity, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  alert: FinanceAlert | null;
  open: boolean;
  onClose: () => void;
  onAction: (id: string, payload: AlertActionPayload) => Promise<void>;
}

export function AlertDetailsDrawer({ alert, open, onClose, onAction }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<FinanceAlert | null>(alert);

  // Update currentAlert when alert prop changes
  useEffect(() => {
      setCurrentAlert(alert);
  }, [alert]);

  if (!alert || !currentAlert) return null;

  const handleAction = async (payload: AlertActionPayload, successMsg: string) => {
      setIsProcessing(true);
      try {
          await onAction(alert.id, payload);
          // Update local state to reflect the change immediately
          let newStatus: FinanceAlert['status'] = currentAlert.status;
          if (payload.actionType === 'dismiss') newStatus = 'dismissed';
          else if (payload.actionType === 'resolve') newStatus = 'resolved';
          else if (payload.actionType === 'acknowledge') newStatus = 'acknowledged';
          else if (['check_gateway', 'review_txn', 'reconcile'].includes(payload.actionType)) newStatus = 'in_progress';
          
          setCurrentAlert({
              ...currentAlert,
              status: newStatus,
              lastUpdatedAt: new Date().toISOString()
          });
          
          // Don't close drawer immediately - let user see the update
      } catch (e) {
          console.error('Action failed:', e);
          toast.error("Action failed");
      } finally {
          setIsProcessing(false);
      }
  };

  const renderContent = () => {
      const displayAlert = currentAlert || alert;
      switch (displayAlert.type) {
          case 'gateway_failure_rate':
              return <GatewayFailureContent alert={displayAlert} />;
          case 'high_value_txn':
              return <HighValueTxnContent alert={displayAlert} />;
          case 'settlement_mismatch':
              return <SettlementMismatchContent alert={displayAlert} />;
          default:
              return (
                  <div className="p-4 text-sm text-gray-500">
                      No specific details available for this alert type. Please review the description and take appropriate action.
                  </div>
              );
      }
  };

  const renderFooterActions = () => {
      const displayAlert = currentAlert || alert;
      switch (displayAlert.type) {
          case 'gateway_failure_rate':
              return (
                  <>
                      <Button 
                          variant="outline" 
                          className="flex-1" 
                          onClick={() => handleAction({ actionType: 'acknowledge' }, "Alert acknowledged")}
                          disabled={isProcessing}
                      >
                          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Acknowledge & Watch
                      </Button>
                      <Button 
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white" 
                        onClick={() => handleAction({ actionType: 'check_gateway' }, "Gateway check initiated")}
                        disabled={isProcessing}
                      >
                          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                          Check Gateway
                      </Button>
                  </>
              );
          case 'high_value_txn':
              return (
                  <>
                      <Button 
                          variant="outline" 
                          className="flex-1" 
                          onClick={() => handleAction({ actionType: 'add_note' }, "Flagged for manual review")}
                          disabled={isProcessing}
                      >
                          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Flag for Review
                      </Button>
                      <Button 
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white" 
                        onClick={() => handleAction({ actionType: 'review_txn' }, "Transaction approved")}
                        disabled={isProcessing}
                      >
                          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                          Approve Txn
                      </Button>
                  </>
              );
           case 'settlement_mismatch':
              return (
                  <>
                      <Button 
                          variant="outline" 
                          className="flex-1" 
                          onClick={() => handleAction({ actionType: 'reconcile' }, "Mark adjustment posted")}
                          disabled={isProcessing}
                      >
                          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Mark Adjustment Posted
                      </Button>
                      <Button 
                          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Trigger navigation event
                            const event = new CustomEvent('navigateToTab', { detail: { tab: 'reconciliation' } });
                            window.dispatchEvent(event);
                            
                            // Also try postMessage for iframe scenarios
                            if (window.parent && window.parent !== window) {
                              window.parent.postMessage({ type: 'navigate', tab: 'reconciliation' }, '*');
                            }
                            
                            toast.success("Navigating to Reconciliation...");
                            onClose();
                          }}
                      >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open Reconciliation
                      </Button>
                  </>
              );
          default:
              return (
                  <Button className="w-full" onClick={() => handleAction({ actionType: 'resolve' }, "Marked as resolved")}>
                      Mark Resolved
                  </Button>
              );
      }
  };

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-[400px] sm:w-[500px] flex flex-col h-full bg-white p-0">
        <div className="p-6 border-b bg-gray-50/50">
            <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full mt-1
                    ${alert.severity === 'critical' ? 'bg-red-100 text-red-600' : 
                      alert.severity === 'high' ? 'bg-yellow-100 text-yellow-600' : 
                      alert.severity === 'medium' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'
                    }`}
                >
                    <AlertTriangle size={20} />
                </div>
                <div>
                    <SheetTitle className="text-xl font-bold text-gray-900 leading-tight">
                        {(currentAlert || alert).title}
                    </SheetTitle>
                    <SheetDescription className="mt-1 flex items-center gap-2">
                         <Badge variant="outline" className="capitalize">{(currentAlert || alert).severity}</Badge>
                         <span className="text-xs text-gray-500">ID: {(currentAlert || alert).id.slice(0, 8)}</span>
                    </SheetDescription>
                </div>
            </div>
        </div>

        <ScrollArea className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-300px)]">
            <div className="space-y-6">
                <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                    <p className="text-gray-900 text-sm leading-relaxed">{(currentAlert || alert).description}</p>
                </div>

                <Separator />

                {renderContent()}

                {/* Activity log derived from alert timestamps */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Activity Log</h4>
                    <div className="space-y-3">
                         <div className="flex gap-3 text-sm">
                             <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                             <div>
                                 <p className="text-gray-900 font-medium">Alert Created</p>
                                 <p className="text-xs text-gray-500">{new Date((currentAlert || alert).createdAt).toLocaleString()}</p>
                             </div>
                         </div>
                         {(currentAlert || alert).status !== 'open' && (
                             <div className="flex gap-3 text-sm">
                                 <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5" />
                                 <div>
                                     <p className="text-gray-900 font-medium">Status changed to {(currentAlert || alert).status}</p>
                                     <p className="text-xs text-gray-500">{new Date((currentAlert || alert).lastUpdatedAt).toLocaleString()}</p>
                                 </div>
                             </div>
                         )}
                    </div>
                </div>
            </div>
        </ScrollArea>

        <div className="p-6 border-t bg-white flex gap-3">
             {renderFooterActions()}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// --- Content Components ---

function GatewayFailureContent({ alert }: { alert: FinanceAlert }) {
    const { source } = alert;
    return (
        <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                 <div className="p-3 border rounded-lg bg-red-50 border-red-100">
                     <p className="text-xs text-red-600 font-medium mb-1">Current Failure Rate</p>
                     <p className="text-2xl font-bold text-red-700">{source.metrics?.failureRatePercent}%</p>
                 </div>
                 <div className="p-3 border rounded-lg bg-gray-50">
                     <p className="text-xs text-gray-600 font-medium mb-1">Threshold</p>
                     <p className="text-2xl font-bold text-gray-700">{source.metrics?.thresholdPercent}%</p>
                 </div>
             </div>
             
             <div className="border rounded-lg p-4">
                 <h4 className="text-sm font-medium mb-3">Recent Failed Transactions</h4>
                 <div className="space-y-2">
                     {[1, 2, 3].map(i => (
                         <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0 border-gray-100">
                             <span className="font-mono text-gray-600">TXN-FAIL-{100+i}</span>
                             <span className="text-red-600 font-medium">E_GATEWAY_TIMEOUT</span>
                         </div>
                     ))}
                 </div>
             </div>

             <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                 <p className="font-medium text-blue-800 mb-1">Recommended Action</p>
                 Check {source.gateway} status page or switch routing to backup provider if failure rate persists &gt; 5 mins.
             </div>
        </div>
    );
}

function HighValueTxnContent({ alert }: { alert: FinanceAlert }) {
    const { source } = alert;
    return (
        <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-center">
                 <p className="text-sm text-yellow-800 font-medium">Transaction Amount</p>
                 <p className="text-3xl font-bold text-yellow-900 mt-1">
                     ₹{source.metrics?.amount?.toLocaleString()}
                 </p>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer group">
                    <div>
                        <p className="text-sm font-medium text-gray-900">Customer Profile</p>
                        <p className="text-xs text-gray-500">View payment history and risk score</p>
                    </div>
                    <ArrowRight size={16} className="text-gray-400 group-hover:text-gray-600 self-center" />
                </div>
                 <div className="flex justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer group">
                    <div>
                        <p className="text-sm font-medium text-gray-900">Fraud Analysis</p>
                        <p className="text-xs text-gray-500">Check signal data from risk provider</p>
                    </div>
                    <ArrowRight size={16} className="text-gray-400 group-hover:text-gray-600 self-center" />
                </div>
            </div>
        </div>
    );
}

function SettlementMismatchContent({ alert }: { alert: FinanceAlert }) {
    const { source } = alert;
    return (
        <div className="space-y-4">
             <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg flex justify-between items-center">
                 <div>
                    <p className="text-sm text-orange-800 font-medium">Mismatch Amount</p>
                    <p className="text-xs text-orange-600">Batch {source.batchId}</p>
                 </div>
                 <p className="text-2xl font-bold text-orange-900">
                     ₹{source.metrics?.amount?.toFixed(2)}
                 </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="py-2 px-3 text-left font-medium text-gray-500">Entity</th>
                            <th className="py-2 px-3 text-right font-medium text-gray-500">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        <tr>
                            <td className="py-2 px-3 text-gray-900">Expected (Ledger)</td>
                            <td className="py-2 px-3 text-right text-gray-900">₹12,450.00</td>
                        </tr>
                        <tr>
                            <td className="py-2 px-3 text-gray-900">Received (Bank)</td>
                            <td className="py-2 px-3 text-right text-gray-900">₹12,405.00</td>
                        </tr>
                        <tr className="bg-orange-50/50">
                            <td className="py-2 px-3 font-medium text-orange-800">Difference</td>
                            <td className="py-2 px-3 text-right font-bold text-orange-800">-₹{source.metrics?.amount?.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <p className="text-xs text-gray-500 italic">
                Likely caused by a fee adjustment or a single transaction refund that wasn't recorded in the batch report.
            </p>
        </div>
    );
}
