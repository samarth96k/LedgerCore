import {
  IdempotencyStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../PrismaClient/prismaclient.js";


// The type lets us use either the normal Prisma client
// or the transaction-scoped tx client.
type DbClient =
  | typeof prisma
  | Prisma.TransactionClient;


/*
|--------------------------------------------------------------------------
| COUNT EXPIRED TERMINAL KEYS
|--------------------------------------------------------------------------
*/

export async function countExpiredIdempotencyKeys(
  cutoff: Date,
): Promise<number> {

  return prisma.idempotencyKey.count({
    where: {
      expiresAt: {
        lt: cutoff,
      },

      status: {
        in: [
          IdempotencyStatus.COMPLETED,
          IdempotencyStatus.FAILED,
        ],
      },
    },
  });
}


/*
|--------------------------------------------------------------------------
| DELETE EXPIRED TERMINAL KEYS
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Accept tx instead of using global prisma.
|
*/

export async function deleteExpiredIdempotencyKeys(
  tx: DbClient,
  cutoff: Date,
) {

  return tx.idempotencyKey.deleteMany({
    where: {
      expiresAt: {
        lt: cutoff,
      },

      status: {
        in: [
          IdempotencyStatus.COMPLETED,
          IdempotencyStatus.FAILED,
        ],
      },
    },
  });
}