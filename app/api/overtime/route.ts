import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { wouldCreateBreach } from "@/lib/consecutive-days";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const searchParams = req.nextUrl.searchParams;
  const areaId = searchParams.get("areaId");
  const showAvailableOnly = searchParams.get("availableOnly") === "true";
  const showMyBookingsOnly = searchParams.get("myBookingsOnly") === "true";

  const where: any = {
    status: { in: ["OPEN", "FULL"] },
  };

  if (areaId) {
    where.areaId = areaId;
  }

  let overtime = await prisma.overtimeRequest.findMany({
    where,
    orderBy: { date: "asc" },
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

  // Apply filters
  if (showAvailableOnly) {
    overtime = overtime.filter((ot) => ot.bookings.length < ot.requiredPeople);
  }

  if (showMyBookingsOnly && user) {
    overtime = overtime.filter((ot) =>
      ot.bookings.some((b) => b.userId === user.id)
    );
  }

  return NextResponse.json(overtime);
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { overtimeId } = await req.json();

  const overtime = await prisma.overtimeRequest.findUnique({
    where: { id: overtimeId },
    include: { bookings: true },
  });

  if (!overtime) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 1️⃣ CHECK IF USER ALREADY BOOKED
  const existingBooking = await prisma.booking.findUnique({
    where: {
      userId_overtimeId: {
        userId: user.id,
        overtimeId,
      },
    },
  });

  // 2️⃣ CANCEL IS ALWAYS ALLOWED (EVEN IF FULL)
  if (existingBooking) {
    await prisma.booking.delete({
      where: { id: existingBooking.id },
    });

    const remaining = await prisma.booking.count({
      where: { overtimeId },
    });

    await prisma.overtimeRequest.update({
      where: { id: overtimeId },
      data: {
        status:
          remaining >= overtime.requiredPeople ? "FULL" : "OPEN",
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "BOOKING_CANCELLED",
        entityType: "Booking",
        entityId: existingBooking.id,
        creatorId: user.id,
        affectedUserId: user.id,
        changes: JSON.stringify({ overtimeId }),
      },
    });

    return NextResponse.json({ ok: true, action: "cancelled" });
  }

  // 3️⃣ BLOCK ONLY NEW BOOKINGS IF FULL
  const currentCount = overtime.bookings.length;

  if (currentCount >= overtime.requiredPeople) {
    await prisma.overtimeRequest.update({
      where: { id: overtimeId },
      data: { status: "FULL" },
    });

    return NextResponse.json(
      { error: "Shift is full" },
      { status: 400 }
    );
  }

  // 4️⃣ CHECK FOR CONSECUTIVE DAY BREACH (warning only, not blocking)
  let breachWarning = false;
  let consecutiveDays = 0;
  try {
    const breachCheck = await wouldCreateBreach(user.id, overtime.date);
    breachWarning = breachCheck.wouldBreach;
    consecutiveDays = breachCheck.consecutiveDaysAfter;
  } catch (err) {
    console.error("Failed to check consecutive days:", err);
    // Continue with booking even if check fails
  }

  // 5️⃣ CREATE BOOKING
  const booking = await prisma.booking.create({
    data: {
      userId: user.id,
      overtimeId,
    },
  });

  const newCount = currentCount + 1;

  await prisma.overtimeRequest.update({
    where: { id: overtimeId },
    data: {
      status:
        newCount >= overtime.requiredPeople ? "FULL" : "OPEN",
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: "BOOKING_CREATED",
      entityType: "Booking",
      entityId: booking.id,
      creatorId: user.id,
      affectedUserId: user.id,
      changes: JSON.stringify({ 
        overtimeId, 
        breachWarning, 
        consecutiveDays 
      }),
    },
  });

  return NextResponse.json({ 
    ok: true, 
    action: "booked",
    breachWarning,
    consecutiveDays,
  });
}
