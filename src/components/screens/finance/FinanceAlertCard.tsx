import React from 'react';
import { FinanceAlert, AlertActionPayload } from './financeAlertsApi';
import { AlertCircle, IndianRupee, Wallet, MoreHorizontal, CheckCircle2, XCircle, PlayCircle, Eye } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

interface Props {
  alert: FinanceAlert;
  onAction: (id: string, payload: AlertActionPayload) => void;
  onClick: (alert: FinanceAlert) => void;
}

export function FinanceAlertCard({ alert, onAction, onClick }: Props) {
  const getTheme = () => {
      switch (alert.severity) {
          case 'critical':
              return {
                  bg: 'bg-red-50',
                  border: 'border-red-200',
                  iconBg: 'bg-white',
                  iconColor: 'text-red-500',
                  text: 'text-red-900',
                  subText: 'text-red-800',
                  btnPrimary: 'bg-red-500 hover:bg-red-600 text-white',
                  btnSecondary: 'bg-white border-red-200 text-red-700 hover:bg-red-50',
                  icon: <AlertCircle size={24} />
              };
          case 'high':
              return {
                  bg: 'bg-yellow-50',
                  border: 'border-yellow-200',
                  iconBg: 'bg-white',
                  iconColor: 'text-yellow-600',
                  text: 'text-yellow-900',
                  subText: 'text-yellow-800',
                  btnPrimary: 'bg-yellow-500 hover:bg-yellow-600 text-white',
                  btnSecondary: 'bg-white border-yellow-200 text-yellow-700 hover:bg-yellow-50',
                  icon: <IndianRupee size={24} />
              };
          case 'medium':
              return {
                  bg: 'bg-orange-50',
                  border: 'border-orange-200',
                  iconBg: 'bg-white',
                  iconColor: 'text-orange-600',
                  text: 'text-orange-900',
                  subText: 'text-orange-800',
                  btnPrimary: 'bg-orange-500 hover:bg-orange-600 text-white',
                  btnSecondary: 'bg-white border-orange-200 text-orange-700 hover:bg-orange-50',
                  icon: <Wallet size={24} />
              };
          default:
               return {
                  bg: 'bg-gray-50',
                  border: 'border-gray-200',
                  iconBg: 'bg-white',
                  iconColor: 'text-gray-600',
                  text: 'text-gray-900',
                  subText: 'text-gray-700',
                  btnPrimary: 'bg-gray-800 hover:bg-gray-900 text-white',
                  btnSecondary: 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100',
                  icon: <AlertCircle size={24} />
              };
      }
  };

  const theme = getTheme();

  // Determine Primary Action based on type
  const renderActions = () => {
      switch (alert.type) {
          case 'gateway_failure_rate':
              return (
                  <>
                      <Button 
                        size="sm" 
                        className={`h-8 text-xs font-bold ${theme.btnPrimary}`}
                        onClick={async (e) => { 
                            e.stopPropagation(); 
                            await onAction(alert.id, { actionType: 'check_gateway' }); 
                            onClick(alert); 
                        }}
                      >
                          Check Gateway
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className={`h-8 text-xs font-bold ${theme.btnSecondary}`}
                        onClick={async (e) => { 
                            e.stopPropagation(); 
                            await onAction(alert.id, { actionType: 'dismiss' }); 
                        }}
                      >
                          Dismiss
                      </Button>
                  </>
              );
          case 'high_value_txn':
                return (
                    <Button 
                        size="sm" 
                        className={`h-8 text-xs font-bold ${theme.btnPrimary}`}
                        onClick={async (e) => { 
                            e.stopPropagation(); 
                            await onAction(alert.id, { actionType: 'review_txn' }); 
                            onClick(alert); 
                        }}
                    >
                        Review Txn
                    </Button>
                );
          case 'settlement_mismatch':
                return (
                    <Button 
                        size="sm" 
                        className={`h-8 text-xs font-bold ${theme.btnPrimary}`}
                        onClick={async (e) => { 
                            e.stopPropagation(); 
                            await onAction(alert.id, { actionType: 'reconcile' }); 
                            onClick(alert); 
                        }}
                    >
                        Reconcile
                    </Button>
                );
          default:
              return (
                   <Button 
                        size="sm" 
                        className={`h-8 text-xs font-bold ${theme.btnPrimary}`}
                        onClick={(e) => { e.stopPropagation(); onClick(alert); }}
                    >
                        View Details
                    </Button>
              );
      }
  };

  return (
    <div 
        className={`p-4 rounded-xl border flex gap-4 items-start transition-shadow hover:shadow-md cursor-pointer ${theme.bg} ${theme.border}`}
        onClick={() => onClick(alert)}
    >
        <div className={`p-2 rounded-full shadow-sm flex-shrink-0 ${theme.iconBg} ${theme.iconColor}`}>
            {theme.icon}
        </div>
        
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
                <h3 className={`font-bold truncate pr-4 ${theme.text}`}>{alert.title}</h3>
                <span className={`text-xs font-bold whitespace-nowrap ${theme.subText}`}>
                    {formatDistanceToNow(parseISO(alert.createdAt), { addSuffix: true })}
                </span>
            </div>
            
            <p className={`text-sm mt-1 line-clamp-2 ${theme.subText}`}>
                {alert.description}
            </p>

            <div className="flex gap-3 mt-3 items-center">
                {renderActions()}
            </div>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className={`h-8 w-8 hover:bg-black/5 ${theme.text}`}>
                        <MoreHorizontal size={16} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await onAction(alert.id, { actionType: 'acknowledge' });
                      }}
                    >
                        <Eye className="mr-2 h-4 w-4" /> Acknowledge
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAction(alert.id, { actionType: 'resolve' });
                      }}
                    >
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Mark Resolved
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAction(alert.id, { actionType: 'dismiss' });
                      }}
                    >
                        <XCircle className="mr-2 h-4 w-4 text-red-600" /> Dismiss
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </div>
  );
}
