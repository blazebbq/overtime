/**
 * Service for calculating consecutive working days and detecting breaches
 * Based on shift patterns and overtime bookings
 */

import { prisma } from "@/lib/prisma";

interface WorkDayCalculation {
  consecutiveDays: number;
  breachWarning: boolean;
  workDays: Date[];
}

/**
 * Calculate if a user is scheduled to work on a given date based on their shift pattern
 */
export function isScheduledWorkDay(
  patternData: { days: boolean[] },
  cycleLength: number,
  startDate: Date,
  checkDate: Date
): boolean {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const check = new Date(checkDate);
  check.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((check.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff < 0) {
    return false; // Date is before pattern start
  }
  
  const dayInCycle = daysDiff % cycleLength;
  return patternData.days[dayInCycle] === true;
}

/**
 * Calculate consecutive working days for a user up to a specific date
 * Includes both scheduled shift pattern days and overtime bookings
 */
export async function calculateConsecutiveWorkingDays(
  userId: string,
  upToDate: Date
): Promise<WorkDayCalculation> {
  // Get user's shift pattern
  const userPattern = await prisma.userShiftPattern.findUnique({
    where: { userId },
    include: {
      shiftPattern: true,
    },
  });

  // Get user's overtime bookings in the last 30 days
  const thirtyDaysAgo = new Date(upToDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const bookings = await prisma.booking.findMany({
    where: {
      userId,
      overtime: {
        date: {
          gte: thirtyDaysAgo,
          lte: upToDate,
        },
      },
    },
    include: {
      overtime: true,
    },
  });

  const workDays = new Set<string>();

  // Add scheduled work days from shift pattern
  if (userPattern) {
    const patternData = JSON.parse(userPattern.shiftPattern.patternData);
    const cycleLength = userPattern.shiftPattern.cycleLength;
    const startDate = userPattern.startDate;

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(upToDate);
      checkDate.setDate(checkDate.getDate() - i);
      
      if (isScheduledWorkDay(patternData, cycleLength, startDate, checkDate)) {
        workDays.add(checkDate.toISOString().split('T')[0]);
      }
    }
  }

  // Add overtime days
  bookings.forEach((booking) => {
    const dateStr = new Date(booking.overtime.date).toISOString().split('T')[0];
    workDays.add(dateStr);
  });

  // Calculate consecutive days leading up to the target date
  let consecutiveDays = 0;
  const checkDate = new Date(upToDate);
  checkDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    
    if (workDays.has(dateStr)) {
      consecutiveDays++;
    } else if (i === 0) {
      // If the target date itself isn't a work day, break immediately
      break;
    } else {
      // First non-work day encountered, stop counting
      break;
    }
    
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // UK regulations typically set the limit at 12-14 consecutive working days
  // We'll flag at 12 days
  const breachWarning = consecutiveDays >= 12;

  const workDaysList = Array.from(workDays)
    .map(dateStr => new Date(dateStr))
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    consecutiveDays,
    breachWarning,
    workDays: workDaysList,
  };
}

/**
 * Calculate if booking a new overtime shift would create a breach
 */
export async function wouldCreateBreach(
  userId: string,
  overtimeDate: Date
): Promise<{ wouldBreach: boolean; consecutiveDaysAfter: number }> {
  const result = await calculateConsecutiveWorkingDays(userId, overtimeDate);
  
  return {
    wouldBreach: result.breachWarning,
    consecutiveDaysAfter: result.consecutiveDays,
  };
}
