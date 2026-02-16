import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/admin/overtime-posts/[postId] - Get a single overtime post with all applications
export async function GET(
  req: Request,
  context: { params: Promise<{ postId: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const params = await context.params;
    const postId = params.postId;

    const post = await prisma.overtimeRequest.findUnique({
      where: {
        id: postId,
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
        applications: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Overtime post not found" },
        { status: 404 }
      );
    }

    // Admin/SuperAdmin can see all posts
    return NextResponse.json(post);
  } catch (err) {
    console.error("Error fetching overtime post:", err);
    return NextResponse.json(
      { error: "Failed to fetch overtime post" },
      { status: 500 }
    );
  }
}
