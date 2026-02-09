import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET - List approved future overtime for current user
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const now = new Date();
    
    const applications = await prisma.overtimeApplication.findMany({
      where: {
        userId: user!.id,
        status: "APPROVED",
        overtime: {
          date: {
            gte: now,
          },
        },
      },
      include: {
        overtime: {
          include: {
            area: true,
            shiftColour: true,
          },
        },
      },
      orderBy: {
        overtime: {
          date: "asc",
        },
      },
    });

    return NextResponse.json(applications);
  } catch (err) {
    console.error("Error fetching upcoming overtime:", err);
    return NextResponse.json(
      { error: "Failed to fetch upcoming overtime" },
      { status: 500 }
    );
  }
}
