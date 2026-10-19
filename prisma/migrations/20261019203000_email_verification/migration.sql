-- AlterTable
ALTER TABLE "AccountRequest" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "inviteCodeId" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "verificationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "verificationTokenHash" TEXT,
ALTER COLUMN "status" SET DEFAULT 'UNVERIFIED';

-- CreateIndex
CREATE UNIQUE INDEX "AccountRequest_verificationTokenHash_key" ON "AccountRequest"("verificationTokenHash");

-- CreateIndex
CREATE INDEX "AccountRequest_inviteCodeId_idx" ON "AccountRequest"("inviteCodeId");
