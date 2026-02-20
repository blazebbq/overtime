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
    
    // Check if user wants all applications (managers/admins only)
    const url = new URL(request.url);
    const includeApplications = url.searchParams.get("includeApplications") === "true";
    const isManagerOrAdmin = user!.role === "MANAGER" || user!.role === "ADMIN" || user!.role === "SUPER_ADMIN";

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

    // Base response
    const response: any = {
      id: post.id,
      date: post.date.toISOString(),
      startTime: post.startTime,
      endTime: post.endTime,
      requiredPeople: post.requiredPeople,
      approvedCount: post.approvedCount,
      areaId: post.areaId,
      shiftColourId: post.shiftColourId,
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

    // If manager/admin requested all applications
    if (includeApplications && isManagerOrAdmin) {
      const allApplications = await prisma.overtimeApplication.findMany({
        where: {
          overtimeId: postId,
        },
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
          createdAt: "desc",
        },
      });

      response.allApplications = allApplications.map((app) => ({
        id: app.id,
        userId: app.userId,
        status: app.status,
        requestType: app.requestType,
        requestedStartTime: app.requestedStartTime,
        requestedEndTime: app.requestedEndTime,
        approvedStartTime: app.approvedStartTime,
        approvedEndTime: app.approvedEndTime,
        comment: app.comment,
        createdAt: app.createdAt.toISOString(),
        user: app.user,
      }));
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch overtime post details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
