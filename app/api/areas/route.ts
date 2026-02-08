import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/areas - List enabled areas for regular users
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const areas = await prisma.area.findMany({
      where: { enabled: true },
      select: {
        id: true,
        name: true,
        enabled: true,
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
