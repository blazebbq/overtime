import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch inbox items for current user
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const searchParams = req.nextUrl.searchParams;
    const statusFilter = searchParams.get("status"); // UNREAD, OPEN, RESOLVED, or null for all

    // Build where clause based on user role
    let whereClause: any = {};

    if (user!.role === "SUPER_ADMIN") {
      // SuperAdmin sees ALL inbox items
      whereClause = {};
    } else if (user!.role === "ADMIN" || user!.role === "MANAGER") {
      // Managers/Admins see items assigned to them OR items with no assignment (fallback)
      whereClause = {
        OR: [
          { assignedToUserId: user!.id },
          { assignedToUserId: null }, // Items without specific assignment
        ],
      };
    } else {
      // Regular users don't have access to inbox
      return NextResponse.json(
        { error: "Access denied. Inbox is for managers and admins only." },
        { status: 403 }
      );
    }

    // Add status filter if provided
    if (statusFilter) {
      whereClause.status = statusFilter;
    }

    // Fetch inbox items
    const inboxItems = await prisma.inboxItem.findMany({
      where: whereClause,
      include: {
        post: {
          include: {
            area: true,
            shiftColour: true,
          },
        },
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform for frontend
    const transformed = inboxItems.map((item) => ({
      id: item.id,
      type: item.type,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      resolvedAt: item.resolvedAt?.toISOString() || null,
      requester: {
        id: item.application.user.id,
        name: item.application.user.name,
        email: item.application.user.email,
      },
      overtimePost: {
        id: item.post.id,
        date: item.post.date.toISOString(),
        startTime: item.post.startTime,
        endTime: item.post.endTime,
        area: {
          id: item.post.area.id,
          name: item.post.area.name,
        },
        shiftColour: {
          id: item.post.shiftColour.id,
          name: item.post.shiftColour.name,
          hexColor: item.post.shiftColour.hexColor,
        },
      },
      application: {
        id: item.application.id,
        status: item.application.status,
        requestType: item.application.requestType,
        requestedStartTime: item.application.requestedStartTime,
        requestedEndTime: item.application.requestedEndTime,
        comment: item.application.comment,
        cancellationRequestedReason: item.application.cancellationRequestedReason,
      },
    }));

    return NextResponse.json(transformed);
  } catch (err) {
    console.error("Error fetching inbox items:", err);
    return NextResponse.json(
      { error: "Failed to fetch inbox items" },
      { status: 500 }
    );
  }
}

// PATCH - Mark inbox item as read/open
export async function PATCH(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { inboxItemId, status } = body;

    if (!inboxItemId || !status) {
      return NextResponse.json(
        { error: "inboxItemId and status are required" },
        { status: 400 }
      );
    }

    if (!["UNREAD", "OPEN", "RESOLVED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Get inbox item to verify permissions
    const inboxItem = await prisma.inboxItem.findUnique({
      where: { id: inboxItemId },
    });

    if (!inboxItem) {
      return NextResponse.json(
        { error: "Inbox item not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (user!.role !== "SUPER_ADMIN") {
      if (
        inboxItem.assignedToUserId &&
        inboxItem.assignedToUserId !== user!.id
      ) {
        return NextResponse.json(
          { error: "You can only update items assigned to you" },
          { status: 403 }
        );
      }
    }

    // Update status
    const updated = await prisma.inboxItem.update({
      where: { id: inboxItemId },
      data: {
        status,
        ...(status === "RESOLVED"
          ? {
              resolvedAt: new Date(),
              resolvedByUserId: user!.id,
            }
          : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error updating inbox item:", err);
    return NextResponse.json(
      { error: "Failed to update inbox item" },
      { status: 500 }
    );
  }
}
