import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, forbidden, badRequest, serverError } from "@/lib/auth";

// GET /api/floors - List all floors (with optional building filter)
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["Admin", "User", "QA", "EngineeringManager"]).catch(() => null);
    if (!user) {
      return unauthorized();
    }

    const searchParams = request.nextUrl.searchParams;
    const buildingId = searchParams.get("buildingId");

    const floors = await prisma.floor.findMany({
      where: buildingId ? { buildingId } : undefined,
      orderBy: { name: "asc" },
      include: {
        building: {
          select: {
            id: true,
            name: true,
          },
        },
        rooms: {
          select: {
            id: true,
            name: true,
            roomNumber: true,
          },
        },
      },
    });

    return NextResponse.json(floors);
  } catch (error) {
    console.error("Error fetching floors:", error);
    return serverError();
  }
}

// POST /api/floors - Create a new floor
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["Admin"]).catch(() => null);
    if (!user) {
      return user === null ? unauthorized() : forbidden();
    }

    const body = await request.json();
    const { buildingId, name, blueprintImageUrl, blueprintWidthPx, blueprintHeightPx } = body;

    if (!buildingId || !name) {
      return badRequest("Building ID and floor name are required");
    }

    const floor = await prisma.floor.create({
      data: {
        buildingId,
        name,
        blueprintImageUrl: blueprintImageUrl || null,
        blueprintWidthPx: blueprintWidthPx || null,
        blueprintHeightPx: blueprintHeightPx || null,
      },
    });

    return NextResponse.json(floor, { status: 201 });
  } catch (error) {
    console.error("Error creating floor:", error);
    return serverError();
  }
}
