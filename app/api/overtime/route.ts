import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const overtime = await prisma.overtimeRequest.findMany({
    where: { status: { in: ["OPEN", "FULL"] } },
    orderBy: { date: "asc" },
    include: {
      bookings: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

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

  // 4️⃣ CREATE BOOKING
  await prisma.booking.create({
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

  return NextResponse.json({ ok: true, action: "booked" });
}
