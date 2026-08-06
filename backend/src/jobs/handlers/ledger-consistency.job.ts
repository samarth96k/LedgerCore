import {
  ReconciliationJobType,
} from "@prisma/client";

import {
  createRun,
  completeRun,
  failRun,
} from "../database/reconciliation-run.database.js";

import {
  getLastSuccessfulLedgerConsistencyRun,
  findAccountsWithLedgerActivity,
  checkCurrentLedgerConsistency,
  getLedgerWindowSummary,
  getLedgerEntriesForWindow,
} from "../database/ledger-consistency.database.js";


// For the first ever run.
// We'll inspect all ledger activity from the beginning.
const BASELINE_START = new Date(0);


export async function runLedgerConsistency() {

  // ----------------------------------------------------------
  // 1. FIND PREVIOUS SUCCESSFUL RUN
  // ----------------------------------------------------------

  const previousRun =
    await getLastSuccessfulLedgerConsistencyRun();

  const windowStart =
    previousRun?.completedAt ?? BASELINE_START;

  /*
   * Freeze the upper boundary BEFORE starting the reconciliation.
   *
   * Anything committed after this timestamp belongs to the next run.
   */
  const windowEnd = new Date();


  // ----------------------------------------------------------
  // 2. CREATE AUDIT RUN
  // ----------------------------------------------------------

  const run = await createRun(
    ReconciliationJobType.LEDGER_CONSISTENCY,
  );


  try {

    // --------------------------------------------------------
    // 3. FIND ACCOUNTS WITH LEDGER ACTIVITY IN THIS WINDOW
    //
    // Windowing is ONLY used for scope.
    // --------------------------------------------------------

    const accountIds =
      await findAccountsWithLedgerActivity(
        windowStart,
        windowEnd,
      );


    // --------------------------------------------------------
    // 4. CHECK CURRENT STATE
    //
    // cachedBalance and latest ledger balanceAfter are read
    // by ONE SQL statement inside this function.
    // --------------------------------------------------------

    const consistencyRows =
      await checkCurrentLedgerConsistency(
        accountIds,
      );


    // --------------------------------------------------------
    // 5. FIND ACTUAL DRIFTS
    // --------------------------------------------------------

    const driftedAccounts =
      consistencyRows.filter(
        (row) =>
          row.cachedBalance !==
          row.ledgerBalance,
      );


    // --------------------------------------------------------
    // 6. COLLECT DIAGNOSTICS ONLY FOR DRIFTED ACCOUNTS
    // --------------------------------------------------------

    const anomalies = [];

    for (const drift of driftedAccounts) {

      const summary =
        await getLedgerWindowSummary(
          drift.accountId,
          windowStart,
          windowEnd,
        );

      const entries =
        await getLedgerEntriesForWindow(
          drift.accountId,
          windowStart,
          windowEnd,
        );


      /*
       * Prisma BigInt cannot be stored directly inside JSON.
       * Convert monetary values to strings.
       */

      anomalies.push({
        accountId: drift.accountId,

        cachedBalance:
          drift.cachedBalance.toString(),

        ledgerBalance:
          drift.ledgerBalance.toString(),

        drift:
          (
            drift.cachedBalance -
            drift.ledgerBalance
          ).toString(),

        creditsInWindow:
          summary?.credits.toString() ?? "0",

        debitsInWindow:
          summary?.debits.toString() ?? "0",

        ledgerEntries: entries.map(
          (entry) => ({
            id: entry.id,
            transactionId:
              entry.transactionId,

            direction:
              entry.direction,

            amount:
              entry.amount.toString(),

            balanceAfter:
              entry.balanceAfter.toString(),

            createdAt:
              entry.createdAt.toISOString(),
          }),
        ),
      });
    }


    // --------------------------------------------------------
    // 7. BUILD AUDIT DETAILS
    // --------------------------------------------------------

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

      anomalies,
    };


    // --------------------------------------------------------
    // 8. COMPLETE RECONCILIATION RUN
    // --------------------------------------------------------

    const metrics = {
      itemsScanned:
        consistencyRows.length,

      anomaliesFound:
        anomalies.length,

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