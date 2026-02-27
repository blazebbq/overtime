import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { sendApplicationStatusEmail } from "@/lib/email";
import { resolveInboxItems } from "@/lib/inbox";
import { calculatePaySegments, parseDateTime } from "@/lib/payCalculation";
import { createUserNotification } from "@/lib/userNotifications";

// GET - List applications needing approval
export async function GET(req: NextRequest) {
  const { user, error } = await requireManager();
  if (error) return error;

  try {
    const searchParams = req.nextUrl.searchParams;
    const areaId = searchParams.get("areaId");
    const shiftColourId = searchParams.get("shiftColourId");
    const status = searchParams.get("status");

    // Get all manager assignments for this manager
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

    // Build query for applications
    const whereClause: {
      userId: { in: string[] };
      status?: string;
    } = {
      userId: {
        in: managerAssignments.map((ma) => ma.userId),
      },
    };

    if (status) {
      whereClause.status = status;
    }

    // Get applications
    let applications = await prisma.overtimeApplication.findMany({
      where: whereClause,
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
      orderBy: { createdAt: "desc" },
    });

    // Filter by manager's assignment scope (area/shift colour)
    applications = applications.filter((app) => {
      const assignment = managerAssignments.find((ma) => {
        if (ma.userId !== app.userId) return false;
        if (ma.areaId && ma.areaId !== app.overtime.areaId) return false;
        if (
          ma.shiftColourId &&
          ma.shiftColourId !== app.overtime.shiftColourId
        )
          return false;
        return true;
      });
      return !!assignment;
    });

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
    console.error("Error fetching applications for approval:", err);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

// POST - Approve or reject application
export async function POST(req: Request) {
  const { user, error } = await requireManager();
  if (error) return error;

  try {
    const body = await req.json();
    const {
      applicationId,
      action, // "APPROVE" | "REJECT"
      approvedStartTime,
      approvedEndTime,
      rejectionReason,
    } = body;

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

    // Can only approve/reject pending applications
    if (application.status !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "Only pending applications can be approved or rejected" },
        { status: 400 }
      );
    }

    // Verify manager is assigned to manage this user (skip for SUPER_ADMIN)
    if (user!.role !== "SUPER_ADMIN") {
      const managerAssignment = await prisma.managerAssignment.findFirst({
        where: {
          managerId: user!.id,
          userId: application.userId,
          OR: [{ areaId: null }, { areaId: application.overtime.areaId }],
        },
      });

      if (!managerAssignment) {
        return NextResponse.json(
          { error: "You are not assigned to manage this user" },
          { status: 403 }
        );
      }

      // Additional check for shift colour
      if (
        managerAssignment.shiftColourId &&
        managerAssignment.shiftColourId !== application.overtime.shiftColourId
      ) {
        return NextResponse.json(
          { error: "You are not assigned to manage this shift colour" },
          { status: 403 }
        );
      }
    }

    if (action === "APPROVE") {
      // Validate approved times
      if (!approvedStartTime || !approvedEndTime) {
        return NextResponse.json(
          { error: "approvedStartTime and approvedEndTime are required" },
          { status: 400 }
        );
      }

      // Log if approving beyond required slots (but don't block)
      if (
        application.overtime.approvedCount >= application.overtime.requiredPeople
      ) {
        console.log(
          `Over-slot approval: Approving application ${applicationId} for overtime ${application.overtime.id}. ` +
          `Current: ${application.overtime.approvedCount}/${application.overtime.requiredPeople}. ` +
          `Approved by: ${user!.name} (${user!.id})`
        );
      }

      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Update application
        const updatedApp = await tx.overtimeApplication.update({
          where: { id: applicationId },
          data: {
            status: "APPROVED",
            approvedStartTime,
            approvedEndTime,
            approverId: user!.id,
          },
        });

        // Calculate pay segments for this approval
        try {
          const startDateTime = parseDateTime(
            application.overtime.date.toISOString(),
            approvedStartTime
          );
          const endDateTime = parseDateTime(
            application.overtime.date.toISOString(),
            approvedEndTime
          );

          const paySegments = calculatePaySegments(startDateTime, endDateTime);

          // Create pay segment records
          for (const segment of paySegments) {
            await tx.overtimePaySegment.create({
              data: {
                applicationId: updatedApp.id,
                segmentStart: segment.segmentStart,
                segmentEnd: segment.segmentEnd,
                hoursWorked: segment.hoursWorked,
                multiplier: segment.multiplier,
              },
            });
          }
        } catch (payCalcError) {
          console.error("Error calculating pay segments:", payCalcError);
          // Continue even if pay calculation fails - don't block approval
        }

        // Calculate new approved count
        const newApprovedCount = application.overtime.approvedCount + 1;
        const willBeFull = newApprovedCount >= application.overtime.requiredPeople;

        // Increment approved count and update status if full
        const updatedOvertime = await tx.overtimeRequest.update({
          where: { id: application.overtimeId },
          data: {
            approvedCount: newApprovedCount,
            // Set status to FULL when capacity is reached
            status: willBeFull ? "FULL" : application.overtime.status,
          },
        });

        // If we've reached capacity, auto-reject all remaining pending applications
        if (updatedOvertime.approvedCount >= updatedOvertime.requiredPeople) {
          // Find all pending applications for this overtime
          const pendingApplications = await tx.overtimeApplication.findMany({
            where: {
              overtimeId: application.overtimeId,
              status: "PENDING_APPROVAL",
            },
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  secondaryEmail: true,
                },
              },
            },
          });

          // Update all to REJECTED_CAPACITY
          await tx.overtimeApplication.updateMany({
            where: {
              overtimeId: application.overtimeId,
              status: "PENDING_APPROVAL",
            },
            data: {
              status: "REJECTED_CAPACITY",
            },
          });

          // Send rejection emails to all auto-rejected applicants
          for (const pendingApp of pendingApplications) {
            await sendApplicationStatusEmail(
              {
                primary: pendingApp.user.email,
                secondary: pendingApp.user.secondaryEmail,
              },
              pendingApp.user.name,
              "REJECTED_CAPACITY",
              {
                date: new Date(application.overtime.date).toDateString(),
                area: application.overtime.area.name,
                shiftColour: application.overtime.shiftColour.name,
                shiftHexColor: application.overtime.shiftColour.hexColor,
              }
            );

            // Create user notification for auto-rejection
            await createUserNotification(
              pendingApp.userId,
              "AUTO_REJECTED",
              pendingApp.id,
              application.overtimeId,
              `Your overtime application has been auto-rejected for ${new Date(application.overtime.date).toDateString()} (${application.overtime.area.name} - ${application.overtime.shiftColour.name}) because capacity was reached.`
            );
          }

          // Create audit logs for auto-rejections
          for (const pendingApp of pendingApplications) {
            await tx.auditLog.create({
              data: {
                action: "APPLICATION_AUTO_REJECTED",
                entityType: "OvertimeApplication",
                entityId: pendingApp.id,
                creatorId: user!.id,
                affectedUserId: pendingApp.userId,
                changes: JSON.stringify({
                  status: "REJECTED_CAPACITY",
                  reason: "Capacity reached",
                }),
              },
            });
          }
        }

        // Create audit log for approval
        await tx.auditLog.create({
          data: {
            action: "APPLICATION_APPROVED",
            entityType: "OvertimeApplication",
            entityId: applicationId,
            creatorId: user!.id,
            affectedUserId: application.userId,
            changes: JSON.stringify({
              approvedStartTime,
              approvedEndTime,
              approvedCount: updatedOvertime.approvedCount,
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
        "APPROVED",
        {
          date: new Date(application.overtime.date).toDateString(),
          area: application.overtime.area.name,
          shiftColour: application.overtime.shiftColour.name,
          shiftHexColor: application.overtime.shiftColour.hexColor,
          approvedStartTime,
          approvedEndTime,
        }
      );

      // Create user notification
      await createUserNotification(
        application.userId,
        "APPROVED",
        applicationId,
        application.overtimeId,
        `Your overtime application has been approved for ${new Date(application.overtime.date).toDateString()} (${application.overtime.area.name} - ${application.overtime.shiftColour.name}). Time: ${approvedStartTime} - ${approvedEndTime}`
      );

      // Resolve inbox items for this application
      await resolveInboxItems(applicationId, user!.id);

      return NextResponse.json(result);
    } else {
      // REJECT action
      if (!rejectionReason) {
        return NextResponse.json(
          { error: "rejectionReason is required for manual rejection" },
          { status: 400 }
        );
      }

      // Update application
      const updatedApp = await prisma.overtimeApplication.update({
        where: { id: applicationId },
        data: {
          status: "REJECTED_MANUAL",
          rejectionReason,
          approverId: user!.id,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: "APPLICATION_REJECTED",
          entityType: "OvertimeApplication",
          entityId: applicationId,
          creatorId: user!.id,
          affectedUserId: application.userId,
          changes: JSON.stringify({
            rejectionReason,
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

      // Create user notification
      await createUserNotification(
        application.userId,
        "REJECTED",
        applicationId,
        application.overtimeId,
        `Your overtime application has been rejected for ${new Date(application.overtime.date).toDateString()} (${application.overtime.area.name} - ${application.overtime.shiftColour.name}). Reason: ${rejectionReason}`
      );

      // Resolve inbox items for this application
      await resolveInboxItems(applicationId, user!.id);

      return NextResponse.json(updatedApp);
    }
  } catch (err) {
    console.error("Error processing application approval:", err);
    return NextResponse.json(
      { error: "Failed to process application" },
      { status: 500 }
    );
  }
}
