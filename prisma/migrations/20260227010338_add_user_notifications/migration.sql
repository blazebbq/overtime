-- CreateTable
CREATE TABLE "UserNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNREAD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "UserNotification_postId_fkey" FOREIGN KEY ("postId") REFERENCES "OvertimeRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserNotification_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "OvertimeApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UserNotification_userId_status_idx" ON "UserNotification"("userId", "status");

-- CreateIndex
CREATE INDEX "UserNotification_postId_idx" ON "UserNotification"("postId");

-- CreateIndex
CREATE INDEX "UserNotification_applicationId_idx" ON "UserNotification"("applicationId");
