import "dotenv/config";

import { reconciliationQueue } from "./reconciliation.queue.js";
import { ReconciliationJob } from "./reconciliation.types.js";

async function registerSchedulers() {
  console.log("[Scheduler] Registering reconciliation jobs...");

  // ============================================================
  // JOB 1 — PENDING SWEEPER
  // Every 1 minute
  // ============================================================

  await reconciliationQueue.upsertJobScheduler(
    "pending-sweeper-schedule",

    {
      every: 60_000,
    },

    {
      name: ReconciliationJob.PENDING_SWEEPER,

      data: {},

      opts: {
        attempts: 3,

        backoff: {
          type: "exponential",
          delay: 5_000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    },
  );

  // ============================================================
  // JOB 2 — LEDGER CONSISTENCY
  // Every 5 minutes
  // ============================================================

  await reconciliationQueue.upsertJobScheduler(
    "ledger-consistency-schedule",

    {
      every: 60_000 
      //5 * 60_000,
    },

    {
      name: ReconciliationJob.LEDGER_CONSISTENCY,

      data: {},

      opts: {
        attempts: 3,

        backoff: {
          type: "exponential",
          delay: 5_000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    },
  );

  // ============================================================
  // JOB 3 — ORPHAN DETECTOR
  // Every 5 minutes
  // ============================================================

  await reconciliationQueue.upsertJobScheduler(
    "orphan-detector-schedule",

    {
      every: 60_000
      //5 * 60_000,
    },

    {
      name: ReconciliationJob.ORPHAN_DETECTOR,

      data: {},

      opts: {
        attempts: 3,

        backoff: {
          type: "exponential",
          delay: 5_000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    },
  );

  // ============================================================
  // JOB 4 — IDEMPOTENCY CLEANUP
  // Every 24 hours
  // ============================================================

  await reconciliationQueue.upsertJobScheduler(
    "idempotency-cleanup-schedule",

    {
      every: 60_000
      //24 * 60 * 60_000,
    },

    {
      name: ReconciliationJob.IDEMPOTENCY_CLEANUP,

      data: {},

      opts: {
        attempts: 3,

        backoff: {
          type: "exponential",
          delay: 5_000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    },
  );

  // ============================================================
  // JOB 5 — ACCOUNT SANITY
  // Every 24 hours
  // ============================================================

  await reconciliationQueue.upsertJobScheduler(
    "account-sanity-schedule",

    {
      every: 60_000
      //24 * 60 * 60_000,
    },

    {
      name: ReconciliationJob.ACCOUNT_SANITY,

      data: {},

      opts: {
        attempts: 3,

        backoff: {
          type: "exponential",
          delay: 5_000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    },
  );

  console.log("[Scheduler] PENDING_SWEEPER       → every 1 minute");

  console.log("[Scheduler] LEDGER_CONSISTENCY    → every 5 minutes");

  console.log("[Scheduler] ORPHAN_DETECTOR       → every 5 minutes");

  console.log("[Scheduler] IDEMPOTENCY_CLEANUP   → every 24 hours");

  console.log("[Scheduler] ACCOUNT_SANITY        → every 24 hours");
}

registerSchedulers()
  .then(async () => {
    console.log("[Scheduler] Registration completed.");

    await reconciliationQueue.close();

    process.exit(0);
  })

  .catch(async (error) => {
    console.error("[Scheduler] Registration failed:", error);

    await reconciliationQueue.close();

    process.exit(1);
  });
