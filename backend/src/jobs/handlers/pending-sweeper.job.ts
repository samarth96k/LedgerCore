import {
  ReconciliationJobType,
  Prisma,
} from "@prisma/client";

import {
  createRun,
  completeRun,
  failRun,
} from "../database/reconciliation-run.database.js";

import {
  findStalePendingTransactions,
  tryMarkTransactionFailed,
  createFailureEvent,
  completeFailedIdempotency,
  runInTransaction,
} from "../database/pending-sweeper.database.js";

const PENDING_TIMEOUT_MINUTES = 3;
const BATCH_SIZE = 100;

type PendingTransaction = {
  id: string;
  idempotencyKey: string;
  createdAt: Date;
};

type PendingSweeperMetrics = {
  itemsScanned: number;
  anomaliesFound: number;
  details: {
    transactionId: string;
    reason: string;
  }[];
};

async function processTransaction(
  transaction: PendingTransaction,
  metrics: PendingSweeperMetrics,
) {
  await runInTransaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tryMarkTransactionFailed(
      tx,
      transaction.id,
    );

    // Another sweeper already handled it.
    if (!updated) {
      return;
    }

    await createFailureEvent(
      tx,
      transaction.id,
    );

    await completeFailedIdempotency(
      tx,
      transaction.idempotencyKey,
      transaction.id,
    );

    metrics.anomaliesFound++;

    metrics.details.push({
      transactionId: transaction.id,
      reason: "PENDING_TIMEOUT",
    });
  });
}

export async function runPendingSweeper() {

  const run = await createRun(
    ReconciliationJobType.PENDING_SWEEPER,
  );

  const metrics: PendingSweeperMetrics = {
    itemsScanned: 0,
    anomaliesFound: 0,
    details: [],
  };

  try {

    const staleTransactions =
      await findStalePendingTransactions(
        3,
        100,
      );

    metrics.itemsScanned =
      staleTransactions.length;

    for (const transaction of staleTransactions) {

      await processTransaction(
        transaction,
        metrics,
      );

    }

    await completeRun(
      run.id,
      metrics,
    );

    return metrics;

  } catch (error) {

    await failRun(
      run.id,
      error as Error,
    );

    throw error;
  }
}