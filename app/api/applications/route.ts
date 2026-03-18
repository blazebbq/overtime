import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createInboxItem } from "@/lib/inbox";
import { notifyManagersOfNewApplication } from "@/lib/managerNotifications";

// GET - List applications (for current user or admin)
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const searchParams = req.nextUrl.searchParams;
    const overtimeId = searchParams.get("overtimeId");

    const where: {
      userId: string;
      overtimeId?: string;
    } = {
      userId: user!.id,
    };

    if (overtimeId) {
      where.overtimeId = overtimeId;
    }

    const applications = await prisma.overtimeApplication.findMany({
      where,
      include: {
        overtime: {
          include: {
            area: true,
            shiftColour: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(applications);
  } catch (err) {
    console.error("Error fetching applications:", err);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

// POST - Create new application
export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      overtimeId,
      requestType, // "FULL" or "PARTIAL"
      requestedStartTime,
      requestedEndTime,
      comment,
    } = body;

    // Validation
    if (!overtimeId || !requestType) {
      return NextResponse.json(
        { error: "overtimeId and requestType are required" },
        { status: 400 }
      );
    }

    if (!["FULL", "PARTIAL"].includes(requestType)) {
      return NextResponse.json(
        { error: "requestType must be FULL or PARTIAL" },
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

    // Check if slot is full (based on approved count)
    if (overtime.approvedCount >= overtime.requiredPeople) {
      return NextResponse.json(
        { error: "This overtime slot is fully staffed" },
        { status: 400 }
      );
    }

    // Check if user has an ACTIVE application (block reapplication for these statuses)
    // Allow reapplication if previous status was REJECTED or CANCELLED
    const activeApplication = await prisma.overtimeApplication.findFirst({
      where: {
        userId: user.id,
        overtimeId,
        status: {
          in: ["PENDING_APPROVAL", "APPROVED", "CANCEL_PENDING"],
        },
      },
    });

    if (activeApplication) {
      const statusMessages: Record<string, string> = {
        PENDING_APPROVAL: "You already have a pending application for this overtime",
        APPROVED: "You are already approved for this overtime",
        CANCEL_PENDING: "You have a cancellation pending for this overtime",
      };
      
      return NextResponse.json(
        { error: statusMessages[activeApplication.status] || "You already have an active application for this overtime" },
        { status: 400 }
      );
    }

    // Validate PARTIAL request
    if (requestType === "PARTIAL") {
      if (!requestedStartTime || !requestedEndTime) {
        return NextResponse.json(
          {
            error:
              "requestedStartTime and requestedEndTime are required for PARTIAL requests",
          },
          { status: 400 }
        );
      }

      // Parse times for validation (HH:MM format)
      const parseTime = (time: string) => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
      };

      const overtimeStartMinutes = parseTime(overtime.startTime);
      const overtimeEndMinutes = parseTime(overtime.endTime);
      const requestedStartMinutes = parseTime(requestedStartTime);
      const requestedEndMinutes = parseTime(requestedEndTime);

      // Validate times fall within overtime window
      if (
        requestedStartMinutes < overtimeStartMinutes ||
        requestedEndMinutes > overtimeEndMinutes
      ) {
        return NextResponse.json(
          {
            error: "Requested times must fall within the overtime shift hours",
          },
          { status: 400 }
        );
      }

      // Validate end time is after start time
      if (requestedEndMinutes <= requestedStartMinutes) {
        return NextResponse.json(
          { error: "End time must be after start time" },
          { status: 400 }
        );
      }
    }

    // Create application
    const application = await prisma.overtimeApplication.create({
      data: {
        userId: user.id,
        overtimeId,
        requestType,
        requestedStartTime:
          requestType === "PARTIAL" ? requestedStartTime : null,
        requestedEndTime: requestType === "PARTIAL" ? requestedEndTime : null,
        comment: comment || null,
        status: "PENDING_APPROVAL",
      },
      include: {
        overtime: {
          include: {
            area: true,
            shiftColour: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "APPLICATION_CREATED",
        entityType: "OvertimeApplication",
        entityId: application.id,
        creatorId: user.id,
        affectedUserId: user.id,
        changes: JSON.stringify({
          overtimeId,
          requestType,
          requestedStartTime,
          requestedEndTime,
          comment,
        }),
      },
    });

    // Create inbox item for approver
    await createInboxItem({
      type: "APPLICATION_REQUEST",
      postId: overtimeId,
      applicationId: application.id,
      requesterUserId: user.id,
      areaId: overtime.areaId,
      shiftColourId: overtime.shiftColourId,
    });

    // Send email notification to managers/admins
    await notifyManagersOfNewApplication(application.id, overtimeId, user.id);

    return NextResponse.json(application);
  } catch (err) {
    console.error("Error creating application:", err);
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 }
    );
  }
}
