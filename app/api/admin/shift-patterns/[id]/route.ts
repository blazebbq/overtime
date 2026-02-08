import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/shift-patterns/[id] - Update shift pattern
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  const params = await context.params;

  try {
    const body = await req.json();
    const { name, cycleLength, patternData } = body;
    const { id } = params;

    const shiftPattern = await prisma.shiftPattern.findUnique({
      where: { id },
    });

    if (!shiftPattern) {
      return NextResponse.json(
        { error: "Shift pattern not found" },
        { status: 404 }
      );
    }

    const updateData: {
      name?: string;
      cycleLength?: number;
      patternData?: string;
    } = {};

    // Validate and set name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || !name) {
        return NextResponse.json(
          { error: "Valid shift pattern name is required" },
          { status: 400 }
        );
      }

      // Check if another shift pattern with this name already exists
      if (name !== shiftPattern.name) {
        const existing = await prisma.shiftPattern.findUnique({
          where: { name },
        });

        if (existing) {
          return NextResponse.json(
            { error: "Shift pattern with this name already exists" },
            { status: 400 }
          );
        }
      }

      updateData.name = name;
    }

    // Validate and set cycleLength if provided
    if (cycleLength !== undefined) {
      if (
        typeof cycleLength !== "number" ||
        cycleLength < 1 ||
        cycleLength > 365
      ) {
        return NextResponse.json(
          { error: "Cycle length must be a number between 1 and 365" },
          { status: 400 }
        );
      }
      updateData.cycleLength = cycleLength;
    }

    // Validate and set patternData if provided
    if (patternData !== undefined) {
      if (typeof patternData !== "string") {
        return NextResponse.json(
          { error: "Pattern data must be a JSON string" },
          { status: 400 }
        );
      }

      let parsedPatternData;
      try {
        parsedPatternData = JSON.parse(patternData);
      } catch {
        return NextResponse.json(
          { error: "Pattern data must be valid JSON" },
          { status: 400 }
        );
      }

      // Use the new cycleLength if provided, otherwise use existing
      const targetCycleLength = cycleLength ?? shiftPattern.cycleLength;

      if (
        !parsedPatternData.days ||
        !Array.isArray(parsedPatternData.days) ||
        parsedPatternData.days.length !== targetCycleLength
      ) {
        return NextResponse.json(
          {
            error: `Pattern data must contain a "days" array with ${targetCycleLength} boolean values`,
          },
          { status: 400 }
        );
      }

      if (!parsedPatternData.days.every((day: unknown) => typeof day === "boolean")) {
        return NextResponse.json(
          { error: 'Pattern data "days" array must contain only boolean values' },
          { status: 400 }
        );
      }

      updateData.patternData = patternData;
    }

    const updated = await prisma.shiftPattern.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "SHIFT_PATTERN_UPDATED",
        entityType: "ShiftPattern",
        entityId: id,
        creatorId: user!.id,
        changes: JSON.stringify({
          before: shiftPattern,
          after: updated,
        }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update shift pattern:", err);
    return NextResponse.json(
      { error: "Failed to update shift pattern" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/shift-patterns/[id] - Delete shift pattern
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  const params = await context.params;

  try {
    const { id } = params;

    const shiftPattern = await prisma.shiftPattern.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userAssignments: true,
          },
        },
      },
    });

    if (!shiftPattern) {
      return NextResponse.json(
        { error: "Shift pattern not found" },
        { status: 404 }
      );
    }

    // Check if shift pattern has active user assignments
    if (shiftPattern._count.userAssignments > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete shift pattern with active user assignments. Remove assignments first.",
        },
        { status: 400 }
      );
    }

    await prisma.shiftPattern.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "SHIFT_PATTERN_DELETED",
        entityType: "ShiftPattern",
        entityId: id,
        creatorId: user!.id,
        changes: JSON.stringify(shiftPattern),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete shift pattern:", err);
    return NextResponse.json(
      { error: "Failed to delete shift pattern" },
      { status: 500 }
    );
  }
}
