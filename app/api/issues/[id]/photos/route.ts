import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, forbidden, badRequest, serverError } from "@/lib/auth";
import { uploadToS3 } from "@/lib/s3";

// POST /api/issues/:id/photos - Upload a photo for an issue
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["Admin", "User", "QA"]).catch(() => null);
    if (!user) {
      return user === null ? unauthorized() : forbidden();
    }

    const { id } = await params;

    // Check if issue exists
    const issue = await prisma.issue.findUnique({
      where: { id },
    });

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return badRequest("No file provided");
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return badRequest("File must be an image");
    }

    // Upload to S3
    const key = `issues/${id}/${Date.now()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await uploadToS3(buffer, key, file.type);

    // Create photo record
    const photo = await prisma.issuePhoto.create({
      data: {
        issueId: id,
        photoUrl: url,
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("Error uploading photo:", error);
    return serverError();
  }
}
