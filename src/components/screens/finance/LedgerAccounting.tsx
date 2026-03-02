import React, { useState, useEffect } from 'react';
import { FileText, Plus } from 'lucide-react';
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
    fetchAccounts 
} from './accountingApi';

export function LedgerAccounting() {
  // --- State ---
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals / Drawers
  const [newJournalOpen, setNewJournalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Filter State (client-side filtering)
  const [activeFilter, setActiveFilter] = useState<'all' | 'receivables' | 'payables'>('all');

  // --- Data Fetching ---
  const loadData = async () => {
      setIsLoading(true);
      try {
          const [sumData, entData, accData] = await Promise.all([
              fetchAccountingSummary(),
              fetchLedgerEntries(),
              fetchAccounts()
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
  };

  useEffect(() => {
      loadData();
  }, []);

  const refreshData = async () => {
      setIsRefreshing(true);
      try {
          const [sumData, entData] = await Promise.all([
              fetchAccountingSummary(),
              fetchLedgerEntries()
          ]);
          setSummary(sumData);
          setEntries(entData);
      } finally {
          setIsRefreshing(false);
      }
  };

  // --- Filtering Logic ---
  const getFilteredEntries = () => {
      if (activeFilter === 'all') return entries;
      if (activeFilter === 'receivables') {
          return entries.filter(e => e.accountCode.startsWith('11')); // AR accounts typically 11xx
      }
      if (activeFilter === 'payables') {
          return entries.filter(e => e.accountCode.startsWith('2')); // AP accounts typically 2xxx
      }
      return entries;
  };

  // --- Handlers ---
  const handleEntryClick = (entry: LedgerEntry) => {
      setSelectedEntry(entry);
      setDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Accounting & Ledger</h1>
          <p className="text-[#757575] text-sm">General ledger, adjustment entries, and tax reporting</p>
        </div>
        <Button 
            className="bg-[#212121] text-white hover:bg-black font-medium shadow-sm transition-colors"
            onClick={() => setNewJournalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Journal Entry
        </Button>
      </div>

      <LedgerSummaryCards 
          summary={summary} 
          isLoading={isLoading} 
          onFilter={setActiveFilter}
      />

      <RecentLedgerTable 
          entries={getFilteredEntries()} 
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
