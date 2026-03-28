import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/manager-assignments - List all manager assignments with details
export async function GET() {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  try {
    const assignments = await prisma.managerAssignment.findMany({
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        area: {
          select: {
            id: true,
            name: true,
          },
        },
        shiftColour: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { manager: { name: "asc" } },
        { user: { name: "asc" } },
      ],
    });

    return NextResponse.json(assignments);
  } catch (err) {
    console.error("Failed to fetch manager assignments:", err);
    return NextResponse.json(
      { error: "Failed to fetch manager assignments" },
      { status: 500 }
    );
  }
}

// POST /api/admin/manager-assignments - Create new manager assignment
export async function POST(req: NextRequest) {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const { managerId, userId, areaId, shiftColourId } = body;

    // Validate required fields
    if (!managerId || typeof managerId !== "string") {
      return NextResponse.json(
        { error: "Valid managerId is required" },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Valid userId is required" },
        { status: 400 }
      );
    }

    // Validate managerId and userId are not the same
    if (managerId === userId) {
      return NextResponse.json(
        { error: "Manager cannot be assigned to themselves" },
        { status: 400 }
      );
    }

    // Validate manager exists and has appropriate role
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
    });

    if (!manager) {
      return NextResponse.json(
        { error: "Manager not found" },
        { status: 404 }
      );
    }

    if (!["MANAGER", "ADMIN", "SUPER_ADMIN"].includes(manager.role)) {
      return NextResponse.json(
        { error: "Manager must have MANAGER, ADMIN, or SUPER_ADMIN role" },
        { status: 400 }
      );
    }

    // Validate user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Validate areaId if provided
    if (areaId) {
      if (typeof areaId !== "string") {
        return NextResponse.json(
          { error: "Valid areaId is required if provided" },
          { status: 400 }
        );
      }

      const area = await prisma.area.findUnique({
        where: { id: areaId },
      });

      if (!area) {
        return NextResponse.json(
          { error: "Area not found" },
          { status: 404 }
        );
      }
    }

    // Validate shiftColourId if provided
    if (shiftColourId) {
      if (typeof shiftColourId !== "string") {
        return NextResponse.json(
          { error: "Valid shiftColourId is required if provided" },
          { status: 400 }
        );
      }

      const shiftColour = await prisma.shiftColour.findUnique({
        where: { id: shiftColourId },
      });

      if (!shiftColour) {
        return NextResponse.json(
          { error: "Shift colour not found" },
          { status: 404 }
        );
      }
    }

    // Check for duplicate assignment
    const existing = await prisma.managerAssignment.findFirst({
      where: {
        managerId,
        userId,
        areaId: areaId || null,
        shiftColourId: shiftColourId || null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This manager assignment already exists" },
        { status: 400 }
      );
    }

    // Create the assignment
    const assignment = await prisma.managerAssignment.create({
      data: {
        managerId,
        userId,
        areaId: areaId || null,
        shiftColourId: shiftColourId || null,
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        area: {
          select: {
            id: true,
            name: true,
          },
        },
        shiftColour: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "MANAGER_ASSIGNMENT_CREATED",
        entityType: "ManagerAssignment",
        entityId: assignment.id,
        creatorId: user!.id,
        affectedUserId: userId,
        changes: JSON.stringify({
          managerId,
          userId,
          areaId: areaId || null,
          shiftColourId: shiftColourId || null,
        }),
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (err) {
    console.error("Failed to create manager assignment:", err);
    return NextResponse.json(
      { error: "Failed to create manager assignment" },
      { status: 500 }
    );
  }
}
