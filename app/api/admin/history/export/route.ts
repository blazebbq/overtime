import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// GET /api/admin/history/export - Export history as PDF
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const searchParams = req.nextUrl.searchParams;
    const userIds = searchParams.getAll("userIds");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (userIds.length === 0) {
      return NextResponse.json(
        { error: "At least one user must be selected" },
        { status: 400 }
      );
    }

    // Build the where clause (same as history route)
    const where: {
      userId: { in: string[] };
      status: string;
      overtime?: {
        date?: {
          gte?: Date;
          lte?: Date;
        };
      };
    } = {
      userId: { in: userIds },
      status: "APPROVED",
    };

    if (dateFrom || dateTo) {
      where.overtime = { date: {} };
      if (dateFrom && where.overtime.date) {
        where.overtime.date.gte = new Date(dateFrom);
      }
      if (dateTo && where.overtime.date) {
        where.overtime.date.lte = new Date(dateTo);
      }
    }

    // Fetch approved applications
    const applications = await prisma.overtimeApplication.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        overtime: {
          include: {
            area: true,
            shiftColour: true,
          },
        },
      },
      orderBy: [
        { overtime: { date: "desc" } },
        { user: { name: "asc" } },
      ],
    });

    // Get approver names
    const history = await Promise.all(
      applications.map(async (app) => {
        let approverName = null;
        if (app.approverId) {
          const approver = await prisma.user.findUnique({
            where: { id: app.approverId },
            select: { name: true },
          });
          approverName = approver?.name || null;
        }

        // Calculate hours
        const startTime = app.approvedStartTime || app.overtime.startTime;
        const endTime = app.approvedEndTime || app.overtime.endTime;
        const hours = calculateHours(startTime, endTime);

        return {
          userName: app.user.name,
          area: app.overtime.area.name,
          shiftColour: app.overtime.shiftColour.name,
          date: app.overtime.date.toISOString(),
          startTime,
          endTime,
          hours,
          status: app.status,
          approvedBy: approverName || "N/A",
        };
      })
    );

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    
    let yPosition = height - 50;

    // Title
    page.drawText("Overtime History Report", {
      x: 50,
      y: yPosition,
      size: 18,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    yPosition -= 25;

    // Export date
    page.drawText(`Export Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    yPosition -= 20;

    // Date range if specified
    if (dateFrom || dateTo) {
      const rangeText = `Period: ${dateFrom || "Start"} to ${dateTo || "End"}`;
      page.drawText(rangeText, {
        x: 50,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      yPosition -= 30;
    } else {
      yPosition -= 20;
    }

    // Table headers
    const headers = ["User", "Area", "Shift", "Date", "Hours", "Status", "Approved By"];
    const columnWidths = [80, 60, 60, 70, 50, 60, 80];
    const startX = 50;

    // Draw table header
    let xPosition = startX;
    headers.forEach((header, index) => {
      page.drawText(header, {
        x: xPosition,
        y: yPosition,
        size: 9,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      xPosition += columnWidths[index];
    });

    // Draw header line
    yPosition -= 5;
    page.drawLine({
      start: { x: startX, y: yPosition },
      end: { x: width - 50, y: yPosition },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    yPosition -= 15;

    // Draw table rows
    for (const record of history) {
      // Check if we need a new page
      if (yPosition < 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        yPosition = height - 50;
      }

      xPosition = startX;
      const row = [
        truncate(record.userName, 15),
        truncate(record.area, 10),
        truncate(record.shiftColour, 10),
        new Date(record.date).toLocaleDateString(),
        `${record.startTime}-${record.endTime}`,
        record.status,
        truncate(record.approvedBy, 15),
      ];

      row.forEach((cell, index) => {
        page.drawText(cell, {
          x: xPosition,
          y: yPosition,
          size: 8,
          font,
          color: rgb(0, 0, 0),
        });
        xPosition += columnWidths[index];
      });

      yPosition -= 15;
    }

    // Draw footer
    const totalRecords = history.length;
    page.drawText(`Total Records: ${totalRecords}`, {
      x: 50,
      y: 30,
      size: 9,
      font: fontBold,
      color: rgb(0.4, 0.4, 0.4),
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="overtime-history-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Error exporting PDF:", err);
    return NextResponse.json(
      { error: "Failed to export PDF" },
      { status: 500 }
    );
  }
}

function calculateHours(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  const diffMinutes = endMinutes - startMinutes;
  return Math.round((diffMinutes / 60) * 10) / 10;
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + "...";
}
