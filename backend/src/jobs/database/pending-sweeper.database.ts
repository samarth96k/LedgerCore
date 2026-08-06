import { TransactionStatus,Prisma ,TransactionEventType,TransactionType,IdempotencyStatus} from "@prisma/client";
import { prisma } from "../../PrismaClient/prismaclient.js";

export async function findStalePendingTransactions(
  timeoutMinutes: number,
  batchSize: number,
) {
  const cutoff = new Date(
    Date.now() - timeoutMinutes * 60 * 1000,
  );

  return prisma.transaction.findMany({
    where: {
      status: TransactionStatus.PENDING,
      createdAt: {
        lt: cutoff,
      },
    },

    orderBy: {
      createdAt: "asc",
    },

    take: batchSize,

    select: {
      id: true,
      idempotencyKey: true,
      createdAt: true,
    },
  });
}

export async function tryMarkTransactionFailed(
  tx: Prisma.TransactionClient,
  transactionId: string,
) {
  const result = await tx.transaction.updateMany({
    where: {
      id: transactionId,
      status: TransactionStatus.PENDING,
    },

    data: {
      status: TransactionStatus.FAILED,

      failureReason: "PENDING_TIMEOUT",
    },
  });

  return result.count === 1;
}

export async function createFailureEvent(
  tx: Prisma.TransactionClient,
  transactionId: string,
) {
  return tx.transactionEvent.create({
    data: {
      transactionId,

      event: TransactionEventType.PAYMENT_FAILED,

      metadata: {
        source: "PendingSweeper",

        reason: "Timed out after 3 minutes",
      },
    },
  });
}
export async function completeFailedIdempotency(
  tx: Prisma.TransactionClient,
  idempotencyKey: string,
  transactionId: string,
) {
  return tx.idempotencyKey.updateMany({
    where: {
      key: idempotencyKey,

      status: IdempotencyStatus.IN_PROGRESS,
    },

    data: {
      status: IdempotencyStatus.COMPLETED,

      responseBody: {
        transactionId,

        status: "FAILED",
      },
    },
  });
}

export async function runInTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(callback);
}
export async function reconcilePendingTransaction(
  transactionId: string,
  idempotencyKey: string,
) {
  return prisma.$transaction(async (tx) => {

    const updated =
      await tryMarkTransactionFailed(
        tx,
        transactionId,
      );

    if (!updated) {
      return false;
    }

    await createFailureEvent(
      tx,
      transactionId,
    );

    await completeFailedIdempotency(
      tx,
      idempotencyKey,
      transactionId,
    );

    return true;
  });
}