import React from 'react';
import { 
  AlertTriangle, 
  Search, 
  ArrowRight,
  ShieldAlert,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { ReconciliationException } from './reconciliationApi';
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";

interface Props {
  exceptions: ReconciliationException[];
  isLoading: boolean;
  onInvestigate: (ex: ReconciliationException) => void;
  onResolve: (ex: ReconciliationException) => void;
}

export function ReconExceptionsCard({ exceptions, isLoading, onInvestigate, onResolve }: Props) {
  const openCount = exceptions.filter(e => e.status !== 'resolved' && e.status !== 'ignored').length;

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
      <div className="p-5 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
        <div>
            <h3 className="font-bold text-[#212121] flex items-center gap-2">
                Reconciliation Exceptions
            </h3>
            <p className="text-xs text-[#757575] mt-1">Transactions requiring manual review</p>
        </div>
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-bold px-3 py-1">
            {openCount} Open Issues
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-0">
          {isLoading ? (
             <div className="p-5 space-y-4">
                 {[1, 2, 3, 4].map(i => (
                     <Skeleton key={i} className="h-16 w-full rounded-lg" />
                 ))}
             </div>
          ) : exceptions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="bg-green-50 p-4 rounded-full mb-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h4 className="font-bold text-gray-900">All Clear!</h4>
                  <p className="text-sm text-gray-500 mt-1">No open reconciliation issues found.</p>
              </div>
          ) : (
            <div className="divide-y divide-[#F0F0F0]">
                {exceptions.map((ex) => (
                    <div key={ex.id} className="p-5 hover:bg-[#FAFAFA] transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex items-start gap-3">
                            <div className={`mt-1 min-w-[32px] h-8 rounded bg-red-100 flex items-center justify-center text-red-600`}>
                                <AlertTriangle size={16} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-[#212121] text-sm">{ex.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase border-gray-200 text-gray-500">
                                        {ex.sourceType}
                                    </Badge>
                                    <span className="text-xs text-[#757575]">
                                        {new Date(ex.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-xs text-red-600 mt-1 font-medium">
                                    {ex.reasonCode.replace('_', ' ').toUpperCase()}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                            <div className={`font-mono font-bold ${ex.amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                {ex.amount < 0 ? '-' : ''}
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: ex.currency }).format(Math.abs(ex.amount))}
                            </div>
                            
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 text-xs font-medium"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onInvestigate(ex);
                                    }}
                                    type="button"
                                >
                                    Investigate
                                </Button>
                                {ex.suggestedAction === 'resolve' && (
                                    <Button 
                                        size="sm" 
                                        className="h-8 text-xs font-medium bg-[#14B8A6] hover:bg-[#0D9488]"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          onResolve(ex);
                                        }}
                                        type="button"
                                    >
                                        Resolve
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          )}
      </div>
    </div>
  );
}
