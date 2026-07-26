import type { PostJournalRequest } from "./ledger.types.js";
import {
  EntryType,
  LockingStrategy,
  Prisma,
  AccountStatus,
} from "@prisma/client";
import { prisma } from "../../PrismaClient/prismaclient.js";
import {
  loadAndLockAccounts,
  createLedgerEntries,
  updateAccountBalances,
  getLedgerEntriesByTransactionId,
  getLedgerEntriesByAccountId,
  getLatestLedgerEntry,
} from "./ledger.database.js";
import type {
  LedgerEntryCreateInput,
  UpdatedBalance,
  PreparedJournal,
  LockedAccount,
} from "./ledger.types.js";

function validateJournal(request: PostJournalRequest): void {
  if (request.entries.length === 0) {
    throw new Error("Journal must contain at least one entry.");
  }

  let totalDebit = 0n;
  let totalCredit = 0n;

  let hasDebit = false;
  let hasCredit = false;

  for (const entry of request.entries) {
    if (!entry.accountId) {
      throw new Error("Invalid account id.");
    }

    if (entry.amount <= 0n) {
      throw new Error("Ledger amounts must be greater than zero.");
    }

    if (entry.entryType === EntryType.DEBIT) {
      totalDebit += entry.amount;
      hasDebit = true;
    } else {
      totalCredit += entry.amount;
      hasCredit = true;
    }
  }

  if (!hasDebit) {
    throw new Error("Journal must contain at least one debit entry.");
  }

  if (!hasCredit) {
    throw new Error("Journal must contain at least one credit entry.");
  }

  if (totalDebit !== totalCredit) {
    throw new Error("Journal is not balanced.");
  }
}

async function loadLockedAccounts(
  tx: Prisma.TransactionClient,
  request: PostJournalRequest,
) {
  const accountIds = [
    ...new Set(request.entries.map((entry) => entry.accountId)),
  ];

  switch (request.lockingStrategy) {
    case LockingStrategy.PESSIMISTIC: {
      const accounts = await loadAndLockAccounts(tx, accountIds);

      if (accounts.length !== accountIds.length) {
        throw new Error("One or more accounts do not exist.");
      }

      return new Map<string, LockedAccount>(
        accounts.map((account) => [account.accountId, account]),
      );
    }

    case LockingStrategy.OPTIMISTIC:
      throw new Error("Optimistic locking not implemented yet.");

    default:
      throw new Error("Invalid locking strategy.");
  }
}

function validateBalances(
  lockedAccounts: Map<string, LockedAccount>,
  request: PostJournalRequest,
): void {
  for (const account of lockedAccounts.values()) {
    if (account.status === AccountStatus.CLOSE) {
      throw new Error(`Account ${account.accountId} is closed.`);
    }

    if (account.status === AccountStatus.FROZEN) {
      throw new Error(`Account ${account.accountId} is frozen.`);
    }
  }

  for (const entry of request.entries) {
    if (entry.entryType !== EntryType.DEBIT) {
      continue;
    }

    const account = lockedAccounts.get(entry.accountId);

    if (!account) {
      throw new Error(`Account ${entry.accountId} not found.`);
    }

    if (account.cachedBalance < entry.amount) {
      throw new Error(`Insufficient balance in account ${entry.accountId}.`);
    }
  }
}
export async function postJournal(request: PostJournalRequest) {
  validateJournal(request);

  return prisma.$transaction(async (tx) => {
    const lockedAccounts = await loadLockedAccounts(tx, request);

    validateBalances(lockedAccounts, request);

    const preparedJournal = prepareLedgerEntries(request, lockedAccounts);

    const createdEntries = await createLedgerEntries(
      tx,
      preparedJournal.ledgerEntries,
    );

    const updatedBalances = [...preparedJournal.updatedBalances.values()];

    /*
      Associate each account with the LAST ledger entry
      created for that account.
    */
    const latestEntryMap = new Map<string, string>();

    for (const entry of createdEntries) {
      latestEntryMap.set(entry.accountId, entry.id);
    }
    for (const balance of updatedBalances) {
      const ledgerEntryId = latestEntryMap.get(balance.accountId);

      if (ledgerEntryId === undefined) {
        throw new Error(
          `Missing latest ledger entry for account ${balance.accountId}.`,
        );
      }

      balance.lastLedgerEntryId = ledgerEntryId;
    }

    await updateAccountBalances(tx, updatedBalances);

    return createdEntries;
  });
}

function prepareLedgerEntries(
  request: PostJournalRequest,
  lockedAccounts: Map<string, LockedAccount>,
): PreparedJournal {
  const ledgerEntries: LedgerEntryCreateInput[] = [];

  const updatedBalances = new Map<string, UpdatedBalance>();

  for (const entry of request.entries) {
    const account = lockedAccounts.get(entry.accountId);

    if (!account) {
      throw new Error(`Locked account ${entry.accountId} not found.`);
    }

    let newBalance = account.cachedBalance;

    if (entry.entryType === EntryType.DEBIT) {
      newBalance -= entry.amount;
    } else {
      newBalance += entry.amount;
    }

    ledgerEntries.push({
      transactionId: request.transactionId,
      accountId: entry.accountId,
      entryType: entry.entryType,
      amount: entry.amount,
      balanceAfter: newBalance,
    });

    updatedBalances.set(entry.accountId, {
      accountId: entry.accountId,
      cachedBalance: newBalance,
    });

    // Update the in-memory balance so subsequent entries
    // for the same account use the latest value.
    account.cachedBalance = newBalance;
  }

  return {
    ledgerEntries,
    updatedBalances,
  };
}






export async function getLedgerEntriesByTransaction(
  transactionId: string,
) {
  return getLedgerEntriesByTransactionId(
    transactionId,
  );
}

export async function getLedgerEntriesByAccount(
  accountId: string,
) {
  return getLedgerEntriesByAccountId(
    accountId,
  );
}

export async function getLatestAccountLedgerEntry(
  accountId: string,
) {
  return getLatestLedgerEntry(accountId);
}