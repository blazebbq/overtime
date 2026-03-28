import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/shift-colours - List all shift colours
export async function GET() {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  try {
    const shiftColours = await prisma.shiftColour.findMany({
      include: {
        areas: {
          include: {
            area: true,
          },
        },
        _count: {
          select: {
            overtimeRequests: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(shiftColours);
  } catch (err) {
    console.error("Failed to fetch shift colours:", err);
    return NextResponse.json(
      { error: "Failed to fetch shift colours" },
      { status: 500 }
    );
  }
}

// POST /api/admin/shift-colours - Create new shift colour
export async function POST(req: NextRequest) {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const { name, hexColor, enabled = true } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Valid shift colour name is required" },
        { status: 400 }
      );
    }

    if (!hexColor || typeof hexColor !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
      return NextResponse.json(
        { error: "Valid hex color is required (e.g., #FFD700)" },
        { status: 400 }
      );
    }

    // Check if shift colour already exists
    const existing = await prisma.shiftColour.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Shift colour with this name already exists" },
        { status: 400 }
      );
    }

    const shiftColour = await prisma.shiftColour.create({
      data: {
        name,
        hexColor,
        enabled,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "SHIFT_COLOUR_CREATED",
        entityType: "ShiftColour",
        entityId: shiftColour.id,
        creatorId: user!.id,
        changes: JSON.stringify({ name, hexColor, enabled }),
      },
    });

    return NextResponse.json(shiftColour, { status: 201 });
  } catch (err) {
    console.error("Failed to create shift colour:", err);
    return NextResponse.json(
      { error: "Failed to create shift colour" },
      { status: 500 }
    );
  }
}
