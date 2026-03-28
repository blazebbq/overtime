import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET: Fetch current SMTP configuration
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { email: string; role: string };

    // Only SUPER_ADMIN can access SMTP config
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the most recent SMTP config
    const config = await prisma.smtpConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(config || null);
  } catch (error) {
    console.error("[SMTP Config GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SMTP configuration" },
      { status: 500 }
    );
  }
}

// POST: Create or update SMTP configuration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { email: string; role: string };

    // Only SUPER_ADMIN can update SMTP config
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { host, port, secure, user: smtpUser, password, fromEmail, enabled } = body;

    // Validation
    if (!host || !port || !fromEmail) {
      return NextResponse.json(
        { error: "Host, port, and fromEmail are required" },
        { status: 400 }
      );
    }

    // Get existing config
    const existing = await prisma.smtpConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    let config;
    if (existing) {
      // Update existing
      config = await prisma.smtpConfig.update({
        where: { id: existing.id },
        data: {
          host,
          port: parseInt(port),
          secure: Boolean(secure),
          user: smtpUser || null,
          password: password || null,
          fromEmail,
          enabled: Boolean(enabled),
        },
      });
    } else {
      // Create new
      config = await prisma.smtpConfig.create({
        data: {
          host,
          port: parseInt(port),
          secure: Boolean(secure),
          user: smtpUser || null,
          password: password || null,
          fromEmail,
          enabled: Boolean(enabled),
        },
      });
    }

    console.log("[SMTP Config] Updated by:", user.email);
    return NextResponse.json(config);
  } catch (error) {
    console.error("[SMTP Config POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to update SMTP configuration" },
      { status: 500 }
    );
  }
}
