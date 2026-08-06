import {
  ReconciliationJobType,
} from "@prisma/client";

import { prisma } from "../../PrismaClient/prismaclient.js";

import {
  createRun,
  completeRun,
  failRun,
} from "../database/reconciliation-run.database.js";

import {
  countExpiredIdempotencyKeys,
  deleteExpiredIdempotencyKeys,
} from "../database/idempotency-cleanup.database.js";


export async function runIdempotencyCleanup() {

  const run = await createRun(
    ReconciliationJobType.IDEMPOTENCY_CLEANUP,
  );

  /*
   * Freeze the cutoff.
   *
   * Both our count and delete operate against the exact
   * same expiration boundary.
   */
  const cutoff = new Date();


  try {

    const result = await prisma.$transaction(
      async (tx) => {

        /*
         * Count INSIDE the transaction.
         *
         * Don't call the earlier global-prisma count function
         * here because we want the cleanup operation scoped
         * through tx.
         */

        const itemsScanned =
          await tx.idempotencyKey.count({
            where: {
              expiresAt: {
                lt: cutoff,
              },

              status: {
                in: [
                  "COMPLETED",
                  "FAILED",
                ],
              },
            },
          });


        const deleted =
          await deleteExpiredIdempotencyKeys(
            tx,
            cutoff,
          );


        return {
          itemsScanned,
          deletedCount: deleted.count,
        };
      },
    );


    const details = {
      cutoff:
        cutoff.toISOString(),

      deletedCount:
        result.deletedCount,
    };


    const metrics = {
      itemsScanned:
        result.itemsScanned,

      /*
       * Expired records are expected housekeeping,
       * NOT financial anomalies.
       */
      anomaliesFound: 0,

      details,
    };


    await completeRun(
      run.id,
      metrics,
    );


    return metrics;

  } catch (error) {

    const normalizedError =
      error instanceof Error
        ? error
        : new Error(String(error));


    await failRun(
      run.id,
      normalizedError,
    );


    throw normalizedError;
  }
}   