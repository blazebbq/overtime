import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { sendApplicationStatusEmail } from "@/lib/email";
import { resolveInboxItems } from "@/lib/inbox";
import { createUserNotification } from "@/lib/userNotifications";

// GET - List cancellation requests needing approval
export async function GET(req: NextRequest) {
  const { user, error } = await requireManager();
  if (error) return error;

  try {
    const searchParams = req.nextUrl.searchParams;
    const areaId = searchParams.get("areaId");
    const shiftColourId = searchParams.get("shiftColourId");

    // Get all manager assignments for this manager (skip for SUPER_ADMIN)
    let applications;
    
    if (user!.role === "SUPER_ADMIN") {
      // SuperAdmin sees ALL cancellation requests
      applications = await prisma.overtimeApplication.findMany({
        where: {
          status: "CANCEL_PENDING",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              secondaryEmail: true,
            },
          },
          overtime: {
            include: {
              area: true,
              shiftColour: true,
            },
          },
        },
        orderBy: { cancellationRequestedAt: "desc" },
      });
    } else {
      // Regular managers see cancellation requests for:
      // 1. Users assigned to them (direct reports)
      // 2. Areas assigned to them
      const managerAssignments = await prisma.managerAssignment.findMany({
        where: { managerId: user!.id },
        select: {
          userId: true,
          areaId: true,
          shiftColourId: true,
        },
      });

      if (managerAssignments.length === 0) {
        return NextResponse.json([]);
      }

      const assignedUserIds = managerAssignments
        .filter((a) => a.userId)
        .map((a) => a.userId);

      const assignedAreaIds = managerAssignments
        .filter((a) => a.areaId)
        .map((a) => a.areaId);

      // Build OR conditions
      const orConditions: any[] = [];

      if (assignedUserIds.length > 0) {
        orConditions.push({ userId: { in: assignedUserIds } });
      }

      if (assignedAreaIds.length > 0) {
        orConditions.push({
          overtime: {
            areaId: { in: assignedAreaIds },
          },
        });
      }

      if (orConditions.length === 0) {
        return NextResponse.json([]);
      }

      // Get applications
      applications = await prisma.overtimeApplication.findMany({
        where: {
          status: "CANCEL_PENDING",
          OR: orConditions,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              secondaryEmail: true,
            },
          },
          overtime: {
            include: {
              area: true,
              shiftColour: true,
            },
          },
        },
        orderBy: { cancellationRequestedAt: "desc" },
      });

      // Additional filtering for shift colour if specified in assignment
      applications = applications.filter((app) => {
        // Check if there's a matching assignment
        const hasUserAssignment = managerAssignments.some(
          (ma) => ma.userId === app.userId
        );
        const hasAreaAssignment = managerAssignments.some(
          (ma) =>
            ma.areaId === app.overtime.areaId &&
            (!ma.shiftColourId || ma.shiftColourId === app.overtime.shiftColourId)
        );
        return hasUserAssignment || hasAreaAssignment;
      });
    }

    // Apply area filter if provided
    if (areaId) {
      applications = applications.filter(
        (app) => app.overtime.areaId === areaId
      );
    }

    // Apply shift colour filter if provided
    if (shiftColourId) {
      applications = applications.filter(
        (app) => app.overtime.shiftColourId === shiftColourId
      );
    }

    return NextResponse.json(applications);
  } catch (err) {
    console.error("Error fetching cancellation requests:", err);
    return NextResponse.json(
      { error: "Failed to fetch cancellation requests" },
      { status: 500 }
    );
  }
}

// POST - Approve or reject cancellation request
export async function POST(req: Request) {
  const { user, error } = await requireManager();
  if (error) return error;

  try {
    const body = await req.json();
    const { applicationId, action } = body;

    // Validation
    if (!applicationId || !action) {
      return NextResponse.json(
        { error: "applicationId and action are required" },
        { status: 400 }
      );
    }

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { error: "action must be APPROVE or REJECT" },
        { status: 400 }
      );
    }

    // Get application
    const application = await prisma.overtimeApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            secondaryEmail: true,
          },
        },
        overtime: {
          include: {
            area: true,
            shiftColour: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Can only approve/reject cancellation pending applications
    if (application.status !== "CANCEL_PENDING") {
      return NextResponse.json(
        { error: "Only cancellation pending applications can be processed" },
        { status: 400 }
      );
    }

    // Verify manager permission (skip for SUPER_ADMIN)
    if (user!.role !== "SUPER_ADMIN") {
      if (user!.role === "ADMIN") {
        // For ADMIN: Check if they have access to this overtime's area
        const adminAreas = await prisma.managerAssignment.findMany({
          where: { userId: user!.id },
          select: { areaId: true }
        });
        const areaIds = adminAreas.map(a => a.areaId).filter(Boolean);
        
        if (!areaIds.includes(application.overtime.areaId)) {
          return NextResponse.json(
            { error: "You do not have permission to manage cancellations for this area" },
            { status: 403 }
          );
        }
      } else {
        // For MANAGER: Check manager assignment
        // Check if manager is assigned to:
        // 1. The user (direct report), OR
        // 2. The area of the overtime
        const managerAssignments = await prisma.managerAssignment.findMany({
          where: {
            managerId: user!.id,
            OR: [
              // Assigned to the user
              { userId: application.userId },
              // Assigned to the area
              { areaId: application.overtime.areaId },
            ],
          },
        });

        if (managerAssignments.length === 0) {
          return NextResponse.json(
            { error: "You are not authorized to approve this cancellation. You must be assigned to either the user or the area." },
            { status: 403 }
          );
        }

        // If assigned by area, verify shift colour if specified
        const areaAssignment = managerAssignments.find(
          (ma) => ma.areaId === application.overtime.areaId
        );
        if (areaAssignment && areaAssignment.shiftColourId) {
          if (areaAssignment.shiftColourId !== application.overtime.shiftColourId) {
            return NextResponse.json(
              { error: "You are not assigned to manage this shift colour in this area" },
              { status: 403 }
            );
          }
        }
      }
    }

    if (action === "APPROVE") {
      // Approve the cancellation
      const result = await prisma.$transaction(async (tx) => {
        // Update application to CANCELLED
        const updatedApp = await tx.overtimeApplication.update({
          where: { id: applicationId },
          data: {
            status: "CANCELLED",
            cancellationApprovedAt: new Date(),
            cancellationApprovedById: user!.id,
          },
        });

        // Decrement approved count since this was an APPROVED application being cancelled
        const newApprovedCount = Math.max(0, application.overtime.approvedCount - 1);
        await tx.overtimeRequest.update({
          where: { id: application.overtimeId },
          data: {
            approvedCount: newApprovedCount,
            // Reopen if it was FULL
            status: application.overtime.status === "FULL" ? "OPEN" : application.overtime.status,
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            action: "CANCELLATION_APPROVED",
            entityType: "OvertimeApplication",
            entityId: applicationId,
            creatorId: user!.id,
            affectedUserId: application.userId,
            changes: JSON.stringify({
              previousStatus: "CANCEL_PENDING",
              newStatus: "CANCELLED",
              reason: application.cancellationRequestedReason,
            }),
          },
        });

        return updatedApp;
      });

      // Send approval email
      await sendApplicationStatusEmail(
        {
          primary: application.user.email,
          secondary: application.user.secondaryEmail,
        },
        application.user.name,
        "CANCELLATION_APPROVED",
        {
          date: new Date(application.overtime.date).toDateString(),
          area: application.overtime.area.name,
          shiftColour: application.overtime.shiftColour.name,
          shiftHexColor: application.overtime.shiftColour.hexColor,
        }
      );

      // Create user notification
      await createUserNotification(
        application.userId,
        "CANCELLED",
        applicationId,
        application.overtimeId,
        `Your overtime cancellation has been approved for ${new Date(application.overtime.date).toDateString()} (${application.overtime.area.name} - ${application.overtime.shiftColour.name}).`
      );

      // Resolve inbox items for this cancellation request
      await resolveInboxItems(applicationId, user!.id);

      return NextResponse.json(result);
    } else {
      // REJECT the cancellation - restore to APPROVED status
      const updatedApp = await prisma.overtimeApplication.update({
        where: { id: applicationId },
        data: {
          status: "APPROVED",
          cancellationRequestedAt: null,
          cancellationRequestedReason: null,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: "CANCELLATION_REJECTED",
          entityType: "OvertimeApplication",
          entityId: applicationId,
          creatorId: user!.id,
          affectedUserId: application.userId,
          changes: JSON.stringify({
            previousStatus: "CANCEL_PENDING",
            newStatus: "APPROVED",
            reason: application.cancellationRequestedReason,
          }),
        },
      });

      // Send rejection email
      await sendApplicationStatusEmail(
        {
          primary: application.user.email,
          secondary: application.user.secondaryEmail,
        },
        application.user.name,
        "CANCELLATION_REJECTED",
        {
          date: new Date(application.overtime.date).toDateString(),
          area: application.overtime.area.name,
          shiftColour: application.overtime.shiftColour.name,
          shiftHexColor: application.overtime.shiftColour.hexColor,
        }
      );

      // Resolve inbox items for this cancellation request
      await resolveInboxItems(applicationId, user!.id);

      return NextResponse.json(updatedApp);
    }
  } catch (err) {
    console.error("Error processing cancellation approval:", err);
    return NextResponse.json(
      { error: "Failed to process cancellation" },
      { status: 500 }
    );
  }
}
