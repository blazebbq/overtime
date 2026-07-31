-- CreateTable
CREATE TABLE "InboxItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "areaId" TEXT,
    "shiftColourId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNREAD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "resolvedByUserId" TEXT,
    CONSTRAINT "InboxItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "OvertimeRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InboxItem_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "OvertimeApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "InboxItem_assignedToUserId_status_idx" ON "InboxItem"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "InboxItem_postId_idx" ON "InboxItem"("postId");

-- CreateIndex
CREATE INDEX "InboxItem_applicationId_idx" ON "InboxItem"("applicationId");
