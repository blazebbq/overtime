import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/users/[id]/areas - Get areas assigned to a user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    const userId = id;

    // Get all manager assignments for this user (where they are the managed user)
    const assignments = await prisma.managerAssignment.findMany({
      where: {
        userId: userId,
      },
      include: {
        area: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Extract unique area IDs from assignments
    const areaIds = assignments
      .filter((a) => a.areaId)
      .map((a) => a.areaId!)
      .filter((id, index, self) => self.indexOf(id) === index);

    return NextResponse.json({ areaIds });
  } catch (err) {
    console.error("Failed to fetch user areas:", err);
    return NextResponse.json(
      { error: "Failed to fetch user areas" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id]/areas - Set areas for a user
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    const userId = id;
    const body = await req.json();
    const { areaIds } = body;

    if (!Array.isArray(areaIds)) {
      return NextResponse.json(
        { error: "areaIds must be an array" },
        { status: 400 }
      );
    }

    // Verify user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Delete all existing area assignments for this user
    await prisma.managerAssignment.deleteMany({
      where: {
        userId: userId,
        areaId: { not: null },
      },
    });

    // Create new assignments for selected areas
    // We'll use the admin making the request as the "manager" for these assignments
    if (areaIds.length > 0) {
      const assignments = areaIds.map((areaId: string) => ({
        managerId: user!.id,
        userId: userId,
        areaId: areaId,
        shiftColourId: null,
      }));

      await prisma.managerAssignment.createMany({
        data: assignments,
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "USER_AREAS_UPDATED",
        entityType: "User",
        entityId: userId,
        creatorId: user!.id,
        affectedUserId: userId,
        changes: JSON.stringify({
          areaIds,
        }),
      },
    });

    return NextResponse.json({ success: true, areaIds });
  } catch (err) {
    console.error("Failed to update user areas:", err);
    return NextResponse.json(
      { error: "Failed to update user areas" },
      { status: 500 }
    );
  }
}
