import {
  EntryType,
  LockingStrategy,
  AccountStatus
} from "@prisma/client";

export interface JournalEntryInput {
  accountId: string;
  entryType: EntryType;
  amount: bigint;
}

export interface PostJournalRequest {
  transactionId: string;
  lockingStrategy: LockingStrategy;
  entries: JournalEntryInput[];
}

export interface LedgerEntryCreateInput {
  transactionId: string;
  accountId: string;
  entryType: EntryType;
  amount: bigint;
  balanceAfter: bigint;
}

export interface UpdatedBalance {
  accountId: string;
  cachedBalance: bigint;
  lastLedgerEntryId?: string;
}

export interface PreparedJournal {
  ledgerEntries: LedgerEntryCreateInput[];
  updatedBalances: Map<string, UpdatedBalance>;
}

export interface LockedAccount {
  accountId: string;
  status: AccountStatus;
  currency: string;
  version: number;
  cachedBalance: bigint;
  lastLedgerEntryId: string | null;
  updatedAt: Date;
}