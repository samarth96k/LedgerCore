/*
  Warnings:

  - The values [STARTED,VALIDATED,COMMITTED,COMPLETED,FAILED,RETRIED] on the enum `TransactionEventType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `amount` on the `ledger_entries` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `BigInt`.
  - You are about to alter the column `balanceAfter` on the `ledger_entries` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `BigInt`.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TransactionEventType_new" AS ENUM ('PAYMENT_INITIATED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'PAYMENT_REVERSED', 'LOCK_ACQUIRED');
ALTER TABLE "transaction_events" ALTER COLUMN "event" TYPE "TransactionEventType_new" USING ("event"::text::"TransactionEventType_new");
ALTER TYPE "TransactionEventType" RENAME TO "TransactionEventType_old";
ALTER TYPE "TransactionEventType_new" RENAME TO "TransactionEventType";
DROP TYPE "public"."TransactionEventType_old";
COMMIT;

-- AlterTable
ALTER TABLE "ledger_entries" ALTER COLUMN "amount" SET DATA TYPE BIGINT,
ALTER COLUMN "balanceAfter" SET DATA TYPE BIGINT;
