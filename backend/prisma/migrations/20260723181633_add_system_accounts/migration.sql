/*
  Warnings:

  - The values [SUSPENSE] on the enum `AccountType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "SystemAccountType" AS ENUM ('TREASURY', 'UPI_CLEARING', 'BANK_CLEARING', 'ATM_CLEARING', 'ADMIN_INITIATED', 'REFUND_ACCOUNT', 'FEE_REVENUE', 'SUSPENSE');

-- AlterEnum
BEGIN;
CREATE TYPE "AccountType_new" AS ENUM ('USER_WALLET', 'SYSTEM');
ALTER TABLE "accounts" ALTER COLUMN "type" TYPE "AccountType_new" USING ("type"::text::"AccountType_new");
ALTER TYPE "AccountType" RENAME TO "AccountType_old";
ALTER TYPE "AccountType_new" RENAME TO "AccountType";
DROP TYPE "public"."AccountType_old";
COMMIT;

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "systemType" "SystemAccountType";
