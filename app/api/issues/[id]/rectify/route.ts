import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, forbidden, serverError } from "@/lib/auth";

// POST /api/issues/:id/rectify - Mark an issue as rectified
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["Admin", "User", "EngineeringManager"]).catch(() => null);
    if (!user) {
      return user === null ? unauthorized() : forbidden();
    }

    const { id } = await params;

    const issue = await prisma.issue.update({
      where: { id },
      data: {
        status: "Rectified",
        rectifiedAt: new Date(),
        rectifiedByUserId: user.id,
      },
      include: {
        room: true,
        issueType: true,
        rectifiedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(issue);
  } catch (error) {
    console.error("Error rectifying issue:", error);
    return serverError();
  }
}
