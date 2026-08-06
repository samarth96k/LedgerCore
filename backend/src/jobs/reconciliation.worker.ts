import "dotenv/config";

import { Worker } from "bullmq";

import { redisConnection } from "./config/redis.js";
import { RECONCILIATION_QUEUE_NAME } from "./reconciliation.queue.js";
import { ReconciliationJob } from "./reconciliation.types.js";

import { runPendingSweeper } from "./handlers/pending-sweeper.job.js";
import { runLedgerConsistency } from "./handlers/ledger-consistency.job.js";
import { runOrphanDetector } from "./handlers/orphan-detector.job.js";
import { runIdempotencyCleanup } from "./handlers/idempotency-cleanup.job.js";
import { runAccountSanity } from "./handlers/account-sanity.job.js";

// Keep YOUR existing logger import path here.
import { logger } from "../../src/common/config/logger.js";


const reconciliationWorker = new Worker(
  RECONCILIATION_QUEUE_NAME,

  async (job) => {
    logger.info(
      `[Worker] Received ${job.name} | Job ID: ${job.id}`,
    );

    switch (job.name) {
      case ReconciliationJob.PENDING_SWEEPER:
        return runPendingSweeper();

      case ReconciliationJob.LEDGER_CONSISTENCY:
        return runLedgerConsistency();

      case ReconciliationJob.ORPHAN_DETECTOR:
        return runOrphanDetector();

      case ReconciliationJob.IDEMPOTENCY_CLEANUP:
        return runIdempotencyCleanup();

      case ReconciliationJob.ACCOUNT_SANITY:
        return runAccountSanity();

      default:
        throw new Error(
          `Unknown reconciliation job: ${job.name}`,
        );
    }
  },

  {
    connection: redisConnection,

    // This worker can execute at most 3 jobs concurrently.
    concurrency: 3,
  },
);


// ------------------------------------------------------------
// WORKER READY
// ------------------------------------------------------------

reconciliationWorker.on("ready", () => {
  logger.info(
    "[Worker] Reconciliation worker ready",
  );
});


// ------------------------------------------------------------
// JOB COMPLETED
// ------------------------------------------------------------

reconciliationWorker.on(
  "completed",
  (job, result) => {

    logger.info(
      `[Worker] Completed ${job.name} | Job ID: ${job.id}`,
    );

    /*
     * Log the complete result returned by the reconciliation
     * handler.
     *
     * JSON.stringify is used because our logger accepts
     * a string rather than a separate metadata object.
     */
    logger.info(
      `[Worker] Result ${job.name} | Job ID: ${job.id}\n` +
      JSON.stringify(result, null, 2),
    );
  },
);


// ------------------------------------------------------------
// JOB FAILED
// ------------------------------------------------------------

reconciliationWorker.on(
  "failed",
  (job, error) => {

    logger.error(
      `[Worker] Failed ${job?.name ?? "UNKNOWN"} | ` +
      `Job ID: ${job?.id ?? "UNKNOWN"} | ` +
      `Error: ${error.message}\n` +
      `${error.stack ?? ""}`,
    );
  },
);


// ------------------------------------------------------------
// WORKER / REDIS ERROR
// ------------------------------------------------------------

reconciliationWorker.on(
  "error",
  (error) => {

    logger.error(
      `[Worker] BullMQ worker error | ` +
      `Error: ${error.message}\n` +
      `${error.stack ?? ""}`,
    );
  },
);


// ------------------------------------------------------------
// WORKER STARTUP
// ------------------------------------------------------------

logger.info(
  `[Worker] Starting reconciliation worker | ` +
  `Queue: ${RECONCILIATION_QUEUE_NAME} | ` +
  `Concurrency: 3`,
);