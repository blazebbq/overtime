import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { isValidEmail } from "@/lib/email";

// GET user profile
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        secondaryEmail: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(userData);
  } catch (err) {
    console.error("Error fetching profile:", err);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// Update user profile (name, password, and/or secondaryEmail)
export async function PATCH(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, currentPassword, newPassword, secondaryEmail } = body;

    // Validate at least one field is provided
    if (!name && !newPassword && secondaryEmail === undefined) {
      return NextResponse.json(
        { error: "Please provide name, password, or secondaryEmail to update" },
        { status: 400 }
      );
    }

    // Validate secondary email if provided (empty string = remove)
    if (secondaryEmail !== undefined && secondaryEmail !== null && secondaryEmail !== "") {
      if (!isValidEmail(secondaryEmail)) {
        return NextResponse.json(
          { error: "Invalid email format for secondary email" },
          { status: 400 }
        );
      }
    }

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to change password" },
          { status: 400 }
        );
      }

      // Get user with password
      const userWithPassword = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!userWithPassword) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      // Verify current password
      const passwordMatches = await bcrypt.compare(
        currentPassword,
        userWithPassword.password
      );

      if (!passwordMatches) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      // Validate new password
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters" },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name) {
      updateData.name = name;
    }
    if (newPassword) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }
    if (secondaryEmail !== undefined) {
      // Empty string or null means remove secondary email
      updateData.secondaryEmail = secondaryEmail || null;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        secondaryEmail: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
