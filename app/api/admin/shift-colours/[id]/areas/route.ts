import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/shift-colours/[id]/areas - Assign shift colour to areas
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  const params = await context.params;

  try {
    const body = await req.json();
    const { areaIds } = body;
    const { id: shiftColourId } = params;

    // Validate shiftColourId
    const shiftColour = await prisma.shiftColour.findUnique({
      where: { id: shiftColourId },
    });

    if (!shiftColour) {
      return NextResponse.json(
        { error: "Shift colour not found" },
        { status: 404 }
      );
    }

    // Validate areaIds
    if (!Array.isArray(areaIds) || areaIds.length === 0) {
      return NextResponse.json(
        { error: "Array of area IDs is required" },
        { status: 400 }
      );
    }

    // Check that all areas exist
    const areas = await prisma.area.findMany({
      where: { id: { in: areaIds } },
    });

    if (areas.length !== areaIds.length) {
      return NextResponse.json(
        { error: "One or more area IDs are invalid" },
        { status: 400 }
      );
    }

    // Delete existing associations for this shift colour
    await prisma.areaShiftColour.deleteMany({
      where: { shiftColourId },
    });

    // Create new associations
    const associations = await prisma.areaShiftColour.createMany({
      data: areaIds.map((areaId: string) => ({
        shiftColourId,
        areaId,
      })),
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "SHIFT_COLOUR_AREAS_ASSIGNED",
        entityType: "ShiftColour",
        entityId: shiftColourId,
        creatorId: user!.id,
        changes: JSON.stringify({
          shiftColourName: shiftColour.name,
          areaIds,
          areaNames: areas.map((a) => a.name),
        }),
      },
    });

    // Fetch updated shift colour with associations
    const updated = await prisma.shiftColour.findUnique({
      where: { id: shiftColourId },
      include: {
        areas: {
          include: {
            area: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to assign areas to shift colour:", err);
    return NextResponse.json(
      { error: "Failed to assign areas to shift colour" },
      { status: 500 }
    );
  }
}
