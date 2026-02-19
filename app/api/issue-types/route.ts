import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, forbidden, badRequest, serverError } from "@/lib/auth";

// GET /api/issue-types - List all issue types
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["Admin", "User", "QA", "EngineeringManager"]).catch(() => null);
    if (!user) {
      return unauthorized();
    }

    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get("activeOnly") === "true";

    const issueTypes = await prisma.issueType.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(issueTypes);
  } catch (error) {
    console.error("Error fetching issue types:", error);
    return serverError();
  }
}

// POST /api/issue-types - Create a new issue type
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["Admin"]).catch(() => null);
    if (!user) {
      return user === null ? unauthorized() : forbidden();
    }

    const body = await request.json();
    const { name, sortOrder, active } = body;

    if (!name) {
      return badRequest("Issue type name is required");
    }

    const issueType = await prisma.issueType.create({
      data: {
        name,
        sortOrder: sortOrder || 0,
        active: active !== undefined ? active : true,
      },
    });

    return NextResponse.json(issueType, { status: 201 });
  } catch (error) {
    console.error("Error creating issue type:", error);
    return serverError();
  }
}
