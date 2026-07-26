/*
  Warnings:

  - Changed the type of `direction` on the `ledger_entries` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('DEBIT', 'CREDIT');

-- AlterTable
ALTER TABLE "ledger_entries" DROP COLUMN "direction",
ADD COLUMN     "direction" "EntryType" NOT NULL;

-- DropEnum
DROP TYPE "LedgerDirection";
