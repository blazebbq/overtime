import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET - Get overtime rota data for a specific month
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
    const areaIdsParam = searchParams.get("areaIds");

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

    // Parse areaIds if provided
    let areaIds: string[] | undefined;
    if (areaIdsParam) {
      try {
        areaIds = JSON.parse(areaIdsParam);
      } catch {
        // Fallback to comma-separated
        areaIds = areaIdsParam.split(",").filter(Boolean);
      }
    }

    // Build where clause
    const where: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Add area filter if provided
    if (areaIds && areaIds.length > 0) {
      where.areaId = { in: areaIds };
    }

    // Fetch all overtime requests for the month
    const overtimeRequests = await prisma.overtimeRequest.findMany({
      where,
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

    // Format data for rota
    const rotaData = overtimeRequests.map((overtime) => ({
      id: overtime.id,
      date: overtime.date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      dateObj: overtime.date,
      area: overtime.area.name,
      shift: overtime.shiftColour.name,
      shiftColor: overtime.shiftColour.hexColor,
      startTime: overtime.startTime,
      endTime: overtime.endTime,
      time: `${overtime.startTime} – ${overtime.endTime}`,
      assignedWorkers: overtime.applications
        .map((app) => app.user.name)
        .join(", "),
      requiredPeople: overtime.requiredPeople,
      approvedCount: overtime.approvedCount,
    }));

    return NextResponse.json({
      month: monthNum,
      year: yearNum,
      monthName: new Date(yearNum, monthNum - 1, 1).toLocaleDateString("en-GB", {
        month: "long",
      }),
      data: rotaData,
    });
  } catch (err) {
    console.error("Error fetching overtime rota:", err);
    return NextResponse.json(
      { error: "Failed to fetch overtime rota" },
      { status: 500 }
    );
  }
}
