import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET - List overtime requests needing approval
export async function GET(req: NextRequest) {
  const { user, error } = await requireManager();
  if (error) return error;

  try {
    const searchParams = req.nextUrl.searchParams;
    const areaId = searchParams.get("areaId");
    const shiftColourId = searchParams.get("shiftColourId");
    const status = searchParams.get("status");

    // First, get all manager assignments for this manager
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

    // Build complex where clause for overtime requests
    // We need to find overtime where at least one booking exists from a managed user
    const overtimeRequests = await prisma.overtimeRequest.findMany({
      where: {
        // Apply area filter if provided
        ...(areaId && { areaId }),
        // Apply shift colour filter if provided
        ...(shiftColourId && { shiftColourId }),
        // Must have at least one booking
        bookings: {
          some: {
            // From a user that this manager manages
            userId: {
              in: managerAssignments.map((ma) => ma.userId),
            },
          },
        },
      },
      include: {
        area: true,
        shiftColour: true,
        bookings: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        approvals: true,
      },
      orderBy: { date: "desc" },
    });

    // Filter overtime requests to only include bookings from managed users
    // and verify manager assignment matches area/shift colour
    const filteredRequests = overtimeRequests
      .map((overtime) => {
        const relevantBookings = overtime.bookings.filter((booking) => {
          // Check if this manager manages this user
          const assignment = managerAssignments.find((ma) => {
            // Manager must manage this user
            if (ma.userId !== booking.userId) return false;

            // If assignment has areaId specified, it must match
            if (ma.areaId && ma.areaId !== overtime.areaId) return false;

            // If assignment has shiftColourId specified, it must match
            if (ma.shiftColourId && ma.shiftColourId !== overtime.shiftColourId)
              return false;

            return true;
          });

          return !!assignment;
        });

        if (relevantBookings.length === 0) {
          return null;
        }

        // Filter approvals to only include those for relevant bookings
        const relevantApprovals = overtime.approvals.filter((approval) =>
          relevantBookings.some((booking) => booking.userId === approval.userId)
        );

        return {
          ...overtime,
          bookings: relevantBookings,
          approvals: relevantApprovals,
        };
      })
      .filter(Boolean);

    // Apply status filter if provided
    let finalRequests = filteredRequests;
    if (status) {
      finalRequests = filteredRequests.filter((overtime) => {
        if (!overtime) return false;

        // Check if all bookings have approvals with the requested status
        return overtime.bookings.some((booking) => {
          const approval = overtime.approvals.find(
            (a) => a.userId === booking.userId
          );

          if (status === "PENDING") {
            // No approval or approval is pending
            return !approval || approval.status === "PENDING";
          } else {
            // Has approval with matching status
            return approval && approval.status === status;
          }
        });
      });
    }

    return NextResponse.json(finalRequests);
  } catch (err) {
    console.error("Error fetching overtime for approval:", err);
    return NextResponse.json(
      { error: "Failed to fetch overtime requests" },
      { status: 500 }
    );
  }
}

// POST - Create or update approval
export async function POST(req: Request) {
  const { user, error } = await requireManager();
  if (error) return error;

  try {
    const body = await req.json();
    const {
      overtimeId,
      userId,
      status,
      workedAsScheduled = true,
      actualStartTime,
      actualEndTime,
      comment,
      breachWarning = false,
    } = body;

    // Validation
    if (!overtimeId || !userId || !status) {
      return NextResponse.json(
        { error: "overtimeId, userId, and status are required" },
        { status: 400 }
      );
    }

    if (!["APPROVED", "DECLINED", "PENDING"].includes(status)) {
      return NextResponse.json(
        { error: "status must be APPROVED, DECLINED, or PENDING" },
        { status: 400 }
      );
    }

    if (!workedAsScheduled && (!actualStartTime || !actualEndTime)) {
      return NextResponse.json(
        {
          error:
            "actualStartTime and actualEndTime are required when workedAsScheduled is false",
        },
        { status: 400 }
      );
    }

    // Verify overtime request exists
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

    // Verify user has a booking for this overtime
    const booking = await prisma.booking.findUnique({
      where: {
        userId_overtimeId: {
          userId,
          overtimeId,
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "User does not have a booking for this overtime" },
        { status: 404 }
      );
    }

    // Verify manager is assigned to manage this user for this area/shift colour
    const managerAssignment = await prisma.managerAssignment.findFirst({
      where: {
        managerId: user!.id,
        userId,
        // If assignment has areaId, it must match
        OR: [{ areaId: null }, { areaId: overtime.areaId }],
      },
    });

    if (!managerAssignment) {
      return NextResponse.json(
        {
          error:
            "You are not assigned to manage this user for this area/shift colour",
        },
        { status: 403 }
      );
    }

    // Additional check for shift colour if assignment has it specified
    if (
      managerAssignment.shiftColourId &&
      managerAssignment.shiftColourId !== overtime.shiftColourId
    ) {
      return NextResponse.json(
        {
          error:
            "You are not assigned to manage this user for this shift colour",
        },
        { status: 403 }
      );
    }

    // Get existing approval if any
    const existingApproval = await prisma.overtimeApproval.findUnique({
      where: {
        overtimeId_userId: {
          overtimeId,
          userId,
        },
      },
    });

    // Upsert the approval
    const approval = await prisma.overtimeApproval.upsert({
      where: {
        overtimeId_userId: {
          overtimeId,
          userId,
        },
      },
      create: {
        overtimeId,
        userId,
        approverId: user!.id,
        status,
        workedAsScheduled,
        actualStartTime: workedAsScheduled ? null : actualStartTime,
        actualEndTime: workedAsScheduled ? null : actualEndTime,
        comment,
        breachWarning,
      },
      update: {
        approverId: user!.id,
        status,
        workedAsScheduled,
        actualStartTime: workedAsScheduled ? null : actualStartTime,
        actualEndTime: workedAsScheduled ? null : actualEndTime,
        comment,
        breachWarning,
      },
    });

    // Create audit log
    const action = existingApproval
      ? "APPROVAL_UPDATED"
      : "APPROVAL_CREATED";
    const changes: Record<string, string | boolean | undefined> = {
      overtimeId,
      userId,
      status,
      workedAsScheduled,
    };

    if (!workedAsScheduled) {
      changes.actualStartTime = actualStartTime;
      changes.actualEndTime = actualEndTime;
    }

    if (comment) {
      changes.comment = comment;
    }

    if (breachWarning) {
      changes.breachWarning = breachWarning;
    }

    if (existingApproval) {
      changes.previousStatus = existingApproval.status;
    }

    await prisma.auditLog.create({
      data: {
        action,
        entityType: "OvertimeApproval",
        entityId: approval.id,
        creatorId: user!.id,
        affectedUserId: userId,
        changes: JSON.stringify(changes),
      },
    });

    return NextResponse.json(approval);
  } catch (err) {
    console.error("Error creating/updating approval:", err);
    return NextResponse.json(
      { error: "Failed to create/update approval" },
      { status: 500 }
    );
  }
}
