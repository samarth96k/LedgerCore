import { prisma } from "../../PrismaClient/prismaclient.js";
import { TransactionStatus } from "@prisma/client";
import { TransactionEventType, Prisma } from "@prisma/client";
import type { CreateTransactionInput } from "./transaction.types.js";

//read functions so they do not require transaction parameter from payment module
export async function getTransactionById(transactionId: string) {
  return prisma.transaction.findUnique({
    where: {
      id: transactionId,
    },
    include: {
      ledgerEntries: {
        include: {
          account: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      events: true,
      initiator: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

export async function getTransactionByIdempotencyKey(idempotencyKey: string) {
  return prisma.transaction.findUnique({
    where: {
      idempotencyKey,
    },
  });
}

export async function getTransactionEvents(transactionId: string) {
  return prisma.transactionEvent.findMany({
    where: {
      transactionId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getTransactionsByUserId(userId: string) {
  return prisma.transaction.findMany({
    where: {
      initiatorUserId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getTransactionsByStatus(status: TransactionStatus) {
  return prisma.transaction.findMany({
    where: {
      status,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getRecentTransactions(limit = 20) {
  return prisma.transaction.findMany({
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
  });
}


//write functions tx required to mantAin atomicity

export async function createTransaction(
  tx: Prisma.TransactionClient,
  {
    type,
    initiatorUserId,
    amount,
    currency = "INR",
    idempotencyKey,
    status = TransactionStatus.PENDING,
    lockingStrategy,
  }: CreateTransactionInput,
) {
  return tx.transaction.create({
    data: {
      type,
      initiatorUserId,
      amount,
      currency,
      idempotencyKey,
      status,
      lockingStrategy,
    },
  });
}




export async function updateTransactionStatus(
  tx: Prisma.TransactionClient,
  transactionId: string,
  status: TransactionStatus,
  failureReason?: string,
) {
  return tx.transaction.update({
    where: {
      id: transactionId,
    },
    data: {
      status,
      failureReason: failureReason ?? null,
    },
  });
}

export async function markTransactionFailed(
  tx: Prisma.TransactionClient,
  transactionId: string,
  failureReason: string,
) {
  return tx.transaction.updateMany({
    where: {
      id: transactionId,
      status: TransactionStatus.PENDING,
    },
    data: {
      status: TransactionStatus.FAILED,
      failureReason,
    },
  });
}

export async function markTransactionSuccessful(
  tx: Prisma.TransactionClient,
  transactionId: string,
) {
  return updateTransactionStatus(
    tx,
    transactionId,
    TransactionStatus.SUCCESS,
  );
}

export async function markTransactionReversed(
  tx: Prisma.TransactionClient,
  transactionId: string,
) {
  return updateTransactionStatus(
    tx,
    transactionId,
    TransactionStatus.REVERSED,
  );
}

export async function createTransactionEvent(
  tx:Prisma.TransactionClient,
  transactionId: string,
  event: TransactionEventType,
  metadata?: Prisma.InputJsonValue,
) {
  return tx.transactionEvent.create({
    data: {
      transactionId,
      event,
      ...(metadata !== undefined && { metadata }),
    },
  });
}
