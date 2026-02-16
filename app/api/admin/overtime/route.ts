import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

// Create new overtime request
export async function POST(req: Request) {
  const { user, error } = await requireManagerOrAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const { date, areaId, shiftColourId, areaShiftColourId, startTime, endTime, requiredPeople } = body;

    // Validation
    if (!date || !areaId || !startTime || !endTime || !requiredPeople) {
      return NextResponse.json(
        { error: "Date, area, times, and required people are required" },
        { status: 400 }
      );
    }

    if (requiredPeople < 1 || requiredPeople > 10) {
      return NextResponse.json(
        { error: "Required people must be between 1 and 10" },
        { status: 400 }
      );
    }

    // Verify area exists and is enabled
    const area = await prisma.area.findUnique({
      where: { id: areaId },
    });

    if (!area) {
      return NextResponse.json(
        { error: "Invalid area" },
        { status: 400 }
      );
    }

    // Use areaShiftColourId if provided (preferred), otherwise use shiftColourId for backward compatibility
    let finalAreaShiftColourId = areaShiftColourId;
    let finalShiftColourId = shiftColourId;

    if (areaShiftColourId) {
      // Verify the areaShiftColour exists
      const areaShiftColour = await prisma.areaShiftColour.findUnique({
        where: { id: areaShiftColourId },
        include: { shiftColour: true },
      });

      if (!areaShiftColour) {
        return NextResponse.json(
          { error: "Invalid area-shift colour combination" },
          { status: 400 }
        );
      }

      // Ensure it matches the selected area
      if (areaShiftColour.areaId !== areaId) {
        return NextResponse.json(
          { error: "Area-shift colour combination does not match selected area" },
          { status: 400 }
        );
      }

      finalShiftColourId = areaShiftColour.shiftColourId;
    } else if (shiftColourId) {
      // Backward compatibility: if only shiftColourId provided, verify and find areaShiftColourId
      const shiftColour = await prisma.shiftColour.findUnique({
        where: { id: shiftColourId },
      });

      if (!shiftColour) {
        return NextResponse.json(
          { error: "Invalid shift colour" },
          { status: 400 }
        );
      }

      // Find the AreaShiftColour relation
      const areaShiftColour = await prisma.areaShiftColour.findUnique({
        where: {
          areaId_shiftColourId: {
            areaId,
            shiftColourId,
          },
        },
      });

      if (!areaShiftColour) {
        return NextResponse.json(
          { error: "This shift colour is not available for the selected area" },
          { status: 400 }
        );
      }

      finalAreaShiftColourId = areaShiftColour.id;
    } else {
      return NextResponse.json(
        { error: "Either areaShiftColourId or shiftColourId is required" },
        { status: 400 }
      );
    }

    const overtime = await prisma.overtimeRequest.create({
      data: {
        date: new Date(date),
        areaId,
        shiftColourId: finalShiftColourId,
        areaShiftColourId: finalAreaShiftColourId,
        startTime,
        endTime,
        requiredPeople: parseInt(requiredPeople),
        status: "OPEN",
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "OVERTIME_CREATED",
        entityType: "OvertimeRequest",
        entityId: overtime.id,
        creatorId: user!.id,
        changes: JSON.stringify({
          date,
          areaId,
          shiftColourId: finalShiftColourId,
          areaShiftColourId: finalAreaShiftColourId,
          startTime,
          endTime,
          requiredPeople,
        }),
      },
    });

    return NextResponse.json(overtime);
  } catch (err) {
    console.error("Error creating overtime:", err);
    return NextResponse.json(
      { error: "Failed to create overtime request" },
      { status: 500 }
    );
  }
}

// Get all overtime requests (including archived)
export async function GET() {
  const { user, error } = await requireManagerOrAdmin();
  if (error) return error;

  try {
    const overtime = await prisma.overtimeRequest.findMany({
      orderBy: { date: "desc" },
      include: {
        area: true,
        shiftColour: true,
        bookings: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json(overtime);
  } catch (err) {
    console.error("Error fetching overtime:", err);
    return NextResponse.json(
      { error: "Failed to fetch overtime requests" },
      { status: 500 }
    );
  }
}
