/*
  Warnings:

  - You are about to alter the column `cachedBalance` on the `account_balances` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `BigInt`.

*/
-- AlterTable
ALTER TABLE "account_balances" ALTER COLUMN "cachedBalance" SET DEFAULT 0,
ALTER COLUMN "cachedBalance" SET DATA TYPE BIGINT;
