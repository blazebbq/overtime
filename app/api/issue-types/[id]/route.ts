import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, forbidden, badRequest, serverError } from "@/lib/auth";

// PATCH /api/issue-types/:id - Update an issue type
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["Admin"]).catch(() => null);
    if (!user) {
      return user === null ? unauthorized() : forbidden();
    }

    const { id } = await params;
    const body = await request.json();
    const { name, sortOrder, active } = body;

    const issueType = await prisma.issueType.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json(issueType);
  } catch (error) {
    console.error("Error updating issue type:", error);
    return serverError();
  }
}

// DELETE /api/issue-types/:id - Delete an issue type
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["Admin"]).catch(() => null);
    if (!user) {
      return user === null ? unauthorized() : forbidden();
    }

    const { id } = await params;

    await prisma.issueType.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting issue type:", error);
    return serverError();
  }
}
