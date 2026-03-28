import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/admin/manager-assignments/[id] - Remove manager assignment
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  const params = await context.params;

  try {
    const { id } = params;

    const assignment = await prisma.managerAssignment.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
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

    if (!assignment) {
      return NextResponse.json(
        { error: "Manager assignment not found" },
        { status: 404 }
      );
    }

    await prisma.managerAssignment.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "MANAGER_ASSIGNMENT_DELETED",
        entityType: "ManagerAssignment",
        entityId: id,
        creatorId: user!.id,
        affectedUserId: assignment.userId,
        changes: JSON.stringify(assignment),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete manager assignment:", err);
    return NextResponse.json(
      { error: "Failed to delete manager assignment" },
      { status: 500 }
    );
  }
}
