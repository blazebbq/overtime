import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { sendApplicationStatusEmail } from "@/lib/email";
import { createInboxItem } from "@/lib/inbox";

// POST - Cancel an application
export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { applicationId, cancellationReason } = body;

    // Validation
    if (!applicationId) {
      return NextResponse.json(
        { error: "applicationId is required" },
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

    // Verify ownership
    if (application.userId !== user.id) {
      return NextResponse.json(
        { error: "You can only cancel your own applications" },
        { status: 403 }
      );
    }

    // Check current status
    if (application.status === "CANCELLED") {
      return NextResponse.json(
        { error: "This application is already cancelled" },
        { status: 400 }
      );
    }

    if (application.status === "CANCEL_PENDING") {
      return NextResponse.json(
        { error: "Cancellation already pending approval" },
        { status: 400 }
      );
    }

    if (
      application.status !== "PENDING_APPROVAL" &&
      application.status !== "APPROVED"
    ) {
      return NextResponse.json(
        { error: "Only pending or approved applications can be cancelled" },
        { status: 400 }
      );
    }

    // PENDING applications can be withdrawn immediately
    if (application.status === "PENDING_APPROVAL") {
      const updatedApp = await prisma.overtimeApplication.update({
        where: { id: applicationId },
        data: {
          status: "WITHDRAWN",
          cancellationApprovedAt: new Date(),
          // For self-withdrawal of pending apps, leave approvedById null since no approval was needed
          cancellationApprovedById: null,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: "APPLICATION_WITHDRAWN",
          entityType: "OvertimeApplication",
          entityId: applicationId,
          creatorId: user.id,
          affectedUserId: user.id,
          changes: JSON.stringify({
            previousStatus: "PENDING_APPROVAL",
            newStatus: "WITHDRAWN",
            immediate: true,
            selfWithdrawn: true,
          }),
        },
      });

      // Send email notification
      await sendApplicationStatusEmail(
        {
          primary: application.user.email,
          secondary: application.user.secondaryEmail,
        },
        application.user.name,
        "WITHDRAWN",
        {
          date: new Date(application.overtime.date).toDateString(),
          area: application.overtime.area.name,
          shiftColour: application.overtime.shiftColour.name,
          shiftHexColor: application.overtime.shiftColour.hexColor,
        }
      );

      return NextResponse.json(updatedApp);
    }

    // APPROVED applications require manager approval to cancel
    if (application.status === "APPROVED") {
      if (!cancellationReason || cancellationReason.trim() === "") {
        return NextResponse.json(
          { error: "Cancellation reason is required for approved applications" },
          { status: 400 }
        );
      }

      const updatedApp = await prisma.overtimeApplication.update({
        where: { id: applicationId },
        data: {
          status: "CANCEL_PENDING",
          cancellationRequestedAt: new Date(),
          cancellationRequestedReason: cancellationReason,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: "CANCELLATION_REQUESTED",
          entityType: "OvertimeApplication",
          entityId: applicationId,
          creatorId: user.id,
          affectedUserId: user.id,
          changes: JSON.stringify({
            previousStatus: "APPROVED",
            newStatus: "CANCEL_PENDING",
            reason: cancellationReason,
          }),
        },
      });

      // Send email notification
      await sendApplicationStatusEmail(
        {
          primary: application.user.email,
          secondary: application.user.secondaryEmail,
        },
        application.user.name,
        "CANCEL_PENDING",
        {
          date: new Date(application.overtime.date).toDateString(),
          area: application.overtime.area.name,
          shiftColour: application.overtime.shiftColour.name,
          shiftHexColor: application.overtime.shiftColour.hexColor,
          cancellationReason,
        }
      );

      // Create inbox item for approver to review cancellation request
      await createInboxItem({
        type: "CANCELLATION_REQUEST",
        postId: application.overtimeId,
        applicationId: application.id,
        requesterUserId: user.id,
        areaId: application.overtime.areaId,
        shiftColourId: application.overtime.shiftColourId,
      });

      return NextResponse.json(updatedApp);
    }

    return NextResponse.json(
      { error: "Invalid application status" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Error cancelling application:", err);
    return NextResponse.json(
      { error: "Failed to cancel application" },
      { status: 500 }
    );
  }
}
