-- DropIndex
DROP INDEX "OvertimeApplication_userId_overtimeId_key";

-- AlterTable
ALTER TABLE "OvertimeApplication" ADD COLUMN "cancellationApprovedAt" DATETIME;
ALTER TABLE "OvertimeApplication" ADD COLUMN "cancellationApprovedById" TEXT;
ALTER TABLE "OvertimeApplication" ADD COLUMN "cancellationRequestedAt" DATETIME;
ALTER TABLE "OvertimeApplication" ADD COLUMN "cancellationRequestedReason" TEXT;

-- CreateIndex
CREATE INDEX "OvertimeApplication_userId_overtimeId_idx" ON "OvertimeApplication"("userId", "overtimeId");
