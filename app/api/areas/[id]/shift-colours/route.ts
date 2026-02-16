import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/areas/[id]/shift-colours - Get all shift colours for a specific area
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const areaId = params.id;

    // Get all AreaShiftColour relations for this area
    const areaShiftColours = await prisma.areaShiftColour.findMany({
      where: {
        areaId: areaId,
      },
      include: {
        shiftColour: true,
      },
    });

    // Return the shift colours with their AreaShiftColour ID
    const shiftColours = areaShiftColours.map((asc) => ({
      id: asc.shiftColour.id,
      areaShiftColourId: asc.id,
      name: asc.shiftColour.name,
      hexColor: asc.shiftColour.hexColor,
      enabled: asc.shiftColour.enabled,
    }));

    return NextResponse.json(shiftColours);
  } catch (err) {
    console.error("Failed to fetch shift colours for area:", err);
    return NextResponse.json(
      { error: "Failed to fetch shift colours" },
      { status: 500 }
    );
  }
}
