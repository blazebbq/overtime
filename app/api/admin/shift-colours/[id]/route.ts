import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/shift-colours/[id] - Update shift colour
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  const params = await context.params;

  try {
    const body = await req.json();
    const { name, hexColor, enabled } = body;
    const { id } = params;

    const shiftColour = await prisma.shiftColour.findUnique({
      where: { id },
    });

    if (!shiftColour) {
      return NextResponse.json({ error: "Shift colour not found" }, { status: 404 });
    }

    const updateData: Partial<{ name: string; hexColor: string; enabled: boolean }> = {};
    
    if (name !== undefined) {
      if (typeof name !== "string" || !name) {
        return NextResponse.json(
          { error: "Valid shift colour name is required" },
          { status: 400 }
        );
      }
      updateData.name = name;
    }
    
    if (hexColor !== undefined) {
      if (typeof hexColor !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
        return NextResponse.json(
          { error: "Valid hex color is required (e.g., #FFD700)" },
          { status: 400 }
        );
      }
      updateData.hexColor = hexColor;
    }
    
    if (enabled !== undefined) {
      updateData.enabled = enabled;
    }

    const updated = await prisma.shiftColour.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "SHIFT_COLOUR_UPDATED",
        entityType: "ShiftColour",
        entityId: id,
        creatorId: user!.id,
        changes: JSON.stringify({
          before: shiftColour,
          after: updated,
        }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update shift colour:", err);
    return NextResponse.json(
      { error: "Failed to update shift colour" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/shift-colours/[id] - Delete shift colour
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  const params = await context.params;

  try {
    const { id } = params;

    const shiftColour = await prisma.shiftColour.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            overtimeRequests: true,
          },
        },
      },
    });

    if (!shiftColour) {
      return NextResponse.json({ error: "Shift colour not found" }, { status: 404 });
    }

    // Check if shift colour has overtime requests
    if (shiftColour._count.overtimeRequests > 0) {
      return NextResponse.json(
        { error: "Cannot delete shift colour with existing overtime requests. Disable it instead." },
        { status: 400 }
      );
    }

    await prisma.shiftColour.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "SHIFT_COLOUR_DELETED",
        entityType: "ShiftColour",
        entityId: id,
        creatorId: user!.id,
        changes: JSON.stringify(shiftColour),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete shift colour:", err);
    return NextResponse.json(
      { error: "Failed to delete shift colour" },
      { status: 500 }
    );
  }
}
