import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// GET - Generate PDF for overtime rota
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!month || !year) {
      return NextResponse.json(
        { error: "month and year parameters are required" },
        { status: 400 }
      );
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { error: "month must be between 1 and 12" },
        { status: 400 }
      );
    }

    // Get first and last day of the month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    // Fetch all overtime requests for the month
    const overtimeRequests = await prisma.overtimeRequest.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        area: true,
        shiftColour: true,
        applications: {
          where: {
            status: "APPROVED",
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const monthName = new Date(yearNum, monthNum - 1, 1).toLocaleDateString(
      "en-GB",
      { month: "long" }
    );

    // Title
    let yPos = height - 50;
    page.drawText(`Overtime Rota – ${monthName} ${yearNum}`, {
      x: 50,
      y: yPos,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPos -= 40;

    // Table headers
    const headers = ["Date", "Area", "Shift", "Time", "Assigned Workers"];
    const colWidths = [100, 80, 80, 80, 200];
    let xPos = 50;

    headers.forEach((header, i) => {
      page.drawText(header, {
        x: xPos,
        y: yPos,
        size: 10,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      xPos += colWidths[i];
    });

    // Draw header line
    page.drawLine({
      start: { x: 50, y: yPos - 5 },
      end: { x: width - 50, y: yPos - 5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    yPos -= 20;

    // Table rows
    for (const overtime of overtimeRequests) {
      // Check if we need a new page
      if (yPos < 100) {
        const newPage = pdfDoc.addPage([595, 842]);
        yPos = height - 50;
        
        // Repeat headers on new page
        xPos = 50;
        headers.forEach((header, i) => {
          newPage.drawText(header, {
            x: xPos,
            y: yPos,
            size: 10,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
          xPos += colWidths[i];
        });

        newPage.drawLine({
          start: { x: 50, y: yPos - 5 },
          end: { x: width - 50, y: yPos - 5 },
          thickness: 1,
          color: rgb(0, 0, 0),
        });

        yPos -= 20;
      }

      const rowData = [
        overtime.date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
        overtime.area.name.substring(0, 12),
        overtime.shiftColour.name.substring(0, 12),
        `${overtime.startTime}-${overtime.endTime}`,
        overtime.applications
          .map((app) => app.user.name)
          .join(", ")
          .substring(0, 35),
      ];

      xPos = 50;
      const currentPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];

      rowData.forEach((data, i) => {
        currentPage.drawText(data || "-", {
          x: xPos,
          y: yPos,
          size: 9,
          font: font,
          color: rgb(0, 0, 0),
        });
        xPos += colWidths[i];
      });

      yPos -= 18;
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Return PDF
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="overtime-rota-${monthName}-${yearNum}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Error generating overtime rota PDF:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
