import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { sendGenericEmail } from "@/lib/email";
import { resolveInboxItems } from "@/lib/inbox";
import { createUserNotification } from "@/lib/userNotifications";

// POST - Admin/Manager cancels an approved application on behalf of user
export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin or superadmin
  const userRole = user.role;
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN" && userRole !== "MANAGER") {
    return NextResponse.json(
      { error: "Only admins and managers can cancel applications" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { applicationId, reason } = body;

    if (!applicationId || !reason) {
      return NextResponse.json(
        { error: "applicationId and reason are required" },
        { status: 400 }
      );
    }

    // Get application details
    const application = await prisma.overtimeApplication.findUnique({
      where: { id: applicationId },
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

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Only allow cancelling approved applications
    if (application.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Can only cancel approved applications" },
        { status: 400 }
      );
    }

    // For managers, check if they have permission for this area
    if (userRole === "MANAGER") {
      const managerAssignment = await prisma.managerAssignment.findFirst({
        where: {
          managerId: user.id,
          areaId: application.overtime.areaId,
        },
      });

      if (!managerAssignment) {
        return NextResponse.json(
          { error: "You don't have permission to cancel applications in this area" },
          { status: 403 }
        );
      }
    }

    // Update application to CANCELLED
    const updatedApplication = await prisma.overtimeApplication.update({
      where: { id: applicationId },
      data: {
        status: "CANCELLED",
        cancellationRequestedAt: new Date(),
        cancellationRequestedReason: reason,
        cancellationApprovedAt: new Date(),
        cancellationApprovedById: user.id,
      },
    });

    // Decrement approvedCount on the overtime request
    await prisma.overtimeRequest.update({
      where: { id: application.overtimeId },
      data: {
        approvedCount: {
          decrement: 1,
        },
        // If was FULL, reopen it
        status: application.overtime.status === "FULL" ? "OPEN" : application.overtime.status,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "APPLICATION_CANCELLED_BY_ADMIN",
        entityType: "OvertimeApplication",
        entityId: applicationId,
        creatorId: user.id,
        affectedUserId: application.userId,
        changes: JSON.stringify({
          applicationId,
          userId: application.userId,
          overtimeId: application.overtimeId,
          reason,
          cancelledBy: user.name,
          cancelledById: user.id,
        }),
      },
    });

    // Send email notification to user
    const emailAddresses = [application.user.email];
    if (application.user.secondaryEmail) {
      emailAddresses.push(application.user.secondaryEmail);
    }

    const emailSubject = `Overtime Cancelled - ${new Date(application.overtime.date).toDateString()}`;
    const emailBody = `
      <h2>Your Overtime Assignment Has Been Cancelled</h2>
      <p>Dear ${application.user.name},</p>
      <p>Your approved overtime assignment has been cancelled by ${user.name}.</p>
      
      <h3>Overtime Details:</h3>
      <ul>
        <li><strong>Date:</strong> ${new Date(application.overtime.date).toDateString()}</li>
        <li><strong>Area:</strong> ${application.overtime.area.name}</li>
        <li><strong>Shift:</strong> ${application.overtime.shiftColour.name}</li>
        <li><strong>Time:</strong> ${application.overtime.startTime} - ${application.overtime.endTime}</li>
      </ul>
      
      <h3>Cancellation Reason:</h3>
      <p>${reason}</p>
      
      <p>If you have any questions, please contact your manager.</p>
    `;

    for (const email of emailAddresses) {
      try {
        await sendGenericEmail(email, emailSubject, emailBody);
      } catch (emailError) {
        console.error(`Failed to send cancellation email to ${email}:`, emailError);
      }
    }

    // FIX 3: Create user notification when manager/admin cancels approved overtime
    await createUserNotification(
      application.userId,
      "CANCELLED",
      applicationId,
      application.overtimeId,
      `Your approved overtime shift has been cancelled by management for ${new Date(application.overtime.date).toDateString()} (${application.overtime.area.name} - ${application.overtime.shiftColour.name}). Reason: ${reason}`
    );

    // Resolve any inbox items related to this application
    await resolveInboxItems(applicationId, user.id);

    return NextResponse.json({
      success: true,
      application: updatedApplication,
    });
  } catch (err) {
    console.error("Error cancelling application:", err);
    return NextResponse.json(
      { error: "Failed to cancel application" },
      { status: 500 }
    );
  }
}
