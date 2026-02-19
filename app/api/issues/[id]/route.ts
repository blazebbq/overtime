import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, serverError } from "@/lib/auth";

// GET /api/issues/:id - Get a specific issue
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

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        walkdown: true,
        building: true,
        floor: true,
        room: true,
        issueType: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        rectifiedBy: {
          select: { id: true, name: true },
        },
        qaVerifiedBy: {
          select: { id: true, name: true },
        },
        photos: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    return NextResponse.json(issue);
  } catch (error) {
    console.error("Error fetching issue:", error);
    return serverError();
  }
}

// PATCH /api/issues/:id - Update an issue
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
    const { description, status, issueTypeId } = body;

    const issue = await prisma.issue.update({
      where: { id },
      data: {
        ...(description && { description }),
        ...(status && { status }),
        ...(issueTypeId && { issueTypeId }),
      },
      include: {
        room: true,
        issueType: true,
        photos: true,
      },
    });

    return NextResponse.json(issue);
  } catch (error) {
    console.error("Error updating issue:", error);
    return serverError();
  }
}

// DELETE /api/issues/:id - Delete an issue
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

    await prisma.issue.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting issue:", error);
    return serverError();
  }
}
