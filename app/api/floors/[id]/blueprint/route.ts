import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorized, forbidden, badRequest, serverError } from "@/lib/auth";
import { uploadToS3 } from "@/lib/s3";
import sharp from "sharp";

// POST /api/floors/:id/blueprint - Upload blueprint image
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["Admin"]).catch(() => null);
    if (!user) {
      return user === null ? unauthorized() : forbidden();
    }

    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return badRequest("No file provided");
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return badRequest("File must be an image");
    }

    // Read image metadata to get dimensions
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      return badRequest("Could not determine image dimensions");
    }

    // Upload to S3
    const key = `blueprints/${id}-${Date.now()}.${file.name.split(".").pop()}`;
    const url = await uploadToS3(buffer, key, file.type);

    // Update floor with blueprint info
    const floor = await prisma.floor.update({
      where: { id },
      data: {
        blueprintImageUrl: url,
        blueprintWidthPx: metadata.width,
        blueprintHeightPx: metadata.height,
      },
    });

    return NextResponse.json(floor);
  } catch (error) {
    console.error("Error uploading blueprint:", error);
    return serverError();
  }
}
