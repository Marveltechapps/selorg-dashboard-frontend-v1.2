import { apiRequest } from '@/api/apiClient';

export interface LedgerSummary {
  generalLedgerBalance: number;
  receivablesBalance: number;
  payablesBalance: number;
  asOfDate: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  journalId: string;
  sourceModule: "payments" | "vendor" | "refunds" | "manual" | string;
  createdAt: string;
  createdBy: string;
}

export interface JournalEntryLine {
  accountCode: string;
  accountName?: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  memo?: string;
  lines: JournalEntryLine[];
  status: "draft" | "posted";
  createdBy: string;
  createdAt: string;
}

export interface AccountOption {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
}

const BASE = '/finance';

export const fetchAccountingSummary = async (): Promise<LedgerSummary> => {
  const response = await apiRequest<{ success: boolean; data: LedgerSummary }>(`${BASE}/ledger/summary`);
  return response.data;
};

export const fetchLedgerEntries = async (params?: {
  dateFrom?: string;
  dateTo?: string;
  accountCode?: string;
}): Promise<LedgerEntry[]> => {
  const queryParams = new URLSearchParams();
  if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
  if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
  if (params?.accountCode) queryParams.append('accountCode', params.accountCode);
  const endpoint = `${BASE}/ledger/entries${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiRequest<{ success: boolean; data: LedgerEntry[] }>(endpoint);
  return response.data ?? [];
};

export const fetchAccounts = async (): Promise<AccountOption[]> => {
  const response = await apiRequest<{ success: boolean; data: AccountOption[] }>(`${BASE}/ledger/accounts`);
  return response.data ?? [];
};

export const createJournalEntry = async (
  entry: Omit<JournalEntry, 'id' | 'createdAt' | 'status'>
): Promise<JournalEntry> => {
  const response = await apiRequest<{ success: boolean; data: JournalEntry }>(
    `${BASE}/ledger/journal-entries`,
    {
      method: 'POST',
      body: JSON.stringify(entry),
    }
  );
  return response.data;
};

export const fetchJournalDetails = async (journalId: string): Promise<JournalEntry | null> => {
  const response = await apiRequest<{ success: boolean; data: JournalEntry }>(
    `${BASE}/ledger/journal-entries/${journalId}`
  );
  return response.data ?? null;
};
