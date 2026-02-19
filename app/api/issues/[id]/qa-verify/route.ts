import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, forbidden, badRequest, serverError } from "@/lib/auth";

// POST /api/issues/:id/qa-verify - Mark an issue as QA verified (closed)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["Admin", "QA"]).catch(() => null);
    if (!user) {
      return user === null ? unauthorized() : forbidden();
    }

    const { id } = await params;

    // Check if issue is rectified first
    const currentIssue = await prisma.issue.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!currentIssue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    if (currentIssue.status !== "Rectified") {
      return badRequest("Issue must be rectified before QA verification");
    }

    const issue = await prisma.issue.update({
      where: { id },
      data: {
        status: "Closed",
        qaVerifiedAt: new Date(),
        qaVerifiedByUserId: user.id,
      },
      include: {
        room: true,
        issueType: true,
        rectifiedBy: {
          select: { id: true, name: true },
        },
        qaVerifiedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(issue);
  } catch (error) {
    console.error("Error QA verifying issue:", error);
    return serverError();
  }
}
