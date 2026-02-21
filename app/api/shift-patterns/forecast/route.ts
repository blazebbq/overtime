import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";

const prisma = new PrismaClient();

// GET - Get forecast for a specific month
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // Format: YYYY-MM
    const userId = searchParams.get("userId") || user.id; // Allow admins to view other users

    if (!month) {
      return NextResponse.json({ error: "Month parameter required" }, { status: 400 });
    }

    // Parse month
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59); // Last day of month

    // Get user's daily patterns for this month
    const dailyPatterns = await prisma.userShiftDayPattern.findMany({
      where: {
        userId: userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    });

    // Create a map for easy lookup
    const patternMap: Record<string, string> = {};
    dailyPatterns.forEach((pattern) => {
      const dateKey = pattern.date.toISOString().split("T")[0];
      patternMap[dateKey] = pattern.dayType;
    });

    // Generate forecast for all days in month
    const forecast = [];
    const daysInMonth = endDate.getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthNum - 1, day);
      const dateKey = date.toISOString().split("T")[0];
      
      forecast.push({
        date: dateKey,
        dayType: patternMap[dateKey] || null,
      });
    }

    return NextResponse.json({ forecast });
  } catch (error) {
    console.error("Error fetching forecast:", error);
    return NextResponse.json(
      { error: "Failed to fetch forecast" },
      { status: 500 }
    );
  }
}
