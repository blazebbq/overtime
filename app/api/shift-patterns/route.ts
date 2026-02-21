import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";

const prisma = new PrismaClient();

// GET - Fetch user's shift pattern
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's shift pattern
    const shiftPattern = await prisma.userShiftPattern.findUnique({
      where: { userId: user.id },
      include: {
        shiftPattern: true,
        dailyPatterns: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!shiftPattern) {
      return NextResponse.json({ pattern: null, dailyPatterns: [] });
    }

    return NextResponse.json({
      pattern: shiftPattern,
      dailyPatterns: shiftPattern.dailyPatterns,
    });
  } catch (error) {
    console.error("Error fetching shift pattern:", error);
    return NextResponse.json(
      { error: "Failed to fetch shift pattern" },
      { status: 500 }
    );
  }
}

// POST - Save/update shift pattern for user
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { dailyPatterns } = body; // Array of { date: string, dayType: ShiftDayType }

    if (!dailyPatterns || !Array.isArray(dailyPatterns)) {
      return NextResponse.json(
        { error: "Invalid daily patterns data" },
        { status: 400 }
      );
    }

    // Validate day types
    const validDayTypes = ["DDE", "DDL", "TWELVE_N", "EIGHT_N", "TWELVE_D", "D", "OFF"];
    for (const pattern of dailyPatterns) {
      if (!validDayTypes.includes(pattern.dayType)) {
        return NextResponse.json(
          { error: `Invalid day type: ${pattern.dayType}` },
          { status: 400 }
        );
      }
    }

    // First, ensure user has a shift pattern entry
    let userPattern = await prisma.userShiftPattern.findUnique({
      where: { userId: user.id },
    });

    if (!userPattern) {
      // Create a default shift pattern for the user
      const defaultPattern = await prisma.shiftPattern.findFirst();
      if (!defaultPattern) {
        // Create a default pattern if none exists
        const newPattern = await prisma.shiftPattern.create({
          data: {
            name: "Default Pattern",
            cycleLength: 7,
            patternData: JSON.stringify({ days: [true, true, true, true, true, true, true] }),
          },
        });
        userPattern = await prisma.userShiftPattern.create({
          data: {
            userId: user.id,
            shiftPatternId: newPattern.id,
            startDate: new Date(),
          },
        });
      } else {
        userPattern = await prisma.userShiftPattern.create({
          data: {
            userId: user.id,
            shiftPatternId: defaultPattern.id,
            startDate: new Date(),
          },
        });
      }
    }

    // Delete existing daily patterns for the user
    await prisma.userShiftDayPattern.deleteMany({
      where: { userId: user.id },
    });

    // Create new daily patterns
    const patternsToCreate = dailyPatterns.map((pattern: any) => ({
      userId: user.id,
      date: new Date(pattern.date),
      dayType: pattern.dayType,
    }));

    await prisma.userShiftDayPattern.createMany({
      data: patternsToCreate,
    });

    return NextResponse.json({ success: true, message: "Shift pattern saved successfully" });
  } catch (error) {
    console.error("Error saving shift pattern:", error);
    return NextResponse.json(
      { error: "Failed to save shift pattern" },
      { status: 500 }
    );
  }
}
