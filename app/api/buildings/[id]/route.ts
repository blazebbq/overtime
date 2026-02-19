import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, forbidden, badRequest, serverError } from "@/lib/auth";

// GET /api/buildings/:id - Get a specific building
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["Admin", "User", "QA", "EngineeringManager"]).catch(() => null);
    if (!user) {
      return unauthorized();
    }

    const { id } = await params;

    const building = await prisma.building.findUnique({
      where: { id },
      include: {
        floors: {
          orderBy: { name: "asc" },
        },
      },
    });

    if (!building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    return NextResponse.json(building);
  } catch (error) {
    console.error("Error fetching building:", error);
    return serverError();
  }
}

// PATCH /api/buildings/:id - Update a building
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["Admin"]).catch(() => null);
    if (!user) {
      return user === null ? unauthorized() : forbidden();
    }

    const { id } = await params;
    const body = await request.json();
    const { name, siteCode } = body;

    const building = await prisma.building.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(siteCode !== undefined && { siteCode: siteCode || null }),
      },
    });

    return NextResponse.json(building);
  } catch (error) {
    console.error("Error updating building:", error);
    return serverError();
  }
}

// DELETE /api/buildings/:id - Delete a building
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["Admin"]).catch(() => null);
    if (!user) {
      return user === null ? unauthorized() : forbidden();
    }

    const { id } = await params;

    await prisma.building.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting building:", error);
    return serverError();
  }
}
