import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, serverError } from "@/lib/auth";

// GET /api/floors/:id/outstanding - Get all outstanding issues for a floor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["Admin", "User", "QA", "EngineeringManager"]).catch(() => null);
    if (!user) {
      return unauthorized();
    }

    const { id } = await params;

    // Get all Open and InProgress issues for this floor
    const issues = await prisma.issue.findMany({
      where: {
        floorId: id,
        status: {
          in: ["Open", "InProgress"],
        },
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
        photos: {
          orderBy: { createdAt: "asc" },
        },
        walkdown: {
          select: {
            id: true,
            walkdownId: true,
            mode: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get the floor details
    const floor = await prisma.floor.findUnique({
      where: { id },
      include: {
        building: {
          select: { id: true, name: true },
        },
        rooms: {
          select: {
            id: true,
            name: true,
            roomNumber: true,
            polygonJson: true,
          },
        },
      },
    });

    if (!floor) {
      return NextResponse.json({ error: "Floor not found" }, { status: 404 });
    }

    // Calculate summary statistics
    const summary = {
      total: issues.length,
      byType: {} as Record<string, number>,
      byRoom: {} as Record<string, number>,
      byStatus: {
        Open: 0,
        InProgress: 0,
      },
    };

    issues.forEach((issue) => {
      // Count by type
      const typeName = issue.issueType.name;
      summary.byType[typeName] = (summary.byType[typeName] || 0) + 1;

      // Count by room
      const roomKey = `${issue.room.roomNumber} - ${issue.room.name}`;
      summary.byRoom[roomKey] = (summary.byRoom[roomKey] || 0) + 1;

      // Count by status
      if (issue.status === "Open") {
        summary.byStatus.Open++;
      } else if (issue.status === "InProgress") {
        summary.byStatus.InProgress++;
      }
    });

    return NextResponse.json({
      floor,
      issues,
      summary,
    });
  } catch (error) {
    console.error("Error fetching outstanding issues:", error);
    return serverError();
  }
}
