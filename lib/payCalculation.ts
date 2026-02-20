/**
 * Pay Multiplier Calculation
 * 
 * Rules:
 * - Mon-Fri 07:00-23:00: 1.5x
 * - Sat-Sun 07:00-23:00: 1.75x
 * - All days 23:00-07:00: 2.0x
 */

export interface PaySegment {
  segmentStart: Date;
  segmentEnd: Date;
  hoursWorked: number;
  multiplier: number;
}

/**
 * Get pay multiplier for a specific date and time
 */
function getMultiplier(dateTime: Date): number {
  const hour = dateTime.getHours();
  const dayOfWeek = dateTime.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Night shift (23:00-07:00): 2.0x
  if (hour >= 23 || hour < 7) {
    return 2.0;
  }
  
  // Weekend day shift (Sat-Sun 07:00-23:00): 1.75x
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 1.75;
  }
  
  // Weekday day shift (Mon-Fri 07:00-23:00): 1.5x
  return 1.5;
}

/**
 * Calculate pay segments for a shift, splitting across time boundaries
 */
export function calculatePaySegments(
  startDateTime: Date,
  endDateTime: Date
): PaySegment[] {
  const segments: PaySegment[] = [];
  let currentTime = new Date(startDateTime);
  
  while (currentTime < endDateTime) {
    const currentMultiplier = getMultiplier(currentTime);
    
    // Find next boundary where multiplier changes
    let nextBoundary = findNextBoundary(currentTime, endDateTime);
    
    // If next boundary is beyond end time, use end time
    if (nextBoundary > endDateTime) {
      nextBoundary = endDateTime;
    }
    
    // Calculate hours in this segment
    const durationMs = nextBoundary.getTime() - currentTime.getTime();
    const hours = durationMs / (1000 * 60 * 60);
    
    segments.push({
      segmentStart: new Date(currentTime),
      segmentEnd: new Date(nextBoundary),
      hoursWorked: hours,
      multiplier: currentMultiplier,
    });
    
    currentTime = nextBoundary;
  }
  
  return segments;
}

/**
 * Find the next time boundary where pay multiplier changes
 */
function findNextBoundary(currentTime: Date, endTime: Date): Date {
  const boundaries: Date[] = [];
  
  // Add midnight boundary (day change)
  const nextMidnight = new Date(currentTime);
  nextMidnight.setHours(24, 0, 0, 0);
  boundaries.push(nextMidnight);
  
  // Add 07:00 boundary (night -> day)
  const next7am = new Date(currentTime);
  next7am.setHours(7, 0, 0, 0);
  if (next7am <= currentTime) {
    next7am.setDate(next7am.getDate() + 1);
  }
  boundaries.push(next7am);
  
  // Add 23:00 boundary (day -> night)
  const next11pm = new Date(currentTime);
  next11pm.setHours(23, 0, 0, 0);
  if (next11pm <= currentTime) {
    next11pm.setDate(next11pm.getDate() + 1);
  }
  boundaries.push(next11pm);
  
  // Add end time
  boundaries.push(endTime);
  
  // Find earliest boundary after current time
  const validBoundaries = boundaries.filter(b => b > currentTime);
  validBoundaries.sort((a, b) => a.getTime() - b.getTime());
  
  return validBoundaries[0] || endTime;
}

/**
 * Parse time string (HH:MM) and combine with date
 */
export function parseDateTime(dateStr: string, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Calculate total compensation breakdown
 */
export function calculateCompensationBreakdown(segments: PaySegment[]): {
  hoursAt1_5x: number;
  hoursAt1_75x: number;
  hoursAt2_0x: number;
  totalHours: number;
} {
  let hoursAt1_5x = 0;
  let hoursAt1_75x = 0;
  let hoursAt2_0x = 0;
  
  for (const segment of segments) {
    if (segment.multiplier === 1.5) {
      hoursAt1_5x += segment.hoursWorked;
    } else if (segment.multiplier === 1.75) {
      hoursAt1_75x += segment.hoursWorked;
    } else if (segment.multiplier === 2.0) {
      hoursAt2_0x += segment.hoursWorked;
    }
  }
  
  return {
    hoursAt1_5x: Math.round(hoursAt1_5x * 100) / 100,
    hoursAt1_75x: Math.round(hoursAt1_75x * 100) / 100,
    hoursAt2_0x: Math.round(hoursAt2_0x * 100) / 100,
    totalHours: Math.round((hoursAt1_5x + hoursAt1_75x + hoursAt2_0x) * 100) / 100,
  };
}
