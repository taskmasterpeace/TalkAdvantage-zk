/**
 * Utility functions for date calculations and week numbering
 */

/**
 * Calculate the week number for a given date using the adjusted logic
 * where dates before the first Sunday of the year are treated as Week 1
 */
export const getWeekNumber = (date: Date): number => {
  const year = date.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  
  // Calculate the day of the week for January 1st (0 = Sunday, 6 = Saturday)
  const daysOffset = firstDayOfYear.getDay();
  
  // Calculate the first Sunday of the year
  const firstSundayOfYear = new Date(firstDayOfYear);
  if (daysOffset > 0) {
    firstSundayOfYear.setDate(firstDayOfYear.getDate() + (7 - daysOffset));
  }
  
  // If the date falls before the first Sunday, treat it as week 1
  if (daysOffset > 0 && date < firstSundayOfYear) {
    return 1;
  }
  
  // Calculate days from the first Sunday to the given date
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const daysSinceFirstSunday = Math.floor(
    (date.getTime() - firstSundayOfYear.getTime()) / millisecondsPerDay
  );
  
  // For years that start mid-week, add one extra week to account for the
  // partial first week
  const baseWeek = Math.floor(daysSinceFirstSunday / 7) + 1;
  return daysOffset > 0 ? baseWeek + 1 : baseWeek;
};

/**
 * Get the date range for a given week number in a specific year
 * If year is not provided, uses the current year
 */
export const getWeekDateRange = (weekNumber: number, year?: number) => {
  const today = new Date();
  const useYear = year || today.getFullYear();
  const firstDayOfYear = new Date(useYear, 0, 1);
  
  // Calculate the day of the week for January 1st
  const daysOffset = firstDayOfYear.getDay();
  
  // Handle week 1 for years that start mid-week
  if (weekNumber === 1 && daysOffset > 0) {
    // Week 1 starts on January 1st for years that don't start on Sunday
    const endOfFirstWeek = new Date(firstDayOfYear);
    // End of week is the first Saturday after January 1st or January 1st itself if it's a Saturday
    if (daysOffset === 6) {
      // January 1st is Saturday, end of week is January 1st
      endOfFirstWeek.setDate(1);
    } else {
      // End of week is the first Saturday
      endOfFirstWeek.setDate(firstDayOfYear.getDate() + (6 - daysOffset));
    }
    
    return {
      start: new Date(firstDayOfYear),
      end: endOfFirstWeek,
      formatted: `${formatDate(firstDayOfYear)} - ${formatDate(endOfFirstWeek)}`
    };
  }
  
  // For all other weeks, calculate based on first Sunday
  const firstSundayOfYear = new Date(firstDayOfYear);
  if (daysOffset > 0) {
    firstSundayOfYear.setDate(firstDayOfYear.getDate() + (7 - daysOffset));
  }
  
  // Adjust the week number to account for partial first week in years that start mid-week
  const adjustedWeekNumber = daysOffset > 0 ? weekNumber - 1 : weekNumber;
  
  // Calculate the start of the week
  const startOfWeek = new Date(firstSundayOfYear);
  startOfWeek.setDate(firstSundayOfYear.getDate() + (adjustedWeekNumber - 1) * 7);
  
  // Calculate the end of the week
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  return {
    start: startOfWeek,
    end: endOfWeek,
    formatted: `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`
  };
};

/**
 * Format a date as MMM d, yyyy (e.g., Jan 1, 2023)
 */
const formatDate = (date: Date): string => {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

/**
 * Gets the week number that contains today's date
 */
export const getCurrentWeek = (): number => {
  const today = new Date();
  return getWeekNumber(today);
}; 