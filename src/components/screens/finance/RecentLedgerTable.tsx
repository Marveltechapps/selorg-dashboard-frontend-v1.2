import React from 'react';
import { LedgerEntry } from './accountingApi';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../ui/table";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { format } from "date-fns";

interface Props {
  entries: LedgerEntry[];
  isLoading: boolean;
  onEntryClick: (entry: LedgerEntry) => void;
}

export function RecentLedgerTable({ entries, isLoading, onEntryClick }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm p-4">
        <div className="space-y-4">
             {[1, 2, 3, 4, 5].map(i => (
                 <Skeleton key={i} className="h-10 w-full" />
             ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
          <h3 className="font-bold text-[#212121]">Recent Ledger Entries</h3>
          {/* Optional: Add simple filters here later */}
      </div>
      
      {entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
              No ledger entries found for this period.
          </div>
      ) : (
        <Table>
            <TableHeader className="bg-[#F5F7FA]">
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="w-[140px]">Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow 
                    key={entry.id} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => onEntryClick(entry)}
                >
                  <TableCell className="text-[#616161]">
                      {format(new Date(entry.date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#616161]">
                      {entry.reference}
                  </TableCell>
                  <TableCell className="font-medium text-[#212121]">
                      {entry.description}
                      {entry.sourceModule !== 'manual' && (
                          <Badge variant="outline" className="ml-2 text-[10px] h-4 px-1 text-gray-400 border-gray-200 uppercase">
                              {entry.sourceModule}
                          </Badge>
                      )}
                  </TableCell>
                  <TableCell className="text-[#616161]">
                      <span className="font-mono text-xs mr-2 text-gray-400">{entry.accountCode}</span>
                      {entry.accountName}
                  </TableCell>
                  <TableCell className="text-right font-medium text-[#212121]">
                      {entry.debit > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(entry.debit) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-[#212121]">
                      {entry.credit > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(entry.credit) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </Table>
      )}
    </div>
  );
}
