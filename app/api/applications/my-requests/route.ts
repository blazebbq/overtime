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

    // For pending applications, find the assigned manager
    const applicationsWithManager = await Promise.all(
      applications.map(async (app) => {
        if (app.status === "PENDING_APPROVAL" || app.status === "CANCEL_PENDING") {
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
    console.error("Error fetching user applications:", err);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
