import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/areas/[id] - Update area
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  const params = await context.params;

  try {
    const body = await req.json();
    const { name, enabled } = body;
    const { id } = params;

    const area = await prisma.area.findUnique({
      where: { id },
    });

    if (!area) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    const updateData: Partial<{ name: string; enabled: boolean }> = {};
    if (name !== undefined) updateData.name = name;
    if (enabled !== undefined) updateData.enabled = enabled;

    const updated = await prisma.area.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "AREA_UPDATED",
        entityType: "Area",
        entityId: id,
        creatorId: user!.id,
        changes: JSON.stringify({
          before: area,
          after: updated,
        }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update area:", err);
    return NextResponse.json(
      { error: "Failed to update area" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/areas/[id] - Delete area
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  const params = await context.params;

  try {
    const { id } = params;

    const area = await prisma.area.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            overtimeRequests: true,
          },
        },
      },
    });

    if (!area) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    // Check if area has overtime requests
    if (area._count.overtimeRequests > 0) {
      return NextResponse.json(
        { error: "Cannot delete area with existing overtime requests. Disable it instead." },
        { status: 400 }
      );
    }

    await prisma.area.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "AREA_DELETED",
        entityType: "Area",
        entityId: id,
        creatorId: user!.id,
        changes: JSON.stringify(area),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete area:", err);
    return NextResponse.json(
      { error: "Failed to delete area" },
      { status: 500 }
    );
  }
}
