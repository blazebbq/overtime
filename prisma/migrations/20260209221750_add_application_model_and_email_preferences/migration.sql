-- AlterTable
ALTER TABLE "User" ADD COLUMN "secondaryEmail" TEXT;

-- CreateTable
CREATE TABLE "OvertimeApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "overtimeId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "requestedStartTime" TEXT,
    "requestedEndTime" TEXT,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedStartTime" TEXT,
    "approvedEndTime" TEXT,
    "approverId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OvertimeApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OvertimeApplication_overtimeId_fkey" FOREIGN KEY ("overtimeId") REFERENCES "OvertimeRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OvertimeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "areaId" TEXT NOT NULL,
    "shiftColourId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "requiredPeople" INTEGER NOT NULL,
    "approvedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OvertimeRequest_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OvertimeRequest_shiftColourId_fkey" FOREIGN KEY ("shiftColourId") REFERENCES "ShiftColour" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OvertimeRequest" ("areaId", "createdAt", "date", "endTime", "id", "requiredPeople", "shiftColourId", "startTime", "status") SELECT "areaId", "createdAt", "date", "endTime", "id", "requiredPeople", "shiftColourId", "startTime", "status" FROM "OvertimeRequest";
DROP TABLE "OvertimeRequest";
ALTER TABLE "new_OvertimeRequest" RENAME TO "OvertimeRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OvertimeApplication_overtimeId_status_idx" ON "OvertimeApplication"("overtimeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OvertimeApplication_userId_overtimeId_key" ON "OvertimeApplication"("userId", "overtimeId");
