-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OvertimeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "areaId" TEXT NOT NULL,
    "shiftColourId" TEXT NOT NULL,
    "areaShiftColourId" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "requiredPeople" INTEGER NOT NULL,
    "approvedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OvertimeRequest_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OvertimeRequest_shiftColourId_fkey" FOREIGN KEY ("shiftColourId") REFERENCES "ShiftColour" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OvertimeRequest_areaShiftColourId_fkey" FOREIGN KEY ("areaShiftColourId") REFERENCES "AreaShiftColour" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OvertimeRequest" ("approvedCount", "areaId", "createdAt", "date", "endTime", "id", "requiredPeople", "shiftColourId", "startTime", "status") SELECT "approvedCount", "areaId", "createdAt", "date", "endTime", "id", "requiredPeople", "shiftColourId", "startTime", "status" FROM "OvertimeRequest";
DROP TABLE "OvertimeRequest";
ALTER TABLE "new_OvertimeRequest" RENAME TO "OvertimeRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
