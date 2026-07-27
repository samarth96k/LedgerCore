import { Prisma,IdempotencyStatus } from "@prisma/client";
export async function getIdempotencyByKeyTx(
  tx: Prisma.TransactionClient,
  key: string,
) {
  return tx.idempotencyKey.findUnique({
    where: {
      key,
    },
  });
}

export async function createIdempotencyReservationTx(
  tx: Prisma.TransactionClient,
  key: string,
  requestHash: string,
  expiresAt: Date,
) {
  return tx.idempotencyKey.create({
    data: {
      key,
      requestHash,
      status: IdempotencyStatus.IN_PROGRESS,
      expiresAt,
    },
  });
}

export async function completeIdempotencyTx(
  tx: Prisma.TransactionClient,
  key: string,
  responseBody: Prisma.InputJsonValue,
) {
  return tx.idempotencyKey.updateMany({
    where: {
      key,
      status: IdempotencyStatus.IN_PROGRESS,
    },
    data: {
      status: IdempotencyStatus.COMPLETED,
      responseBody,
    },
  });
}

export async function failIdempotencyTx(
  tx: Prisma.TransactionClient,
  key: string,
) {
  return tx.idempotencyKey.updateMany({
    where: {
      key,
      status: IdempotencyStatus.IN_PROGRESS,
    },
    data: {
      status: IdempotencyStatus.FAILED,
    },
  });
}