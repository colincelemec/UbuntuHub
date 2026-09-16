/*
  Warnings:

  - You are about to drop the `business_claims` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "business_claims" DROP CONSTRAINT "business_claims_business_id_fkey";

-- DropForeignKey
ALTER TABLE "business_claims" DROP CONSTRAINT "business_claims_user_id_fkey";

-- DropTable
DROP TABLE "business_claims";

-- DropEnum
DROP TYPE "ClaimStatus";
