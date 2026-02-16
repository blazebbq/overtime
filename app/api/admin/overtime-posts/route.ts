import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/admin/overtime-posts - Get all overtime posts (SUPER_ADMIN sees all)
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    // Admin/SuperAdmin see ALL posts
    const posts = await prisma.overtimeRequest.findMany({
      where: {
        status: {
          not: "ARCHIVED",
        },
      },
      include: {
        area: {
          select: {
            name: true,
          },
        },
        shiftColour: {
          select: {
            name: true,
            hexColor: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(posts);
  } catch (err) {
    console.error("Error fetching overtime posts:", err);
    return NextResponse.json(
      { error: "Failed to fetch overtime posts" },
      { status: 500 }
    );
  }
}
