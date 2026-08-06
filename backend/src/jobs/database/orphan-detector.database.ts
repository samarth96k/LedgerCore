import {
  ReconciliationJobType,
  ReconciliationRunStatus,
  TransactionStatus,
} from "@prisma/client";

import { prisma } from "../../PrismaClient/prismaclient.js";


export type OrphanAnomaly = {
  transactionId: string;
  transactionStatus: string;
  ledgerEntryCount: bigint;
  anomalyType:
    | "SUCCESS_WITHOUT_LEDGER"
    | "FAILED_WITH_LEDGER";
};


// ------------------------------------------------------------
// LAST SUCCESSFUL ORPHAN DETECTOR RUN
// ------------------------------------------------------------

export async function getLastSuccessfulOrphanRun() {
  return prisma.reconciliationRun.findFirst({
    where: {
      jobType: ReconciliationJobType.ORPHAN_DETECTOR,
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


// ------------------------------------------------------------
// COUNT TRANSACTIONS IN CURRENT WINDOW
// ------------------------------------------------------------

export async function countFinalizedTransactionsInWindow(
  windowStart: Date,
  windowEnd: Date,
): Promise<number> {

  return prisma.transaction.count({
    where: {
      status: {
        in: [
          TransactionStatus.SUCCESS,
          TransactionStatus.FAILED,
        ],
      },

      updatedAt: {
        gt: windowStart,
        lte: windowEnd,
      },
    },
  });
}


// ------------------------------------------------------------
// FIND ORPHANS IN CURRENT WINDOW
// ------------------------------------------------------------

export async function findOrphanAnomaliesInWindow(
  windowStart: Date,
  windowEnd: Date,
  limit = 100,
): Promise<OrphanAnomaly[]> {

  return prisma.$queryRaw<OrphanAnomaly[]>`
    SELECT
      t.id AS "transactionId",

      t.status::text AS "transactionStatus",

      COUNT(le.id)::bigint AS "ledgerEntryCount",

      CASE
        WHEN t.status::text = 'SUCCESS'
             AND COUNT(le.id) = 0
          THEN 'SUCCESS_WITHOUT_LEDGER'

        WHEN t.status::text = 'FAILED'
             AND COUNT(le.id) > 0
          THEN 'FAILED_WITH_LEDGER'
      END AS "anomalyType"

    FROM transactions t

    LEFT JOIN ledger_entries le
      ON le."transactionId" = t.id

    WHERE
      t.status::text IN ('SUCCESS', 'FAILED')

      AND t."updatedAt" > ${windowStart}

      AND t."updatedAt" <= ${windowEnd}

    GROUP BY
      t.id,
      t.status

    HAVING
      (
        t.status::text = 'SUCCESS'
        AND COUNT(le.id) = 0
      )

      OR

      (
        t.status::text = 'FAILED'
        AND COUNT(le.id) > 0
      )

    ORDER BY t."updatedAt" DESC

    LIMIT ${limit};
  `;
}