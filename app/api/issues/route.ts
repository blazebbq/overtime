import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, badRequest, serverError } from "@/lib/auth";

// GET /api/issues - List all issues with filters
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["Admin", "User", "QA", "EngineeringManager"]).catch(() => null);
    if (!user) {
      return unauthorized();
    }

    const searchParams = request.nextUrl.searchParams;
    const walkdownId = searchParams.get("walkdownId");
    const buildingId = searchParams.get("buildingId");
    const floorId = searchParams.get("floorId");
    const roomId = searchParams.get("roomId");
    const status = searchParams.get("status");
    const issueTypeId = searchParams.get("issueTypeId");

    const issues = await prisma.issue.findMany({
      where: {
        ...(walkdownId && { walkdownId }),
        ...(buildingId && { buildingId }),
        ...(floorId && { floorId }),
        ...(roomId && { roomId }),
        ...(status && { status: status as any }),
        ...(issueTypeId && { issueTypeId }),
      },
      include: {
        room: true,
        issueType: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        rectifiedBy: {
          select: { id: true, name: true },
        },
        qaVerifiedBy: {
          select: { id: true, name: true },
        },
        photos: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(issues);
  } catch (error) {
    console.error("Error fetching issues:", error);
    return serverError();
  }
}

// POST /api/issues - Create a new issue
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["Admin", "User", "QA"]).catch(() => null);
    if (!user) {
      return unauthorized();
    }

    const body = await request.json();
    const {
      walkdownId,
      buildingId,
      floorId,
      roomId,
      issueTypeId,
      description,
      pinX,
      pinY,
      pinContext = "floor",
    } = body;

    if (!walkdownId || !buildingId || !floorId || !roomId || !issueTypeId || !description) {
      return badRequest("All required fields must be provided");
    }

    if (pinX === undefined || pinY === undefined) {
      return badRequest("Pin coordinates are required");
    }

    // Validate pin coordinates are normalized (0..1)
    if (pinX < 0 || pinX > 1 || pinY < 0 || pinY > 1) {
      return badRequest("Pin coordinates must be normalized between 0 and 1");
    }

    const issue = await prisma.issue.create({
      data: {
        walkdownId,
        buildingId,
        floorId,
        roomId,
        issueTypeId,
        description,
        pinX,
        pinY,
        pinContext,
        createdByUserId: user.id,
      },
      include: {
        room: true,
        issueType: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        photos: true,
      },
    });

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    console.error("Error creating issue:", error);
    return serverError();
  }
}
