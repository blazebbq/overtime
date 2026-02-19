import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, forbidden, badRequest, serverError } from "@/lib/auth";

// GET /api/rooms/:id - Get a specific room
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

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        floor: {
          include: {
            building: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error("Error fetching room:", error);
    return serverError();
  }
}

// PATCH /api/rooms/:id - Update a room
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
    const { name, roomNumber, polygonJson } = body;

    // Validate polygonJson if provided
    if (polygonJson) {
      try {
        JSON.parse(polygonJson);
      } catch {
        return badRequest("Invalid polygon JSON format");
      }
    }

    const room = await prisma.room.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(roomNumber && { roomNumber }),
        ...(polygonJson && { polygonJson }),
      },
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error("Error updating room:", error);
    return serverError();
  }
}

// DELETE /api/rooms/:id - Delete a room
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

    await prisma.room.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting room:", error);
    return serverError();
  }
}
