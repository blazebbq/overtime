import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, forbidden, badRequest, serverError } from "@/lib/auth";

// GET /api/rooms - List all rooms (with optional floor filter)
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["Admin", "User", "QA", "EngineeringManager"]).catch(() => null);
    if (!user) {
      return unauthorized();
    }

    const searchParams = request.nextUrl.searchParams;
    const floorId = searchParams.get("floorId");

    const rooms = await prisma.room.findMany({
      where: floorId ? { floorId } : undefined,
      orderBy: { roomNumber: "asc" },
      include: {
        floor: {
          include: {
            building: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return serverError();
  }
}

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["Admin"]).catch(() => null);
    if (!user) {
      return user === null ? unauthorized() : forbidden();
    }

    const body = await request.json();
    const { floorId, name, roomNumber, polygonJson } = body;

    if (!floorId || !name || !roomNumber || !polygonJson) {
      return badRequest("Floor ID, name, room number, and polygon are required");
    }

    // Validate polygonJson is valid JSON
    try {
      JSON.parse(polygonJson);
    } catch {
      return badRequest("Invalid polygon JSON format");
    }

    const room = await prisma.room.create({
      data: {
        floorId,
        name,
        roomNumber,
        polygonJson,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("Error creating room:", error);
    return serverError();
  }
}
