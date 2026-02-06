/*
  Warnings:

  - You are about to drop the column `overtimeRequestId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `unbookedLate` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `requiredCount` on the `OvertimeRequest` table. All the data in the column will be lost.
  - You are about to drop the column `shiftColor` on the `OvertimeRequest` table. All the data in the column will be lost.
  - Added the required column `overtimeId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requiredPeople` to the `OvertimeRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shift` to the `OvertimeRequest` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "overtimeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_overtimeId_fkey" FOREIGN KEY ("overtimeId") REFERENCES "OvertimeRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("createdAt", "id", "userId") SELECT "createdAt", "id", "userId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_userId_overtimeId_key" ON "Booking"("userId", "overtimeId");
CREATE TABLE "new_OvertimeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "shift" TEXT NOT NULL,
    "requiredPeople" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_OvertimeRequest" ("createdAt", "date", "id") SELECT "createdAt", "date", "id" FROM "OvertimeRequest";
DROP TABLE "OvertimeRequest";
ALTER TABLE "new_OvertimeRequest" RENAME TO "OvertimeRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
