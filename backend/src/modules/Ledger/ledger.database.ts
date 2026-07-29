import { prisma } from "../../PrismaClient/prismaclient.js";
import { Prisma, TransactionEventType,EntryType ,AccountStatus,TransactionStatus} from "@prisma/client";
import type { LedgerEntryCreateInput,UpdatedBalance,PreparedJournal,PostJournalRequest,LockedAccount } from "./ledger.types.js";


//read
export async function getLedgerEntriesByTransactionId(transactionId: string) {
  return prisma.ledgerEntry.findMany({
    where: {
      transactionId,
    },
    include: {
      account: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getLedgerEntriesByAccountId(accountId: string) {
  return prisma.ledgerEntry.findMany({
    where: {
      accountId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getLatestLedgerEntry(accountId: string) {
  return prisma.ledgerEntry.findFirst({
    where: {
      accountId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

//write and update - uses tx

export async function createLedgerEntries(
  tx: Prisma.TransactionClient,
  entries: LedgerEntryCreateInput[],
) {
  const createdEntries = [];

  for (const entry of entries) {
    const createdEntry = await tx.ledgerEntry.create({
      data: {
        transactionId: entry.transactionId,
        accountId: entry.accountId,
        direction: entry.entryType,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
      },
    });

    createdEntries.push(createdEntry);
  }

  return createdEntries;
}

export async function loadAndLockAccounts(
  tx: Prisma.TransactionClient,
  accountIds: string[],
) {
  const uniqueSortedIds = [...new Set(accountIds)].sort();

  return tx.$queryRaw<
    LockedAccount[]
  >`
    SELECT
      a.id AS "accountId",
      a.status,
      a.currency,
      a.version,
      a."type" AS "accountType",
      ab."cachedBalance" AS "cachedBalance",
      ab."lastLedgerEntryId" AS "lastLedgerEntryId",
      ab."updatedAt" AS "updatedAt"

    FROM accounts a
    INNER JOIN account_balances ab
      ON a.id = ab."accountId"

    WHERE a.id = ANY(${uniqueSortedIds}::uuid[])

    ORDER BY a.id

    FOR UPDATE
  `;
}

export async function updateAccountBalances(
  tx: Prisma.TransactionClient,
  balances: {
    accountId: string;
    cachedBalance: bigint;
    lastLedgerEntryId?: string;
  }[],
) {
  for (const balance of balances) {
    const data: Prisma.AccountBalanceUpdateInput = {
      cachedBalance: balance.cachedBalance,
    };

    if (balance.lastLedgerEntryId !== undefined) {
      data.lastLedgerEntryId = balance.lastLedgerEntryId;
    }

    await tx.accountBalance.update({
      where: {
        accountId: balance.accountId,
      },
      data,
    });
  }
}
