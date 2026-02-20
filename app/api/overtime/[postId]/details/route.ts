import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { postId } = await params;

    // Fetch overtime post with accepted workers
    const post = await prisma.overtimeRequest.findUnique({
      where: { id: postId },
      include: {
        area: true,
        shiftColour: true,
        applications: {
          where: {
            status: "APPROVED",
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
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
      return NextResponse.json({ error: "Overtime not found" }, { status: 404 });
    }

    // Transform the data
    const response = {
      id: post.id,
      date: post.date.toISOString(),
      startTime: post.startTime,
      endTime: post.endTime,
      requiredPeople: post.requiredPeople,
      approvedCount: post.approvedCount,
      area: {
        id: post.area.id,
        name: post.area.name,
      },
      shiftColour: {
        id: post.shiftColour.id,
        name: post.shiftColour.name,
        hexColor: post.shiftColour.hexColor,
      },
      acceptedWorkers: post.applications.map((app) => ({
        id: app.id,
        user: app.user,
        approvedStartTime: app.approvedStartTime,
        approvedEndTime: app.approvedEndTime,
        requestType: app.requestType,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch overtime post details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
