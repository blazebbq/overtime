import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

// Create new overtime request
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const { date, areaId, shiftColourId, startTime, endTime, requiredPeople } = body;

    // Validation
    if (!date || !areaId || !shiftColourId || !startTime || !endTime || !requiredPeople) {
      return NextResponse.json(
        { error: "All fields are required" },
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

    // Verify shift colour exists and is enabled
    const shiftColour = await prisma.shiftColour.findUnique({
      where: { id: shiftColourId },
    });

    if (!shiftColour) {
      return NextResponse.json(
        { error: "Invalid shift colour" },
        { status: 400 }
      );
    }

    // Verify the shift colour is available for this area
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

    const overtime = await prisma.overtimeRequest.create({
      data: {
        date: new Date(date),
        areaId,
        shiftColourId,
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
          shiftColourId,
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
  const { user, error } = await requireAdmin();
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
