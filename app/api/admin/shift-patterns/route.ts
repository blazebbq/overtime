import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/shift-patterns - List all shift patterns with user assignment counts
export async function GET() {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  try {
    const shiftPatterns = await prisma.shiftPattern.findMany({
      include: {
        _count: {
          select: {
            userAssignments: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(shiftPatterns);
  } catch (err) {
    console.error("Failed to fetch shift patterns:", err);
    return NextResponse.json(
      { error: "Failed to fetch shift patterns" },
      { status: 500 }
    );
  }
}

// POST /api/admin/shift-patterns - Create new shift pattern
export async function POST(req: NextRequest) {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const { name, cycleLength, patternData } = body;

    // Validate name
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Valid shift pattern name is required" },
        { status: 400 }
      );
    }

    // Validate cycleLength
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

    // Validate patternData
    if (!patternData || typeof patternData !== "string") {
      return NextResponse.json(
        { error: "Pattern data is required and must be a JSON string" },
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

    if (
      !parsedPatternData.days ||
      !Array.isArray(parsedPatternData.days) ||
      parsedPatternData.days.length !== cycleLength
    ) {
      return NextResponse.json(
        {
          error: `Pattern data must contain a "days" array with ${cycleLength} boolean values`,
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

    // Check if shift pattern with this name already exists
    const existing = await prisma.shiftPattern.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Shift pattern with this name already exists" },
        { status: 400 }
      );
    }

    const shiftPattern = await prisma.shiftPattern.create({
      data: {
        name,
        cycleLength,
        patternData,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "SHIFT_PATTERN_CREATED",
        entityType: "ShiftPattern",
        entityId: shiftPattern.id,
        creatorId: user!.id,
        changes: JSON.stringify({ name, cycleLength, patternData }),
      },
    });

    return NextResponse.json(shiftPattern, { status: 201 });
  } catch (err) {
    console.error("Failed to create shift pattern:", err);
    return NextResponse.json(
      { error: "Failed to create shift pattern" },
      { status: 500 }
    );
  }
}
