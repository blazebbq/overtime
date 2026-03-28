import nodemailer from "nodemailer";
import { prisma } from "./prisma";

export type ApplicationStatus =
  | "APPROVED"
  | "REJECTED_MANUAL"
  | "REJECTED_CAPACITY"
  | "CANCELLED"
  | "WITHDRAWN"
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

interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user?: string | null;
  password?: string | null;
  fromEmail: string;
  updatedAt?: Date;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeHexColor(color: string, fallback = "#2563eb"): string {
  const value = color.trim();
  if (/^#?[0-9a-fA-F]{6}$/.test(value)) {
    return value.startsWith("#") ? value : `#${value}`;
  }
  return fallback;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function normalizeRecipients(recipients: Array<string | null | undefined>): string[] {
  return recipients
    .map((r) => (r ?? "").trim())
    .filter((r) => r.length > 0 && isValidEmail(r));
}

async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const config = (await prisma.smtpConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    })) as SmtpConfig | null;

    if (!config || !config.enabled) {
      console.log("[Email Disabled] SMTP config not found or disabled");
      return null;
    }

    return config;
  } catch (error) {
    console.error("[Email] Failed to fetch SMTP config:", error);
    return null;
  }
}

async function getTransporter() {
  const config = await getSmtpConfig();
  if (!config) return null;

  const port = Number(config.port);
  const secure = Boolean(config.secure);

  const transportConfig: any = {
    host: config.host,
    port,
    secure,
  };

  if (config.user && config.password) {
    transportConfig.auth = {
      user: config.user,
      pass: config.password,
    };
  }

  if (!secure && port === 587) {
    transportConfig.requireTLS = true;
  }

  if (process.env.SMTP_ALLOW_SELF_SIGNED === "true") {
    transportConfig.tls = {
      rejectUnauthorized: false,
    };
  }

  const transporter = nodemailer.createTransport(transportConfig);

  try {
    await transporter.verify();
  } catch (error) {
    console.error("[Email] SMTP verification failed:", error);
    return null;
  }

  return transporter;
}

function baseEmailHtml(
  title: string,
  accentColor: string,
  innerHtml: string
): string {
  const safeAccent = sanitizeHexColor(accentColor);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #ffffff; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, ${safeAccent} 0%, ${safeAccent}dd 100%); color: white; padding: 20px; border-radius: 8px; }
    .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 8px; }
    .badge { display: inline-block; padding: 5px 10px; border-radius: 4px; font-weight: bold; color: white; }
    .details { background: white; padding: 15px; margin-top: 15px; border-radius: 4px; border-left: 4px solid ${safeAccent}; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
    .reason { background: #fff7ed; padding: 10px; margin-top: 10px; border-radius: 4px; border-left: 3px solid ${safeAccent}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">${title}</h1>
    </div>
    ${innerHtml}
  </div>
</body>
</html>
  `.trim();
}

function getApplicationApprovedEmailHtml(
  userName: string,
  details: OvertimeDetails
): string {
  const accent = sanitizeHexColor(details.shiftHexColor);
  const name = escapeHtml(userName);
  const date = escapeHtml(details.date);
  const area = escapeHtml(details.area);
  const shift = escapeHtml(details.shiftColour);
  const start = details.approvedStartTime ? escapeHtml(details.approvedStartTime) : "";
  const end = details.approvedEndTime ? escapeHtml(details.approvedEndTime) : "";

  return baseEmailHtml(
    "✓ Overtime Application Approved",
    accent,
    `
    <div class="content">
      <p>Hi ${name},</p>
      <p>Great news! Your overtime application has been <span class="badge" style="background:#10b981;">APPROVED</span></p>

      <div class="details">
        <h3 style="margin-top: 0;">Shift Details</h3>
        <p><strong>📅 Date:</strong> ${date}</p>
        <p><strong>📍 Area:</strong> ${area}</p>
        <p><strong>🎨 Shift:</strong> ${shift}</p>
        ${start && end ? `<p><strong>🕐 Hours:</strong> ${start} – ${end}</p>` : ""}
      </div>

      <p>Please ensure you're available for the approved hours. If you have any questions, contact your manager.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Overtime Booking System.</p>
    </div>
    `
  );
}

function getApplicationRejectedEmailHtml(
  userName: string,
  details: OvertimeDetails,
  isCapacityRejection: boolean
): string {
  const name = escapeHtml(userName);
  const date = escapeHtml(details.date);
  const area = escapeHtml(details.area);
  const shift = escapeHtml(details.shiftColour);
  const reason = isCapacityRejection
    ? "The overtime slot reached full capacity before your application could be approved."
    : escapeHtml(details.rejectionReason || "No reason provided.");

  return baseEmailHtml(
    `✗ Overtime Application ${isCapacityRejection ? "Not Approved" : "Rejected"}`,
    "#ef4444",
    `
    <div class="content">
      <p>Hi ${name},</p>
      <p>Unfortunately, your overtime application has been <span class="badge" style="background:#ef4444;">REJECTED</span></p>

      <div class="details">
        <h3 style="margin-top: 0;">Shift Details</h3>
        <p><strong>📅 Date:</strong> ${date}</p>
        <p><strong>📍 Area:</strong> ${area}</p>
        <p><strong>🎨 Shift:</strong> ${shift}</p>

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
    `
  );
}

function getApplicationCancelledEmailHtml(
  userName: string,
  details: OvertimeDetails
): string {
  const name = escapeHtml(userName);
  const date = escapeHtml(details.date);
  const area = escapeHtml(details.area);
  const shift = escapeHtml(details.shiftColour);

  return baseEmailHtml(
    "Application Cancelled",
    "#6b7280",
    `
    <div class="content">
      <p>Hi ${name},</p>
      <p>Your overtime application has been <span class="badge" style="background:#6b7280;">CANCELLED</span></p>

      <div class="details">
        <h3 style="margin-top: 0;">Shift Details</h3>
        <p><strong>📅 Date:</strong> ${date}</p>
        <p><strong>📍 Area:</strong> ${area}</p>
        <p><strong>🎨 Shift:</strong> ${shift}</p>
      </div>

      <p>You can apply for other available overtime opportunities.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Overtime Booking System.</p>
    </div>
    `
  );
}

function getCancellationPendingEmailHtml(
  userName: string,
  details: OvertimeDetails
): string {
  const name = escapeHtml(userName);
  const date = escapeHtml(details.date);
  const area = escapeHtml(details.area);
  const shift = escapeHtml(details.shiftColour);
  const reason = details.cancellationReason ? escapeHtml(details.cancellationReason) : "";

  return baseEmailHtml(
    "Cancellation Request Submitted",
    "#f59e0b",
    `
    <div class="content">
      <p>Hi ${name},</p>
      <p>Your cancellation request has been submitted and is <span class="badge" style="background:#f59e0b;">PENDING APPROVAL</span></p>

      <div class="details">
        <h3 style="margin-top: 0;">Shift Details</h3>
        <p><strong>📅 Date:</strong> ${date}</p>
        <p><strong>📍 Area:</strong> ${area}</p>
        <p><strong>🎨 Shift:</strong> ${shift}</p>
        ${reason ? `<div class="reason"><strong>Your Reason:</strong> ${reason}</div>` : ""}
      </div>

      <p>Your manager will review your cancellation request. You will remain assigned to this overtime until the cancellation is approved.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Overtime Booking System.</p>
    </div>
    `
  );
}

function getCancellationApprovedEmailHtml(
  userName: string,
  details: OvertimeDetails
): string {
  const name = escapeHtml(userName);
  const date = escapeHtml(details.date);
  const area = escapeHtml(details.area);
  const shift = escapeHtml(details.shiftColour);

  return baseEmailHtml(
    "✓ Cancellation Approved",
    "#10b981",
    `
    <div class="content">
      <p>Hi ${name},</p>
      <p>Your cancellation request has been <span class="badge" style="background:#10b981;">APPROVED</span></p>

      <div class="details">
        <h3 style="margin-top: 0;">Shift Details</h3>
        <p><strong>📅 Date:</strong> ${date}</p>
        <p><strong>📍 Area:</strong> ${area}</p>
        <p><strong>🎨 Shift:</strong> ${shift}</p>
      </div>

      <p>You are no longer assigned to this overtime shift.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Overtime Booking System.</p>
    </div>
    `
  );
}

function getCancellationRejectedEmailHtml(
  userName: string,
  details: OvertimeDetails
): string {
  const name = escapeHtml(userName);
  const date = escapeHtml(details.date);
  const area = escapeHtml(details.area);
  const shift = escapeHtml(details.shiftColour);

  return baseEmailHtml(
    "✗ Cancellation Rejected",
    "#ef4444",
    `
    <div class="content">
      <p>Hi ${name},</p>
      <p>Your cancellation request has been <span class="badge" style="background:#ef4444;">REJECTED</span></p>

      <div class="details">
        <h3 style="margin-top: 0;">Shift Details</h3>
        <p><strong>📅 Date:</strong> ${date}</p>
        <p><strong>📍 Area:</strong> ${area}</p>
        <p><strong>🎨 Shift:</strong> ${shift}</p>
      </div>

      <p>You remain assigned to this overtime shift. If you have questions, please contact your manager.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Overtime Booking System.</p>
    </div>
    `
  );
}

async function sendMail(
  to: string | string[],
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = await getTransporter();
    if (!transport) {
      console.log("[Email Disabled] Skipping email send - SMTP not configured or invalid");
      return { success: false, error: "Email service disabled or SMTP invalid" };
    }

    const config = await getSmtpConfig();
    if (!config) {
      return { success: false, error: "Email service disabled" };
    }

    const recipients = normalizeRecipients(Array.isArray(to) ? to : [to]);
    if (recipients.length === 0) {
      return { success: false, error: "No valid recipient email addresses" };
    }

    if (!isValidEmail(config.fromEmail)) {
      return { success: false, error: "Invalid from email address" };
    }

    const info = await transport.sendMail({
      from: config.fromEmail.trim(),
      to: recipients.join(", "),
      subject,
      html,
    });

    console.log("[Email] Email sent:", {
      messageId: info.messageId,
      recipients,
      subject,
    });

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Email] Failed to send email:", {
      error: errorMsg,
      subject,
      to,
    });
    return { success: false, error: errorMsg };
  }
}

// Send email to user (handles primary + secondary)
export async function sendApplicationStatusEmail(
  userEmails: { primary: string; secondary?: string | null },
  userName: string,
  status: ApplicationStatus,
  details: OvertimeDetails,
  applicationId?: string
): Promise<{ success: boolean; error?: string }> {
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
    case "WITHDRAWN":
      subject = "Application Withdrawn";
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

  const recipients = normalizeRecipients([
    userEmails.primary,
    userEmails.secondary ?? undefined,
  ]);

  if (recipients.length === 0) {
    return { success: false, error: "No valid recipient email addresses" };
  }

  const result = await sendMail(recipients, subject, html);

  if (result.success) {
    console.log(
      `[Email] Sent application status email: ${status} to ${recipients.join(", ")}${
        applicationId ? ` for application ${applicationId}` : ""
      }`
    );
  }

  return result;
}

// Validate email format
export function isValidEmailAddress(email: string): boolean {
  return isValidEmail(email);
}

export { isValidEmailAddress as isValidEmail };

// Generic email sender for admin actions
export async function sendGenericEmail(
  to: string | string[],
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  return sendMail(to, subject, html);
}
