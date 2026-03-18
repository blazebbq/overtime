import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { sendApplicationStatusEmail } from "@/lib/email";
import { createUserNotification } from "@/lib/userNotifications";

// POST - Manually assign a user to overtime
export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only MANAGER, ADMIN, and SUPER_ADMIN can manually assign
  if (!["MANAGER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json(
      { error: "Only managers and admins can manually assign overtime" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { overtimeId, userId: targetUserId } = body;

    // Validation
    if (!overtimeId || !targetUserId) {
      return NextResponse.json(
        { error: "overtimeId and userId are required" },
        { status: 400 }
      );
    }

    // Get overtime request
    const overtime = await prisma.overtimeRequest.findUnique({
      where: { id: overtimeId },
      include: {
        area: true,
        shiftColour: true,
      },
    });

    if (!overtime) {
      return NextResponse.json(
        { error: "Overtime request not found" },
        { status: 404 }
      );
    }

    // Check area permissions
    if (user.role === "MANAGER" || user.role === "ADMIN") {
      // Check if manager/admin has permission for this area
      const assignment = await prisma.managerAssignment.findFirst({
        where: {
          OR: [
            { managerId: user.id, areaId: overtime.areaId },
            { userId: user.id, areaId: overtime.areaId },
          ],
        },
      });

      if (!assignment) {
        return NextResponse.json(
          { error: "You do not have permission to assign overtime in this area" },
          { status: 403 }
        );
      }
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        secondaryEmail: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // Check if user already has an active application for this overtime
    const existingApplication = await prisma.overtimeApplication.findFirst({
      where: {
        userId: targetUserId,
        overtimeId,
        status: {
          in: ["PENDING_APPROVAL", "APPROVED", "CANCEL_PENDING"],
        },
      },
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: "User already has an active application for this overtime" },
        { status: 400 }
      );
    }

    // Check if slot is full
    if (overtime.approvedCount >= overtime.requiredPeople) {
      return NextResponse.json(
        { error: "This overtime slot is already fully staffed" },
        { status: 400 }
      );
    }

    // Create application directly as APPROVED
    const application = await prisma.overtimeApplication.create({
      data: {
        userId: targetUserId,
        overtimeId,
        requestType: "FULL",
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: user.id,
        approvedStartTime: overtime.startTime,
        approvedEndTime: overtime.endTime,
        comment: "Manually assigned by manager",
      },
      include: {
        user: true,
        overtime: {
          include: {
            area: true,
            shiftColour: true,
          },
        },
      },
    });

    // Update approved count
    await prisma.overtimeRequest.update({
      where: { id: overtimeId },
      data: {
        approvedCount: { increment: 1 },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "MANUAL_ASSIGNMENT",
        entityType: "OvertimeApplication",
        entityId: application.id,
        creatorId: user.id,
        affectedUserId: targetUserId,
        changes: JSON.stringify({
          overtimeId,
          targetUserId,
          assignedBy: user.name,
          immediate: true,
        }),
      },
    });

    // Create user notification
    await createUserNotification(
      targetUserId,
      "APPROVED",
      application.id,
      overtimeId,
      `You have been assigned to overtime on ${new Date(overtime.date).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })} at ${overtime.area.name} (${overtime.shiftColour.name}) from ${overtime.startTime} to ${overtime.endTime}. Please cancel if you cannot attend.`
    );

    // Send email notification
    await sendApplicationStatusEmail(
      {
        primary: targetUser.email,
        secondary: targetUser.secondaryEmail,
      },
      targetUser.name,
      "APPROVED",
      {
        date: new Date(overtime.date).toDateString(),
        area: overtime.area.name,
        shiftColour: overtime.shiftColour.name,
        shiftHexColor: overtime.shiftColour.hexColor,
        approvedStartTime: overtime.startTime,
        approvedEndTime: overtime.endTime,
      },
      application.id
    );

    console.log(`[ManualAssignment] ${user.name} assigned ${targetUser.name} to overtime ${overtimeId}`);

    return NextResponse.json(application);
  } catch (err) {
    console.error("Error creating manual assignment:", err);
    return NextResponse.json(
      { error: "Failed to create manual assignment" },
      { status: 500 }
    );
  }
}
