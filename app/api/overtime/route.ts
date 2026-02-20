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
        where: user ? {
          OR: [
            { status: "APPROVED" },
            { userId: user.id } // Include current user's application regardless of status
          ]
        } : {
          status: "APPROVED"
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  // Transform data to include userApplication separately
  const overtimeWithUserApp = overtime.map(ot => {
    const userApplication = user 
      ? ot.applications.find(app => app.userId === user.id)
      : undefined;
    
    return {
      ...ot,
      userApplication: userApplication ? {
        id: userApplication.id,
        status: userApplication.status,
      } : undefined,
      // Keep applications as approved only for display
      applications: ot.applications.filter(app => app.status === "APPROVED"),
    };
  });

  // Apply filters based on approvedCount (new model)
  let filteredOvertime = overtimeWithUserApp;
  
  if (showAvailableOnly) {
    filteredOvertime = filteredOvertime.filter((ot) => ot.approvedCount < ot.requiredPeople);
  }

  if (showMyBookingsOnly && user) {
    filteredOvertime = filteredOvertime.filter((ot) =>
      ot.bookings.some((b) => b.userId === user.id)
    );
  }

  if (showMyApplicationsOnly && user) {
    filteredOvertime = filteredOvertime.filter((ot) =>
      ot.applications.some((app) => app.userId === user.id)
    );
  }

  return NextResponse.json(filteredOvertime);
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
