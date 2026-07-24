/*
  Warnings:

  - A unique constraint covering the columns `[aadhaarNumber]` on the table `accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "aadhaarNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "accounts_aadhaarNumber_key" ON "accounts"("aadhaarNumber");
