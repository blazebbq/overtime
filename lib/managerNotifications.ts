import { prisma } from "@/lib/prisma";
import { sendGenericEmail } from "@/lib/email";

/**
 * Send email notification to managers/admins about new application
 */
export async function notifyManagersOfNewApplication(
  applicationId: string,
  overtimeId: string,
  userId: string
) {
  try {
    // Get application with details
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

    if (!application) return;

    const { user, overtime } = application;
    const { area, shiftColour } = overtime;

    // Get managers/admins assigned to this area
    const assignments = await prisma.managerAssignment.findMany({
      where: {
        areaId: area.id,
      },
      include: {
        manager: true,
      },
    });

    // Get SuperAdmins
    const superAdmins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN" },
    });

    // Collect all recipients
    const recipients: Array<{ email: string; secondaryEmail?: string | null }> = [];

    // Add managers/admins from assignments
    for (const assignment of assignments) {
      if (assignment.manager) {
        recipients.push({
          email: assignment.manager.email,
          secondaryEmail: assignment.manager.secondaryEmail,
        });
      }
    }

    // Add SuperAdmins
    for (const admin of superAdmins) {
      recipients.push({
        email: admin.email,
        secondaryEmail: admin.secondaryEmail,
      });
    }

    // Remove duplicates
    const uniqueRecipients = Array.from(
      new Map(recipients.map(r => [r.email, r])).values()
    );

    if (uniqueRecipients.length === 0) return;

    // Prepare email content
    const subject = `New Overtime Application - Action Required`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 8px; }
    .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 8px; }
    .badge { display: inline-block; padding: 5px 10px; background: #f59e0b; color: white; border-radius: 4px; font-weight: bold; }
    .details { background: white; padding: 15px; margin-top: 15px; border-radius: 4px; border-left: 4px solid #3b82f6; }
    .action { background: #eff6ff; padding: 15px; margin-top: 15px; border-radius: 4px; border-left: 4px solid #3b82f6; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📋 New Overtime Application</h1>
    </div>
    <div class="content">
      <p>A new overtime application requires your review and approval.</p>
      
      <div class="details">
        <h3 style="margin-top: 0;">Application Details</h3>
        <p><strong>👤 Applicant:</strong> ${user.name}</p>
        <p><strong>📅 Date:</strong> ${new Date(overtime.date).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}</p>
        <p><strong>📍 Area:</strong> ${area.name}</p>
        <p><strong>🎨 Shift:</strong> ${shiftColour.name}</p>
        <p><strong>🕐 Time:</strong> ${overtime.startTime} – ${overtime.endTime}</p>
        ${application.requestType === "PARTIAL" ? `
        <p><strong>⏰ Requested Hours:</strong> ${application.requestedStartTime} – ${application.requestedEndTime}</p>
        ` : ""}
        ${application.comment ? `
        <p><strong>💬 Comment:</strong> ${application.comment}</p>
        ` : ""}
      </div>
      
      <div class="action">
        <strong>⚠️ Action Required:</strong> Please review and approve or reject this application in your manager portal.
      </div>
    </div>
    <div class="footer">
      <p>This is an automated message from the Overtime Booking System.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send to all recipients
    for (const recipient of uniqueRecipients) {
      const emails = [recipient.email];
      if (recipient.secondaryEmail && recipient.secondaryEmail !== recipient.email) {
        emails.push(recipient.secondaryEmail);
      }

      await sendGenericEmail(emails, subject, html);
    }

    console.log(`[ManagerNotifications] Sent new application notification to ${uniqueRecipients.length} managers/admins`);
  } catch (error) {
    console.error("[ManagerNotifications] Error sending new application notification:", error);
    // Don't throw - notification failure shouldn't block application
  }
}

/**
 * Send email notification to managers/admins about cancellation request
 */
export async function notifyManagersOfCancellationRequest(
  applicationId: string
) {
  try {
    // Get application with details
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

    if (!application) return;

    const { user, overtime } = application;
    const { area, shiftColour } = overtime;

    // Get managers/admins assigned to this area
    const assignments = await prisma.managerAssignment.findMany({
      where: {
        areaId: area.id,
      },
      include: {
        manager: true,
      },
    });

    // Get SuperAdmins
    const superAdmins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN" },
    });

    // Collect all recipients
    const recipients: Array<{ email: string; secondaryEmail?: string | null }> = [];

    // Add managers/admins from assignments
    for (const assignment of assignments) {
      if (assignment.manager) {
        recipients.push({
          email: assignment.manager.email,
          secondaryEmail: assignment.manager.secondaryEmail,
        });
      }
    }

    // Add SuperAdmins
    for (const admin of superAdmins) {
      recipients.push({
        email: admin.email,
        secondaryEmail: admin.secondaryEmail,
      });
    }

    // Remove duplicates
    const uniqueRecipients = Array.from(
      new Map(recipients.map(r => [r.email, r])).values()
    );

    if (uniqueRecipients.length === 0) return;

    // Prepare email content
    const subject = `Cancellation Request - Action Required`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px; }
    .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 8px; }
    .badge { display: inline-block; padding: 5px 10px; background: #f59e0b; color: white; border-radius: 4px; font-weight: bold; }
    .details { background: white; padding: 15px; margin-top: 15px; border-radius: 4px; border-left: 4px solid #f59e0b; }
    .reason { background: #fffbeb; padding: 10px; margin-top: 10px; border-radius: 4px; border-left: 3px solid #f59e0b; }
    .action { background: #fffbeb; padding: 15px; margin-top: 15px; border-radius: 4px; border-left: 4px solid #f59e0b; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">⚠️ Cancellation Request</h1>
    </div>
    <div class="content">
      <p>A user has requested to cancel their approved overtime assignment.</p>
      
      <div class="details">
        <h3 style="margin-top: 0;">Request Details</h3>
        <p><strong>👤 User:</strong> ${user.name}</p>
        <p><strong>📅 Date:</strong> ${new Date(overtime.date).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}</p>
        <p><strong>📍 Area:</strong> ${area.name}</p>
        <p><strong>🎨 Shift:</strong> ${shiftColour.name}</p>
        <p><strong>🕐 Time:</strong> ${overtime.startTime} – ${overtime.endTime}</p>
        ${application.cancellationRequestedReason ? `
        <div class="reason">
          <strong>Cancellation Reason:</strong> ${application.cancellationRequestedReason}
        </div>
        ` : ""}
      </div>
      
      <div class="action">
        <strong>⚠️ Action Required:</strong> Please review and approve or reject this cancellation request in your manager portal.
      </div>
    </div>
    <div class="footer">
      <p>This is an automated message from the Overtime Booking System.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send to all recipients
    for (const recipient of uniqueRecipients) {
      const emails = [recipient.email];
      if (recipient.secondaryEmail && recipient.secondaryEmail !== recipient.email) {
        emails.push(recipient.secondaryEmail);
      }

      await sendGenericEmail(emails, subject, html);
    }

    console.log(`[ManagerNotifications] Sent cancellation request notification to ${uniqueRecipients.length} managers/admins`);
  } catch (error) {
    console.error("[ManagerNotifications] Error sending cancellation request notification:", error);
    // Don't throw - notification failure shouldn't block request
  }
}
