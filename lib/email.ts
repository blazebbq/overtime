import nodemailer from "nodemailer";

// Email configuration
const smtpConfig = {
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        }
      : undefined,
};

const fromEmail = process.env.SMTP_FROM || "noreply@overtime.example.com";

// Create transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(smtpConfig);
  }
  return transporter;
}

// Email templates
export type ApplicationStatus = 
  | "APPROVED" 
  | "REJECTED_MANUAL" 
  | "REJECTED_CAPACITY"
  | "CANCELLED"
  | "CANCEL_PENDING"
  | "CANCELLATION_APPROVED"
  | "CANCELLATION_REJECTED";

interface OvertimeDetails {
  date: string;
  area: string;
  shiftColour: string;
  shiftHexColor: string;
  approvedStartTime?: string;
  approvedEndTime?: string;
  rejectionReason?: string;
  cancellationReason?: string;
}

function getApplicationApprovedEmailHtml(
  userName: string,
  details: OvertimeDetails
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, ${details.shiftHexColor} 0%, ${details.shiftHexColor}dd 100%); color: white; padding: 20px; border-radius: 8px; }
    .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 8px; }
    .badge { display: inline-block; padding: 5px 10px; background: #10b981; color: white; border-radius: 4px; font-weight: bold; }
    .details { background: white; padding: 15px; margin-top: 15px; border-radius: 4px; border-left: 4px solid ${details.shiftHexColor}; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✓ Overtime Application Approved</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Great news! Your overtime application has been <span class="badge">APPROVED</span></p>
      
      <div class="details">
        <h3 style="margin-top: 0;">Shift Details</h3>
        <p><strong>📅 Date:</strong> ${details.date}</p>
        <p><strong>📍 Area:</strong> ${details.area}</p>
        <p><strong>🎨 Shift:</strong> ${details.shiftColour}</p>
        ${
          details.approvedStartTime && details.approvedEndTime
            ? `<p><strong>🕐 Hours:</strong> ${details.approvedStartTime} – ${details.approvedEndTime}</p>`
            : ""
        }
      </div>
      
      <p>Please ensure you're available for the approved hours. If you have any questions, contact your manager.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Overtime Booking System.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getApplicationRejectedEmailHtml(
  userName: string,
  details: OvertimeDetails,
  isCapacityRejection: boolean
): string {
  const reason = isCapacityRejection
    ? "The overtime slot reached full capacity before your application could be approved."
    : details.rejectionReason || "No reason provided.";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 8px; }
    .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 8px; }
    .badge { display: inline-block; padding: 5px 10px; background: #ef4444; color: white; border-radius: 4px; font-weight: bold; }
    .details { background: white; padding: 15px; margin-top: 15px; border-radius: 4px; border-left: 4px solid #ef4444; }
    .reason { background: #fef2f2; padding: 10px; margin-top: 10px; border-radius: 4px; border-left: 3px solid #ef4444; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✗ Overtime Application ${
        isCapacityRejection ? "Not Approved" : "Rejected"
      }</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Unfortunately, your overtime application has been <span class="badge">REJECTED</span></p>
      
      <div class="details">
        <h3 style="margin-top: 0;">Shift Details</h3>
        <p><strong>📅 Date:</strong> ${details.date}</p>
        <p><strong>📍 Area:</strong> ${details.area}</p>
        <p><strong>🎨 Shift:</strong> ${details.shiftColour}</p>
        
        <div class="reason">
          <strong>Reason:</strong> ${reason}
        </div>
      </div>
      
      ${
        isCapacityRejection
          ? "<p>We encourage you to check for other available overtime opportunities.</p>"
          : "<p>If you have questions about this decision, please contact your manager.</p>"
      }
    </div>
    <div class="footer">
      <p>This is an automated message from the Overtime Booking System.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getApplicationCancelledEmailHtml(
  userName: string,
  details: OvertimeDetails
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 20px; border-radius: 8px; }
    .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 8px; }
    .badge { display: inline-block; padding: 5px 10px; background: #6b7280; color: white; border-radius: 4px; font-weight: bold; }
    .details { background: white; padding: 15px; margin-top: 15px; border-radius: 4px; border-left: 4px solid #6b7280; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Application Cancelled</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Your overtime application has been <span class="badge">CANCELLED</span></p>
      
      <div class="details">
        <h3 style="margin-top: 0;">Shift Details</h3>
        <p><strong>📅 Date:</strong> ${details.date}</p>
        <p><strong>📍 Area:</strong> ${details.area}</p>
        <p><strong>🎨 Shift:</strong> ${details.shiftColour}</p>
      </div>
      
      <p>You can apply for other available overtime opportunities.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Overtime Booking System.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getCancellationPendingEmailHtml(
  userName: string,
  details: OvertimeDetails
): string {
  return `
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
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Cancellation Request Submitted</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Your cancellation request has been submitted and is <span class="badge">PENDING APPROVAL</span></p>
      
      <div class="details">
        <h3 style="margin-top: 0;">Shift Details</h3>
        <p><strong>📅 Date:</strong> ${details.date}</p>
        <p><strong>📍 Area:</strong> ${details.area}</p>
        <p><strong>🎨 Shift:</strong> ${details.shiftColour}</p>
        ${
          details.cancellationReason
            ? `<div class="reason">
          <strong>Your Reason:</strong> ${details.cancellationReason}
        </div>`
            : ""
        }
      </div>
      
      <p>Your manager will review your cancellation request. You will remain assigned to this overtime until the cancellation is approved.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Overtime Booking System.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getCancellationApprovedEmailHtml(
  userName: string,
  details: OvertimeDetails
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px; }
    .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 8px; }
    .badge { display: inline-block; padding: 5px 10px; background: #10b981; color: white; border-radius: 4px; font-weight: bold; }
    .details { background: white; padding: 15px; margin-top: 15px; border-radius: 4px; border-left: 4px solid #10b981; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✓ Cancellation Approved</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Your cancellation request has been <span class="badge">APPROVED</span></p>
      
      <div class="details">
        <h3 style="margin-top: 0;">Shift Details</h3>
        <p><strong>📅 Date:</strong> ${details.date}</p>
        <p><strong>📍 Area:</strong> ${details.area}</p>
        <p><strong>🎨 Shift:</strong> ${details.shiftColour}</p>
      </div>
      
      <p>You are no longer assigned to this overtime shift.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Overtime Booking System.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getCancellationRejectedEmailHtml(
  userName: string,
  details: OvertimeDetails
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 8px; }
    .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 8px; }
    .badge { display: inline-block; padding: 5px 10px; background: #ef4444; color: white; border-radius: 4px; font-weight: bold; }
    .details { background: white; padding: 15px; margin-top: 15px; border-radius: 4px; border-left: 4px solid #ef4444; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✗ Cancellation Rejected</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Your cancellation request has been <span class="badge">REJECTED</span></p>
      
      <div class="details">
        <h3 style="margin-top: 0;">Shift Details</h3>
        <p><strong>📅 Date:</strong> ${details.date}</p>
        <p><strong>📍 Area:</strong> ${details.area}</p>
        <p><strong>🎨 Shift:</strong> ${details.shiftColour}</p>
      </div>
      
      <p>You remain assigned to this overtime shift. If you have questions, please contact your manager.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Overtime Booking System.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Send email to user (handles primary + secondary)
export async function sendApplicationStatusEmail(
  userEmails: { primary: string; secondary?: string | null },
  userName: string,
  status: ApplicationStatus,
  details: OvertimeDetails
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = getTransporter();

    // Determine email content based on status
    let subject: string;
    let html: string;

    switch (status) {
      case "APPROVED":
        subject = "✓ Overtime Application Approved";
        html = getApplicationApprovedEmailHtml(userName, details);
        break;
      case "REJECTED_MANUAL":
        subject = "✗ Overtime Application Rejected";
        html = getApplicationRejectedEmailHtml(userName, details, false);
        break;
      case "REJECTED_CAPACITY":
        subject = "✗ Overtime Application Not Approved";
        html = getApplicationRejectedEmailHtml(userName, details, true);
        break;
      case "CANCELLED":
        subject = "Application Cancelled";
        html = getApplicationCancelledEmailHtml(userName, details);
        break;
      case "CANCEL_PENDING":
        subject = "Cancellation Request Submitted";
        html = getCancellationPendingEmailHtml(userName, details);
        break;
      case "CANCELLATION_APPROVED":
        subject = "✓ Cancellation Approved";
        html = getCancellationApprovedEmailHtml(userName, details);
        break;
      case "CANCELLATION_REJECTED":
        subject = "✗ Cancellation Rejected";
        html = getCancellationRejectedEmailHtml(userName, details);
        break;
      default:
        console.warn("[Email] Unknown status:", status);
        return { success: false, error: "Unknown status" };
    }

    // Build recipient list
    const recipients = [userEmails.primary];
    if (userEmails.secondary) {
      recipients.push(userEmails.secondary);
    }

    // Send email
    const info = await transport.sendMail({
      from: fromEmail,
      to: recipients.join(", "),
      subject,
      html,
    });

    console.log("[Email] Sent application status email:", {
      messageId: info.messageId,
      recipients,
      status,
    });

    return { success: true };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Email] Failed to send application status email:", {
      error: errorMsg,
      status,
      userEmails,
    });

    return {
      success: false,
      error: errorMsg,
    };
  }
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
