import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch user notifications
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const searchParams = req.nextUrl.searchParams;
    const statusFilter = searchParams.get("status"); // UNREAD, READ, or null for all

    // Build where clause
    let whereClause: any = {
      userId: user!.id,
    };

    // Add status filter if provided
    if (statusFilter) {
      whereClause.status = statusFilter;
    }

    // Fetch notifications
    const notifications = await prisma.userNotification.findMany({
      where: whereClause,
      include: {
        post: {
          include: {
            area: true,
            shiftColour: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform for frontend
    const transformed = notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      status: notification.status,
      message: notification.message,
      createdAt: notification.createdAt.toISOString(),
      overtimePost: {
        id: notification.post.id,
        date: notification.post.date.toISOString(),
        startTime: notification.post.startTime,
        endTime: notification.post.endTime,
        area: {
          name: notification.post.area.name,
        },
        shiftColour: {
          name: notification.post.shiftColour.name,
          hexColor: notification.post.shiftColour.hexColor,
        },
      },
    }));

    return NextResponse.json(transformed);
  } catch (err) {
    console.error("Error fetching user notifications:", err);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// PATCH - Mark notification as read
export async function PATCH(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { notificationId, status } = body;

    if (!notificationId || !status) {
      return NextResponse.json(
        { error: "notificationId and status are required" },
        { status: 400 }
      );
    }

    // Verify notification belongs to user
    const notification = await prisma.userNotification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    if (notification.userId !== user!.id) {
      return NextResponse.json(
        { error: "You don't have permission to modify this notification" },
        { status: 403 }
      );
    }

    // Update notification status
    const updated = await prisma.userNotification.update({
      where: { id: notificationId },
      data: {
        status,
        readAt: status === "READ" ? new Date() : null,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error updating notification:", err);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
