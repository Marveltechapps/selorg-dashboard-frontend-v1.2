import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../ui/sheet";
import { Badge } from "../../ui/badge";
import { ScrollArea } from "../../ui/scroll-area";
import { Separator } from "../../ui/separator";
import { Button } from "../../ui/button";
import { AlertCircle, FileText, ArrowUpRight, Search } from 'lucide-react';
import { ReconciliationException } from './reconciliationApi';

interface Props {
  exception: ReconciliationException | null;
  open: boolean;
  onClose: () => void;
  onResolve: (ex: ReconciliationException) => void;
}

export function ExceptionInvestigationDrawer({ exception, open, onClose, onResolve }: Props) {
  if (!exception) return null;

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col h-full bg-white">
        <div className="p-6 border-b border-gray-100">
             <div className="flex items-center gap-2 mb-2">
                 <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 uppercase">
                     {exception.reasonCode.replace('_', ' ')}
                 </Badge>
                 <span className="text-xs text-gray-400 ml-auto">
                     Created {new Date(exception.createdAt).toLocaleDateString()}
                 </span>
             </div>
             <SheetTitle className="text-xl font-bold text-gray-900 leading-tight">
                 {exception.title}
             </SheetTitle>
             <SheetDescription className="hidden">
                 Investigation details for {exception.title}
             </SheetDescription>
        </div>

        <ScrollArea className="flex-1 bg-gray-50/50 overflow-y-auto max-h-[calc(100vh-200px)]">
            <div className="p-6 space-y-8">
                {/* Overview Card */}
                <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                             <p className="text-xs text-gray-500 uppercase tracking-wide">Amount</p>
                             <p className={`text-2xl font-bold ${exception.amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                 {new Intl.NumberFormat('en-IN', { style: 'currency', currency: exception.currency }).format(exception.amount)}
                             </p>
                         </div>
                         <div>
                             <p className="text-xs text-gray-500 uppercase tracking-wide">Source</p>
                             <p className="text-lg font-medium text-gray-900 capitalize">{exception.sourceType} {exception.gateway ? `(${exception.gateway})` : ''}</p>
                         </div>
                    </div>
                    <Separator />
                    <div>
                         <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Details</p>
                         <p className="text-sm text-gray-700 leading-relaxed">
                             {exception.details || "No additional details provided by the system."}
                         </p>
                    </div>
                </div>

                {/* Matching candidates: backend investigateException does not return candidates yet; show empty state */}
                <div className="space-y-4">
                     <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                         <Search size={16} /> Matching Candidates
                     </h4>
                     <p className="text-sm text-gray-500">
                         No matching candidates are returned by the reconciliation service for this exception. When the backend supports candidate matches, they will appear here.
                     </p>
                </div>

                {/* Actions Section */}
                 <div className="space-y-4">
                     <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                         <FileText size={16} /> Investigation Notes
                     </h4>
                     <div className="bg-yellow-50 p-4 rounded border border-yellow-100 text-sm text-yellow-800 flex gap-3">
                         <AlertCircle size={18} className="shrink-0 mt-0.5" />
                         <p>
                             This exception has been open for more than 24 hours. Consider creating a manual journal entry if no bank match is found by EOD.
                         </p>
                     </div>
                </div>
            </div>
        </ScrollArea>

        <div className="p-6 border-t border-gray-100 bg-white flex gap-3">
             <Button 
                variant="outline" 
                className="flex-1" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
             >
               Close Investigation
             </Button>
             <Button 
                className="flex-1 bg-[#14B8A6] hover:bg-[#0D9488]"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onResolve(exception);
                }}
            >
                 <ArrowUpRight size={16} className="mr-2" /> Resolve Issue
             </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
