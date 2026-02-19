import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, badRequest, serverError } from "@/lib/auth";

// GET /api/walkdowns - List all walkdowns with filters
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["Admin", "User", "QA", "EngineeringManager"]).catch(() => null);
    if (!user) {
      return unauthorized();
    }

    const searchParams = request.nextUrl.searchParams;
    const buildingId = searchParams.get("buildingId");
    const floorId = searchParams.get("floorId");
    const mode = searchParams.get("mode");
    const status = searchParams.get("status");

    const walkdowns = await prisma.walkdown.findMany({
      where: {
        ...(buildingId && { buildingId }),
        ...(floorId && { floorId }),
        ...(mode && { mode: mode as any }),
        ...(status && { status: status as any }),
      },
      include: {
        building: {
          select: { id: true, name: true },
        },
        floor: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { issues: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(walkdowns);
  } catch (error) {
    console.error("Error fetching walkdowns:", error);
    return serverError();
  }
}

// POST /api/walkdowns - Create a new walkdown
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["Admin", "User", "QA", "EngineeringManager"]).catch(() => null);
    if (!user) {
      return unauthorized();
    }

    const body = await request.json();
    const { walkdownId, buildingId, floorId, mode } = body;

    if (!walkdownId || !buildingId || !floorId || !mode) {
      return badRequest("Walkdown ID, building, floor, and mode are required");
    }

    const walkdown = await prisma.walkdown.create({
      data: {
        walkdownId,
        buildingId,
        floorId,
        mode,
        createdByUserId: user.id,
      },
      include: {
        building: true,
        floor: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(walkdown, { status: 201 });
  } catch (error) {
    console.error("Error creating walkdown:", error);
    return serverError();
  }
}
