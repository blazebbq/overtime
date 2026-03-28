import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

// Update overtime request (mainly for archiving/unarchiving)
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const params = await context.params;

  try {
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const validStatuses = ["OPEN", "FULL", "CLOSED", "ARCHIVED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const overtime = await prisma.overtimeRequest.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json(overtime);
  } catch (err) {
    console.error("Error updating overtime:", err);
    return NextResponse.json(
      { error: "Failed to update overtime request" },
      { status: 500 }
    );
  }
}
