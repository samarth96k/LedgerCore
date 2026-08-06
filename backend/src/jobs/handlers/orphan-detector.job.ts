import {
  ReconciliationJobType,
} from "@prisma/client";

import {
  createRun,
  completeRun,
  failRun,
} from "../database/reconciliation-run.database.js";

import {
  getLastSuccessfulOrphanRun,
  countFinalizedTransactionsInWindow,
  findOrphanAnomaliesInWindow,
} from "../database/orphan-detector.database.js";


const BASELINE_START = new Date(0);
const ANOMALY_LIMIT = 100;


export async function runOrphanDetector() {

  // Find checkpoint BEFORE creating current run.
  const previousRun =
    await getLastSuccessfulOrphanRun();

  const windowStart =
    previousRun?.completedAt ?? BASELINE_START;

  // Freeze upper boundary.
  const windowEnd = new Date();


  const run = await createRun(
    ReconciliationJobType.ORPHAN_DETECTOR,
  );


  try {

    const itemsScanned =
      await countFinalizedTransactionsInWindow(
        windowStart,
        windowEnd,
      );


    const anomalies =
      await findOrphanAnomaliesInWindow(
        windowStart,
        windowEnd,
        ANOMALY_LIMIT,
      );


    const anomalyDetails =
      anomalies.map((anomaly) => ({
        transactionId:
          anomaly.transactionId,

        transactionStatus:
          anomaly.transactionStatus,

        ledgerEntryCount:
          anomaly.ledgerEntryCount.toString(),

        anomalyType:
          anomaly.anomalyType,
      }));


    const details = {
      mode:
        previousRun
          ? "INCREMENTAL"
          : "BASELINE",

      windowStart:
        windowStart.toISOString(),

      windowEnd:
        windowEnd.toISOString(),

      previousSuccessfulRunId:
        previousRun?.id ?? null,

      anomalies:
        anomalyDetails,
    };


    const metrics = {
      itemsScanned,

      anomaliesFound:
        anomalyDetails.length,

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