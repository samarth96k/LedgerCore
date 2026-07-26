import { prisma } from "../../PrismaClient/prismaclient.js";

import { TransactionStatus } from "@prisma/client";

import { TransactionEventType, Prisma } from "@prisma/client";

import type { CreateTransactionInput } from "./transaction.types.js";

export async function createTransaction({
  type,
  initiatorUserId,
  amount,
  currency = "INR",
  idempotencyKey,
  status = TransactionStatus.PENDING,
  lockingStrategy,
}: CreateTransactionInput) {
  return prisma.transaction.create({
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

export async function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
  failureReason?: string,
) {
  return prisma.transaction.update({
    where: {
      id: transactionId,
    },
    data: {
      status,
      failureReason: failureReason ?? null,
    },
  });
}

export async function markTransactionFailed(transactionId: string) {
  return updateTransactionStatus(transactionId, TransactionStatus.FAILED);
}

export async function markTransactionSuccessful(transactionId: string) {
  return updateTransactionStatus(transactionId, TransactionStatus.SUCCESS);
}
export async function markTransactionReversed(transactionId: string) {
  return updateTransactionStatus(transactionId, TransactionStatus.REVERSED);
}

export async function createTransactionEvent(
  transactionId: string,
  event: TransactionEventType,
  metadata?: Prisma.InputJsonValue,
) {
  return prisma.transactionEvent.create({
    data: {
      transactionId,
      event,
      ...(metadata !== undefined && { metadata }),
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
