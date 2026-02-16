import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { wouldCreateBreach } from "@/lib/consecutive-days";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const searchParams = req.nextUrl.searchParams;
  const areaId = searchParams.get("areaId");
  const shiftColourId = searchParams.get("shiftColourId");
  const showAvailableOnly = searchParams.get("availableOnly") === "true";
  const showMyBookingsOnly = searchParams.get("myBookingsOnly") === "true";
  const showMyApplicationsOnly = searchParams.get("myApplicationsOnly") === "true";

  const where: {
    status: { in: string[] };
    areaId?: string;
    shiftColourId?: string;
  } = {
    status: { in: ["OPEN", "FULL"] },
  };

  if (areaId) {
    where.areaId = areaId;
  }

  if (shiftColourId) {
    where.shiftColourId = shiftColourId;
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
      applications: {
        where: {
          status: "APPROVED",
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  // Apply filters based on approvedCount (new model)
  if (showAvailableOnly) {
    overtime = overtime.filter((ot) => ot.approvedCount < ot.requiredPeople);
  }

  if (showMyBookingsOnly && user) {
    overtime = overtime.filter((ot) =>
      ot.bookings.some((b) => b.userId === user.id)
    );
  }

  if (showMyApplicationsOnly && user) {
    overtime = overtime.filter((ot) =>
      ot.applications.some((app) => app.userId === user.id)
    );
  }

  return NextResponse.json(overtime);
}

export async function POST(req: Request) {
  // DISABLED: Direct booking is no longer allowed.
  // All overtime must go through the application → approval flow.
  // Use /api/applications instead.
  
  return NextResponse.json(
    { 
      error: "Direct booking is disabled. Please apply through the application system.",
      redirect: "/dashboard/available"
    },
    { status: 403 }
  );
}
