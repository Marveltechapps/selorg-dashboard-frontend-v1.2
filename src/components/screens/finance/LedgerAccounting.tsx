import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from "../../ui/button";
import { toast } from 'sonner';

import { LedgerSummaryCards } from './LedgerSummaryCards';
import { RecentLedgerTable } from './RecentLedgerTable';
import { NewJournalEntryModal } from './NewJournalEntryModal';
import { LedgerEntryDrawer } from './LedgerEntryDrawer';

import { 
    LedgerSummary, 
    LedgerEntry, 
    AccountOption,
    fetchAccountingSummary, 
    fetchLedgerEntries,
    fetchAccounts,
    syncLedger,
} from './accountingApi';

export function LedgerAccounting() {
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [newJournalOpen, setNewJournalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [activeFilter, setActiveFilter] = useState<'all' | 'receivables' | 'payables'>('all');

  const loadData = useCallback(async () => {
      setIsLoading(true);
      try {
          const [sumData, entData, accData] = await Promise.all([
              fetchAccountingSummary(),
              fetchLedgerEntries({ filter: activeFilter }),
              fetchAccounts(),
          ]);
          setSummary(sumData);
          setEntries(entData ?? []);
          setAccounts(accData ?? []);
      } catch (e) {
          toast.error("Failed to load ledger data");
          setSummary(null);
          setEntries([]);
          setAccounts([]);
      } finally {
          setIsLoading(false);
      }
  }, [activeFilter]);

  useEffect(() => {
      loadData();
  }, [loadData]);

  const refreshData = async () => {
      setIsRefreshing(true);
      try {
          const stats = await syncLedger();
          const [sumData, entData] = await Promise.all([
              fetchAccountingSummary(),
              fetchLedgerEntries({ filter: activeFilter }),
          ]);
          setSummary(sumData);
          setEntries(entData);
          if (stats.total > 0) {
            toast.success(`Synced ${stats.total} new journal(s) from operations`);
          } else {
            toast.success('Ledger is up to date');
          }
      } catch {
          toast.error('Failed to refresh ledger');
      } finally {
          setIsRefreshing(false);
      }
  };

  const handleEntryClick = (entry: LedgerEntry) => {
      setSelectedEntry(entry);
      setDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Accounting & Ledger</h1>
          <p className="text-[#757575] text-sm">
            General ledger synced from payments, vendor bills, and refunds
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={isRefreshing || isLoading}
            className="font-medium"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            className="bg-[#212121] text-white hover:bg-black font-medium shadow-sm transition-colors"
            onClick={() => setNewJournalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Journal Entry
          </Button>
        </div>
      </div>

      <LedgerSummaryCards 
          summary={summary} 
          isLoading={isLoading} 
          onFilter={setActiveFilter}
      />

      <RecentLedgerTable 
          entries={entries} 
          isLoading={isLoading || isRefreshing}
          onEntryClick={handleEntryClick}
      />

      <NewJournalEntryModal 
          open={newJournalOpen} 
          onClose={() => setNewJournalOpen(false)}
          onSuccess={refreshData}
          accounts={accounts}
      />

      <LedgerEntryDrawer 
          entry={selectedEntry} 
          open={detailsOpen} 
          onClose={() => setDetailsOpen(false)}
      />
    </div>
  );
}
