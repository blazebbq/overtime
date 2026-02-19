import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, forbidden, badRequest, serverError } from "@/lib/auth";

// GET /api/buildings - List all buildings
export async function GET() {
  try {
    const user = await requireRole(["Admin", "User", "QA", "EngineeringManager"]).catch(() => null);
    if (!user) {
      return unauthorized();
    }

    const buildings = await prisma.building.findMany({
      orderBy: { name: "asc" },
      include: {
        floors: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(buildings);
  } catch (error) {
    console.error("Error fetching buildings:", error);
    return serverError();
  }
}

// POST /api/buildings - Create a new building
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["Admin"]).catch(() => null);
    if (!user) {
      return user === null ? unauthorized() : forbidden();
    }

    const body = await request.json();
    const { name, siteCode } = body;

    if (!name) {
      return badRequest("Building name is required");
    }

    const building = await prisma.building.create({
      data: {
        name,
        siteCode: siteCode || null,
      },
    });

    return NextResponse.json(building, { status: 201 });
  } catch (error) {
    console.error("Error creating building:", error);
    return serverError();
  }
}
