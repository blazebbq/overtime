/*
  Warnings:

  - You are about to drop the column `shift` on the `OvertimeRequest` table. All the data in the column will be lost.
  - Added the required column `areaId` to the `OvertimeRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shiftColourId` to the `OvertimeRequest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ShiftColour" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hexColor" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AreaShiftColour" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaId" TEXT NOT NULL,
    "shiftColourId" TEXT NOT NULL,
    CONSTRAINT "AreaShiftColour_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AreaShiftColour_shiftColourId_fkey" FOREIGN KEY ("shiftColourId") REFERENCES "ShiftColour" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShiftPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cycleLength" INTEGER NOT NULL,
    "patternData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserShiftPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "shiftPatternId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserShiftPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserShiftPattern_shiftPatternId_fkey" FOREIGN KEY ("shiftPatternId") REFERENCES "ShiftPattern" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ManagerAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "managerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "areaId" TEXT,
    "shiftColourId" TEXT,
    CONSTRAINT "ManagerAssignment_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ManagerAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ManagerAssignment_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ManagerAssignment_shiftColourId_fkey" FOREIGN KEY ("shiftColourId") REFERENCES "ShiftColour" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OvertimeApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "overtimeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "workedAsScheduled" BOOLEAN NOT NULL DEFAULT true,
    "actualStartTime" TEXT,
    "actualEndTime" TEXT,
    "comment" TEXT,
    "breachWarning" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OvertimeApproval_overtimeId_fkey" FOREIGN KEY ("overtimeId") REFERENCES "OvertimeRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "affectedUserId" TEXT,
    "changes" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_affectedUserId_fkey" FOREIGN KEY ("affectedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "overtimeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_overtimeId_fkey" FOREIGN KEY ("overtimeId") REFERENCES "OvertimeRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("createdAt", "id", "overtimeId", "userId") SELECT "createdAt", "id", "overtimeId", "userId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_userId_overtimeId_key" ON "Booking"("userId", "overtimeId");
CREATE TABLE "new_OvertimeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "areaId" TEXT NOT NULL,
    "shiftColourId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "requiredPeople" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OvertimeRequest_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OvertimeRequest_shiftColourId_fkey" FOREIGN KEY ("shiftColourId") REFERENCES "ShiftColour" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OvertimeRequest" ("createdAt", "date", "endTime", "id", "requiredPeople", "startTime", "status") SELECT "createdAt", "date", "endTime", "id", "requiredPeople", "startTime", "status" FROM "OvertimeRequest";
DROP TABLE "OvertimeRequest";
ALTER TABLE "new_OvertimeRequest" RENAME TO "OvertimeRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Area_name_key" ON "Area"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftColour_name_key" ON "ShiftColour"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AreaShiftColour_areaId_shiftColourId_key" ON "AreaShiftColour"("areaId", "shiftColourId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftPattern_name_key" ON "ShiftPattern"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserShiftPattern_userId_key" ON "UserShiftPattern"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerAssignment_managerId_userId_areaId_shiftColourId_key" ON "ManagerAssignment"("managerId", "userId", "areaId", "shiftColourId");

-- CreateIndex
CREATE UNIQUE INDEX "OvertimeApproval_overtimeId_userId_key" ON "OvertimeApproval"("overtimeId", "userId");
