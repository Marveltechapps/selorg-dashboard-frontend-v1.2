import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert } from './types';
import { CheckCircle2, User, Clock, Link as LinkIcon } from 'lucide-react';

interface AlertDetailDrawerProps {
  alert: Alert | null;
  onClose: () => void;
  onResolve: () => void;
  onNavigate?: (tab: string) => void;
}

export function AlertDetailDrawer({ alert, onClose, onResolve, onNavigate }: AlertDetailDrawerProps) {
  if (!alert) return null;

  const handleEntityClick = (type: string, id: string) => {
    if (!onNavigate) return;
    
    if (type === 'campaign') {
        onNavigate('promotions');
    } else if (type === 'sku') {
        onNavigate('catalog');
    } else if (type === 'store') {
        onNavigate('geofence');
    }
    onClose();
  };

  return (
    <Sheet open={!!alert} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full overflow-hidden">
        <SheetHeader className="shrink-0 space-y-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                alert.severity === 'critical' ? 'bg-red-100 text-red-700' : 
                alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
            }`}>
                {alert.severity}
            </span>
             <span className="text-gray-400 text-xs font-bold">#{alert.id}</span>
          </div>
          <SheetTitle className="text-2xl font-black text-gray-900 tracking-tight">{alert.title}</SheetTitle>
          <SheetDescription className="text-sm font-medium text-gray-600 leading-relaxed">
            {alert.description}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <div className="space-y-6 py-6 px-6">
                {/* Linked Entities */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Impacted Entities</h4>
                    <div className="flex flex-wrap gap-2">
                        {alert.linkedEntities.skus?.map(sku => (
                             <Button key={sku} variant="outline" size="sm" className="h-8 gap-2 bg-gray-50 border-gray-200 text-xs font-bold hover:bg-white" onClick={() => handleEntityClick('sku', sku)}>
                                <LinkIcon size={12} /> {sku}
                             </Button>
                        ))}
                         {alert.linkedEntities.campaigns?.map(camp => (
                             <Button key={camp.id} variant="outline" size="sm" className="h-8 gap-2 bg-gray-50 border-gray-200 text-xs font-bold hover:bg-white" onClick={() => handleEntityClick('campaign', camp.id)}>
                                <LinkIcon size={12} /> {camp.name}
                             </Button>
                        ))}
                         {alert.linkedEntities.store && (
                             <Button variant="outline" size="sm" className="h-8 gap-2 bg-gray-50 border-gray-200 text-xs font-bold hover:bg-white" onClick={() => handleEntityClick('store', alert.linkedEntities.store!)}>
                                <LinkIcon size={12} /> {alert.linkedEntities.store}
                             </Button>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Root Cause (Mock) */}
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Root Cause Analysis</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                        {alert.type === 'Pricing' && "Automated scan detected conflicting pricing rules in overlapping active campaigns targeting the same SKU ID."}
                        {alert.type === 'Stock' && "Inventory velocity exceeded forecast by 200% in the last 4 hours, triggering safety stock threshold."}
                        {alert.type === 'Campaign' && "Scheduled end date is approaching within 24 hours. Performance metrics suggest review."}
                        {alert.type === 'System' && "API timeout from SAP ERP connector (Error 504) during batch sync."}
                    </p>
                </div>

                <Separator />

                {/* Activity Log - Created timestamp from real alert data */}
                 <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Activity Log</h4>
                    <div className="space-y-4 relative pl-4 border-l-2 border-gray-100 ml-2">
                        <div className="relative">
                            <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-white" />
                            <div className="text-sm">
                                <span className="font-semibold text-gray-900">System</span> Created Alert
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                <Clock size={10} /> {new Date(alert.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                            </div>
                        </div>
                    </div>
                 </div>

                 <Separator />

                 {/* Comments */}
                 <div className="space-y-3">
                     <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Internal Notes</h4>
                     <div className="flex gap-3">
                         <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">JD</div>
                         <div className="flex-1 space-y-2">
                             <Textarea placeholder="Add a note or @mention..." className="min-h-[80px]" />
                             <div className="flex justify-end">
                                 <Button size="sm" variant="ghost">Post Note</Button>
                             </div>
                         </div>
                     </div>
                 </div>
            </div>
        </ScrollArea>

        <SheetFooter className="shrink-0 pt-4 border-t">
            {alert.status !== 'Resolved' ? (
                 <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2" onClick={() => {
                     onResolve();
                     onClose();
                 }}>
                    <CheckCircle2 size={16} /> Mark as Resolved
                </Button>
            ) : (
                <div className="w-full p-2 text-center text-green-700 bg-green-50 rounded border border-green-200 text-sm font-medium">
                    This alert has been resolved.
                </div>
            )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
