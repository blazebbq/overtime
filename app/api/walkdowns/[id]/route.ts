import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, serverError } from "@/lib/auth";

// GET /api/walkdowns/:id - Get a specific walkdown
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["Admin", "User", "QA", "EngineeringManager"]).catch(() => null);
    if (!user) {
      return unauthorized();
    }

    const { id } = await params;

    const walkdown = await prisma.walkdown.findUnique({
      where: { id },
      include: {
        building: true,
        floor: {
          include: {
            rooms: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        issues: {
          include: {
            room: true,
            issueType: true,
            createdBy: {
              select: { id: true, name: true },
            },
            photos: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!walkdown) {
      return NextResponse.json({ error: "Walkdown not found" }, { status: 404 });
    }

    return NextResponse.json(walkdown);
  } catch (error) {
    console.error("Error fetching walkdown:", error);
    return serverError();
  }
}

// PATCH /api/walkdowns/:id - Update a walkdown
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["Admin", "User", "QA", "EngineeringManager"]).catch(() => null);
    if (!user) {
      return unauthorized();
    }

    const { id } = await params;
    const body = await request.json();
    const { walkdownId, status } = body;

    const walkdown = await prisma.walkdown.update({
      where: { id },
      data: {
        ...(walkdownId && { walkdownId }),
        ...(status && { status }),
        ...(status === "Submitted" && { submittedAt: new Date() }),
      },
    });

    return NextResponse.json(walkdown);
  } catch (error) {
    console.error("Error updating walkdown:", error);
    return serverError();
  }
}

// DELETE /api/walkdowns/:id - Delete a walkdown
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["Admin"]).catch(() => null);
    if (!user) {
      return unauthorized();
    }

    const { id } = await params;

    await prisma.walkdown.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting walkdown:", error);
    return serverError();
  }
}
