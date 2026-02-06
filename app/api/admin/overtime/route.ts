import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

// Create new overtime request
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const { date, shift, startTime, endTime, requiredPeople } = body;

    // Validation
    if (!date || !shift || !startTime || !endTime || !requiredPeople) {
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

    const validShifts = ["YELLOW", "ORANGE", "PURPLE", "GREEN"];
    if (!validShifts.includes(shift)) {
      return NextResponse.json(
        { error: "Invalid shift type" },
        { status: 400 }
      );
    }

    const overtime = await prisma.overtimeRequest.create({
      data: {
        date: new Date(date),
        shift,
        startTime,
        endTime,
        requiredPeople: parseInt(requiredPeople),
        status: "OPEN",
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
