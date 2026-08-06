import {
  ReconciliationJobType,
  ReconciliationRunStatus,
} from "@prisma/client";

import { prisma } from "../../PrismaClient/prismaclient.js";


export type LedgerConsistencyRow = {
  accountId: string;
  cachedBalance: bigint;
  ledgerBalance: bigint;
};


export type LedgerWindowSummary = {
  accountId: string;
  credits: bigint;
  debits: bigint;
};


/*
|--------------------------------------------------------------------------
| GET LAST SUCCESSFUL LEDGER CONSISTENCY RUN
|--------------------------------------------------------------------------
|
| We only use this timestamp for SCOPING which accounts changed.
|
| If the previous run FAILED, we deliberately ignore it and go back to
| the last SUCCESSFUL run so no reconciliation window is skipped.
|
*/

export async function getLastSuccessfulLedgerConsistencyRun() {
  return prisma.reconciliationRun.findFirst({
    where: {
      jobType: ReconciliationJobType.LEDGER_CONSISTENCY,
      status: ReconciliationRunStatus.SUCCESS,
      completedAt: {
        not: null,
      },
    },

    orderBy: {
      completedAt: "desc",
    },

    select: {
      id: true,
      completedAt: true,
    },
  });
}


/*
|--------------------------------------------------------------------------
| FIND ACCOUNTS THAT CHANGED IN THE WINDOW
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| The window is ONLY an optimization.
|
| It answers:
|     "Which accounts should we check?"
|
| It does NOT determine the actual financial truth.
|
*/

export async function findAccountsWithLedgerActivity(
  windowStart: Date,
  windowEnd: Date,
): Promise<string[]> {

  const rows = await prisma.ledgerEntry.findMany({
    where: {
      createdAt: {
        gt: windowStart,
        lte: windowEnd,
      },
    },

    distinct: ["accountId"],

    select: {
      accountId: true,
    },
  });

  return rows.map((row) => row.accountId);
}

/*
|--------------------------------------------------------------------------
| CHECK CURRENT LEDGER CONSISTENCY
|--------------------------------------------------------------------------
|
| This is the actual invariant:
|
|     account_balances.cachedBalance
|
|                  VS
|
|     latest ledger_entries.balanceAfter
|
|
| Both values are read in ONE SQL statement.
|
| This avoids:
|
| Query cached balance
|        ↓
| payment commits here
|        ↓
| Query ledger balance
|
| which could create a false-positive drift.
|
*/

export async function checkCurrentLedgerConsistency(
  accountIds: string[],
): Promise<LedgerConsistencyRow[]> {

  if (accountIds.length === 0) {
    return [];
  }

  return prisma.$queryRaw<LedgerConsistencyRow[]>`
    SELECT
      ab."accountId" AS "accountId",
      ab."cachedBalance" AS "cachedBalance",
      latest."balanceAfter" AS "ledgerBalance"

    FROM account_balances ab

    JOIN LATERAL (
      SELECT
        le."balanceAfter"

      FROM ledger_entries le

      WHERE le."accountId" = ab."accountId"

      ORDER BY
        le."createdAt" DESC,
        le.id DESC

      LIMIT 1
    ) latest ON TRUE

    WHERE ab."accountId" IN (
      SELECT UNNEST(${accountIds}::uuid[])
    );
  `;
}

export async function getLedgerWindowSummary(
  accountId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<LedgerWindowSummary | null> {

  const rows = await prisma.$queryRaw<LedgerWindowSummary[]>`
    SELECT
      le."accountId" AS "accountId",

      COALESCE(
        SUM(le.amount)
        FILTER (WHERE le.direction = 'CREDIT'),
        0
      )::bigint AS credits,

      COALESCE(
        SUM(le.amount)
        FILTER (WHERE le.direction = 'DEBIT'),
        0
      )::bigint AS debits

    FROM ledger_entries le

    WHERE le."accountId" = ${accountId}::uuid

      AND le."createdAt" > ${windowStart}

      AND le."createdAt" <= ${windowEnd}

    GROUP BY le."accountId";
  `;

  return rows[0] ?? null;
}

export async function getLedgerEntriesForWindow(
  accountId: string,
  windowStart: Date,
  windowEnd: Date,
) {

  return prisma.ledgerEntry.findMany({
    where: {
      accountId,

      createdAt: {
        gt: windowStart,
        lte: windowEnd,
      },
    },

    select: {
      id: true,
      transactionId: true,
      direction: true,
      amount: true,
      balanceAfter: true,
      createdAt: true,
    },

    orderBy: {
      createdAt: "asc",
    },
  });
}