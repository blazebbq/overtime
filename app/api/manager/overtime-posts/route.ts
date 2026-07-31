import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/manager/overtime-posts - Get all overtime posts for manager
export async function GET() {
  const { user, error } = await requireManager();
  if (error) return error;

  try {
    const userRole = user!.role;
    
    // SUPER_ADMIN sees ALL posts
    if (userRole === "SUPER_ADMIN") {
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
    }

    // For MANAGER and ADMIN: Get posts where they have assigned users
    const managerAssignments = await prisma.managerAssignment.findMany({
      where: {
        managerId: user!.id,
      },
      select: {
        userId: true,
        areaId: true,
        shiftColourId: true,
      },
    });

    // Get unique area and shift colour IDs
    const areaIds = [...new Set(managerAssignments.map(a => a.areaId).filter(Boolean))];
    const shiftColourIds = [...new Set(managerAssignments.map(a => a.shiftColourId).filter(Boolean))];

    // Get posts in manager's areas/shift colours
    const posts = await prisma.overtimeRequest.findMany({
      where: {
        status: {
          not: "ARCHIVED",
        },
        OR: [
          // Posts in manager's areas
          areaIds.length > 0 ? {
            areaId: {
              in: areaIds as string[],
            },
          } : {},
          // Posts with manager's shift colours
          shiftColourIds.length > 0 ? {
            shiftColourId: {
              in: shiftColourIds as string[],
            },
          } : {},
        ],
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
