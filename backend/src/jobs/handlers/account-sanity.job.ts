import {
  ReconciliationJobType,
} from "@prisma/client";

import {
  createRun,
  completeRun,
  failRun,
} from "../database/reconciliation-run.database.js";

import {
  countAccountBalances,
  findAccountSanityAnomalies,
} from "../database/account-sanity.database.js";


const ANOMALY_LIMIT = 100;


export async function runAccountSanity() {

  const run = await createRun(
    ReconciliationJobType.ACCOUNT_SANITY,
  );


  try {

    const itemsScanned =
      await countAccountBalances();


    const anomalies =
      await findAccountSanityAnomalies(
        ANOMALY_LIMIT,
      );


    const details = {
      anomalies,
    };


    const metrics = {
      itemsScanned,

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