import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET - List all applications for current user
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const applications = await prisma.overtimeApplication.findMany({
      where: {
        userId: user!.id,
      },
      include: {
        overtime: {
          include: {
            area: true,
            shiftColour: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(applications);
  } catch (err) {
    console.error("Error fetching user applications:", err);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
