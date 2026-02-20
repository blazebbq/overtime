import { prisma } from "@/lib/prisma";

/**
 * Find the appropriate manager for an overtime request based on area and shift colour
 * Returns the manager's user ID or null if none found (will default to super admin)
 */
export async function findApproverForOvertimeRequest(
  areaId: string,
  shiftColourId: string
): Promise<string | null> {
  // Find manager assignment for this area/shift colour combination
  const managerAssignment = await prisma.managerAssignment.findFirst({
    where: {
      areaId,
      shiftColourId,
    },
    select: {
      managerId: true,
    },
  });

  return managerAssignment?.managerId || null;
}

/**
 * Create an inbox item for a new application or cancellation request
 */
export async function createInboxItem(data: {
  type: "APPLICATION_REQUEST" | "CANCELLATION_REQUEST";
  postId: string;
  applicationId: string;
  requesterUserId: string;
  areaId: string;
  shiftColourId: string;
}): Promise<void> {
  // Find the appropriate approver
  const assignedToUserId = await findApproverForOvertimeRequest(
    data.areaId,
    data.shiftColourId
  );

  // Create inbox item
  await prisma.inboxItem.create({
    data: {
      type: data.type,
      postId: data.postId,
      applicationId: data.applicationId,
      requesterUserId: data.requesterUserId,
      assignedToUserId,  // null if no manager found (super admin will see all)
      areaId: data.areaId,
      shiftColourId: data.shiftColourId,
      status: "UNREAD",
    },
  });
}

/**
 * Mark inbox items as resolved
 */
export async function resolveInboxItems(
  applicationId: string,
  resolvedByUserId: string
): Promise<void> {
  await prisma.inboxItem.updateMany({
    where: {
      applicationId,
      status: { in: ["UNREAD", "OPEN"] },
    },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolvedByUserId,
    },
  });
}
