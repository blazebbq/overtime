import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET - List approved and cancellation-pending future overtime for current user
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const now = new Date();
    
    const applications = await prisma.overtimeApplication.findMany({
      where: {
        userId: user!.id,
        status: {
          in: ["APPROVED", "CANCEL_PENDING"], // Include both approved and cancellation pending
        },
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

    // For CANCEL_PENDING applications, find the assigned manager
    const applicationsWithManager = await Promise.all(
      applications.map(async (app) => {
        if (app.status === "CANCEL_PENDING") {
          // Find the manager assignment
          const managerAssignment = await prisma.managerAssignment.findFirst({
            where: {
              userId: user!.id,
              OR: [
                { areaId: null },
                { areaId: app.overtime.areaId },
              ],
            },
            include: {
              manager: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              // Prefer specific area assignments over global ones
              areaId: "desc",
            },
          });

          return {
            ...app,
            assignedManager: managerAssignment?.manager || null,
          };
        }
        return {
          ...app,
          assignedManager: null,
        };
      })
    );

    return NextResponse.json(applicationsWithManager);
  } catch (err) {
    console.error("Error fetching upcoming overtime:", err);
    return NextResponse.json(
      { error: "Failed to fetch upcoming overtime" },
      { status: 500 }
    );
  }
}
