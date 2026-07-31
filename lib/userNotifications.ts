import { prisma } from "@/lib/prisma";

/**
 * Create a user notification when an application status changes
 */
export async function createUserNotification(
  userId: string,
  type: "APPROVED" | "REJECTED" | "CANCELLED" | "AUTO_REJECTED",
  applicationId: string,
  postId: string,
  message: string
) {
  try {
    await prisma.userNotification.create({
      data: {
        userId,
        type,
        applicationId,
        postId,
        message,
        status: "UNREAD",
      },
    });
  } catch (error) {
    console.error("Error creating user notification:", error);
    // Don't throw - notification is not critical, main operation should succeed
  }
}
