import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/shift-patterns/[id]/assign - Assign shift pattern to users
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  const params = await context.params;

  try {
    const body = await req.json();
    const { userIds, startDate } = body;
    const { id: shiftPatternId } = params;

    // Validate shift pattern exists
    const shiftPattern = await prisma.shiftPattern.findUnique({
      where: { id: shiftPatternId },
    });

    if (!shiftPattern) {
      return NextResponse.json(
        { error: "Shift pattern not found" },
        { status: 404 }
      );
    }

    // Validate userIds
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!userIds.every((id) => typeof id === "string")) {
      return NextResponse.json(
        { error: "All user IDs must be strings" },
        { status: 400 }
      );
    }

    // Validate startDate
    if (!startDate || typeof startDate !== "string") {
      return NextResponse.json(
        { error: "startDate is required and must be an ISO date string" },
        { status: 400 }
      );
    }

    let parsedStartDate: Date;
    try {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        throw new Error("Invalid date");
      }
    } catch {
      return NextResponse.json(
        { error: "startDate must be a valid ISO date string" },
        { status: 400 }
      );
    }

    // Verify all users exist
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });

    if (users.length !== userIds.length) {
      const foundIds = users.map((u) => u.id);
      const invalidIds = userIds.filter((id) => !foundIds.includes(id));
      return NextResponse.json(
        { error: `Invalid user IDs: ${invalidIds.join(", ")}` },
        { status: 400 }
      );
    }

    // Remove existing patterns for these users and create new ones in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing patterns
      const deleted = await tx.userShiftPattern.deleteMany({
        where: { userId: { in: userIds } },
      });

      // Create new assignments
      const created = await tx.userShiftPattern.createMany({
        data: userIds.map((userId) => ({
          userId,
          shiftPatternId,
          startDate: parsedStartDate,
        })),
      });

      return { deleted: deleted.count, created: created.count };
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "SHIFT_PATTERN_ASSIGNED",
        entityType: "ShiftPattern",
        entityId: shiftPatternId,
        creatorId: user!.id,
        changes: JSON.stringify({
          userIds,
          startDate,
          shiftPatternName: shiftPattern.name,
          removedCount: result.deleted,
          assignedCount: result.created,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      assignedCount: result.created,
      removedCount: result.deleted,
    });
  } catch (err) {
    console.error("Failed to assign shift pattern:", err);
    return NextResponse.json(
      { error: "Failed to assign shift pattern" },
      { status: 500 }
    );
  }
}
