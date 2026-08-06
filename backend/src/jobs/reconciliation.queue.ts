import { Queue } from "bullmq";

import { redisConnection } from "./config/redis.js";

export const RECONCILIATION_QUEUE_NAME = "reconciliation";

export const reconciliationQueue = new Queue(
  RECONCILIATION_QUEUE_NAME,
  {
    connection: redisConnection,
  },
);