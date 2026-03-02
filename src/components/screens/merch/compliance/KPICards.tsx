import React from 'react';
import { Clock, ShieldCheck, FileCheck } from 'lucide-react';

interface KPICardsProps {
  pendingCount: number;
  complianceScore: number;
  auditsPassed: number;
  onPendingClick: () => void;
  onScoreClick: () => void;
  onAuditsClick: () => void;
}

export function KPICards({
  pendingCount,
  complianceScore,
  auditsPassed,
  onPendingClick,
  onScoreClick,
  onAuditsClick
}: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div 
        onClick={onPendingClick}
        className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center mb-4">
          <Clock size={32} className="text-yellow-600" />
        </div>
        <h3 className="text-2xl font-bold text-[#212121]">{pendingCount}</h3>
        <p className="text-[#757575] text-sm">Pending Approvals</p>
      </div>

      <div 
        onClick={onScoreClick}
        className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
          <ShieldCheck size={24} className="text-green-600" />
        </div>
        <h3 className="text-base font-black text-[#212121]">{complianceScore}%</h3>
        <p className="text-[#757575] text-[9px] uppercase font-bold tracking-wider mt-1">Compliance Score</p>
      </div>

      <div 
        onClick={onAuditsClick}
        className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <FileCheck size={32} className="text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-[#212121]">{auditsPassed}</h3>
        <p className="text-[#757575] text-sm">Audits Passed (YTD)</p>
      </div>
    </div>
  );
}
