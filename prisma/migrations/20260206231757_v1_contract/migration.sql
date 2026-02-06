/*
  Warnings:

  - Added the required column `endTime` to the `OvertimeRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `OvertimeRequest` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OvertimeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "shift" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "requiredPeople" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_OvertimeRequest" ("createdAt", "date", "id", "requiredPeople", "shift", "status") SELECT "createdAt", "date", "id", "requiredPeople", "shift", "status" FROM "OvertimeRequest";
DROP TABLE "OvertimeRequest";
ALTER TABLE "new_OvertimeRequest" RENAME TO "OvertimeRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
