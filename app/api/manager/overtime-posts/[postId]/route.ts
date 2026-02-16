import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/manager/overtime-posts/[postId] - Get a single overtime post with applications
export async function GET(
  req: Request,
  context: { params: Promise<{ postId: string }> }
) {
  const { user, error } = await requireManager();
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

    // SUPER_ADMIN can see all posts
    const userRole = user!.role;
    if (userRole !== "SUPER_ADMIN") {
      // Check if manager has permission to view this post
      const managerAssignments = await prisma.managerAssignment.findMany({
        where: {
          managerId: user!.id,
        },
      });

      const hasPermission = managerAssignments.some(
        (assignment) =>
          (assignment.areaId === post.areaId || !assignment.areaId) &&
          (assignment.shiftColourId === post.shiftColourId || !assignment.shiftColourId)
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: "You do not have permission to view this post" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(post);
  } catch (err) {
    console.error("Error fetching overtime post:", err);
    return NextResponse.json(
      { error: "Failed to fetch overtime post" },
      { status: 500 }
    );
  }
}
