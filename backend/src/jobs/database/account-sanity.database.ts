import { prisma } from "../../PrismaClient/prismaclient.js";

export type AccountSanityAnomaly = {
  accountId: string;
  lastLedgerEntryId: string | null;
  actualLatestLedgerEntryId: string | null;

  anomalyType:
    | "BROKEN_POINTER"
    | "POINTER_WRONG_ACCOUNT"
    | "STALE_POINTER";
};


export async function findAccountSanityAnomalies(
  limit = 100,
): Promise<AccountSanityAnomaly[]> {

  return prisma.$queryRaw<AccountSanityAnomaly[]>`
    SELECT
      ab."accountId" AS "accountId",

      ab."lastLedgerEntryId" AS "lastLedgerEntryId",

      latest.id AS "actualLatestLedgerEntryId",

      CASE

        -- Pointer exists but referenced ledger entry doesn't.
        WHEN ab."lastLedgerEntryId" IS NOT NULL
             AND pointed.id IS NULL
          THEN 'BROKEN_POINTER'


        -- Pointer exists, but points to another account's entry.
        WHEN pointed.id IS NOT NULL
             AND pointed."accountId" <> ab."accountId"
          THEN 'POINTER_WRONG_ACCOUNT'


        -- Pointer belongs to this account, but isn't latest.
        WHEN pointed.id IS NOT NULL
             AND pointed."accountId" = ab."accountId"
             AND latest.id IS NOT NULL
             AND pointed.id <> latest.id
          THEN 'STALE_POINTER'

      END AS "anomalyType"

    FROM account_balances ab


    -- Resolve whatever lastLedgerEntryId currently points to.
    LEFT JOIN ledger_entries pointed
      ON pointed.id = ab."lastLedgerEntryId"


    -- Independently determine the actual latest ledger entry.
    LEFT JOIN LATERAL (

      SELECT
        le.id

      FROM ledger_entries le

      WHERE le."accountId" = ab."accountId"

      ORDER BY
        le."createdAt" DESC,
        le.id DESC

      LIMIT 1

    ) latest ON TRUE


    WHERE

      (
        ab."lastLedgerEntryId" IS NOT NULL
        AND pointed.id IS NULL
      )

      OR

      (
        pointed.id IS NOT NULL
        AND pointed."accountId" <> ab."accountId"
      )

      OR

      (
        pointed.id IS NOT NULL
        AND pointed."accountId" = ab."accountId"
        AND latest.id IS NOT NULL
        AND pointed.id <> latest.id
      )

    LIMIT ${limit};
  `;
}


export async function countAccountBalances(): Promise<number> {

  return prisma.accountBalance.count();

}