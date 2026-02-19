import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, forbidden, serverError } from "@/lib/auth";

// GET /api/floors/:id - Get a specific floor
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

    const floor = await prisma.floor.findUnique({
      where: { id },
      include: {
        building: true,
        rooms: {
          orderBy: { name: "asc" },
        },
      },
    });

    if (!floor) {
      return NextResponse.json({ error: "Floor not found" }, { status: 404 });
    }

    return NextResponse.json(floor);
  } catch (error) {
    console.error("Error fetching floor:", error);
    return serverError();
  }
}

// PATCH /api/floors/:id - Update a floor
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
    const { name, blueprintImageUrl, blueprintWidthPx, blueprintHeightPx } = body;

    const floor = await prisma.floor.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(blueprintImageUrl !== undefined && { blueprintImageUrl: blueprintImageUrl || null }),
        ...(blueprintWidthPx !== undefined && { blueprintWidthPx: blueprintWidthPx || null }),
        ...(blueprintHeightPx !== undefined && { blueprintHeightPx: blueprintHeightPx || null }),
      },
    });

    return NextResponse.json(floor);
  } catch (error) {
    console.error("Error updating floor:", error);
    return serverError();
  }
}

// DELETE /api/floors/:id - Delete a floor
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

    await prisma.floor.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting floor:", error);
    return serverError();
  }
}
