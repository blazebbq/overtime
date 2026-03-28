import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/history - Get overtime history
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

    // Build the where clause
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
          id: app.id,
          userName: app.user.name,
          userEmail: app.user.email,
          area: app.overtime.area.name,
          shiftColour: app.overtime.shiftColour.name,
          shiftHexColor: app.overtime.shiftColour.hexColor,
          date: app.overtime.date.toISOString(),
          startTime,
          endTime,
          hours,
          status: app.status,
          approvedBy: approverName,
        };
      })
    );

    return NextResponse.json(history);
  } catch (err) {
    console.error("Error fetching history:", err);
    return NextResponse.json(
      { error: "Failed to fetch history" },
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
  return Math.round((diffMinutes / 60) * 10) / 10; // Round to 1 decimal
}
