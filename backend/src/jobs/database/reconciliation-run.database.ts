import {
  ReconciliationJobType,
  ReconciliationRunStatus,
} from "@prisma/client";

import { prisma } from "../../PrismaClient/prismaclient.js";

export async function createRun(
  jobType: ReconciliationJobType,
  dryRun = false,
) {
  return prisma.reconciliationRun.create({
    data: {
      jobType,
      status: ReconciliationRunStatus.RUNNING,
      startedAt: new Date(),
      dryRun,
    },
  });
}

export async function completeRun(
  runId: string,
  {
    itemsScanned,
    anomaliesFound,
    details,
  }: {
    itemsScanned: number;
    anomaliesFound: number;
    details?: any;
  },
) {
  const completedAt = new Date();

  const run = await prisma.reconciliationRun.findUnique({
    where: { id: runId },
    select: { startedAt: true },
  });

  if (!run) {
    throw new Error(`Run ${runId} not found.`);
  }

  return prisma.reconciliationRun.update({
    where: {
      id: runId,
    },
    data: {
      status: ReconciliationRunStatus.SUCCESS,
      completedAt,
      durationMs:
        completedAt.getTime() - run.startedAt.getTime(),
      itemsScanned,
      anomaliesFound,
      details,
    },
  });
}

export async function markPartialSuccess(
  runId: string,
  {
    itemsScanned,
    anomaliesFound,
    details,
    errorMessage,
  }: {
    itemsScanned: number;
    anomaliesFound: number;
    details?: any;
    errorMessage: string;
  },
) {
  const completedAt = new Date();

  const run = await prisma.reconciliationRun.findUnique({
    where: { id: runId },
    select: { startedAt: true },
  });

  if (!run) {
    throw new Error(`Run ${runId} not found.`);
  }

  return prisma.reconciliationRun.update({
    where: {
      id: runId,
    },
    data: {
      status: ReconciliationRunStatus.PARTIAL_SUCCESS,
      completedAt,
      durationMs:
        completedAt.getTime() - run.startedAt.getTime(),
      itemsScanned,
      anomaliesFound,
      details,
      errorMessage,
    },
  });
}

export async function failRun(
  runId: string,
  error: Error,
) {
  const completedAt = new Date();

  const run = await prisma.reconciliationRun.findUnique({
    where: { id: runId },
    select: { startedAt: true },
  });

  if (!run) {
    throw new Error(`Run ${runId} not found.`);
  }

  return prisma.reconciliationRun.update({
    where: {
      id: runId,
    },
    data: {
      status: ReconciliationRunStatus.FAILED,
      completedAt,
      durationMs:
        completedAt.getTime() - run.startedAt.getTime(),
      errorMessage: error.message,
    },
  });
}