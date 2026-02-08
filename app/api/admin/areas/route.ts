import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/areas - List all areas
export async function GET() {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  try {
    const areas = await prisma.area.findMany({
      include: {
        shiftColours: {
          include: {
            shiftColour: true,
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

    return NextResponse.json(areas);
  } catch (err) {
    console.error("Failed to fetch areas:", err);
    return NextResponse.json(
      { error: "Failed to fetch areas" },
      { status: 500 }
    );
  }
}

// POST /api/admin/areas - Create new area
export async function POST(req: NextRequest) {
  const { user, error } = await requireSuperAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const { name, enabled = true } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Valid area name is required" },
        { status: 400 }
      );
    }

    // Check if area already exists
    const existing = await prisma.area.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Area with this name already exists" },
        { status: 400 }
      );
    }

    const area = await prisma.area.create({
      data: {
        name,
        enabled,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "AREA_CREATED",
        entityType: "Area",
        entityId: area.id,
        creatorId: user!.id,
        changes: JSON.stringify({ name, enabled }),
      },
    });

    return NextResponse.json(area, { status: 201 });
  } catch (err) {
    console.error("Failed to create area:", err);
    return NextResponse.json(
      { error: "Failed to create area" },
      { status: 500 }
    );
  }
}
