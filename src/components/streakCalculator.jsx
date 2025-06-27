
/**
 * Streak Calculator Utility
 * Implements comprehensive streak counting logic for habit tracking
 */

// Helper to get YYYY-MM-DD from a Date object in its local timezone
function getLocalYYYYMMDD(d) {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to create a UTC Date object at midnight for a given YYYY-MM-DD string
function getUTCMidnightForYYYYMMDD(dateString) {
  return new Date(dateString + 'T00:00:00Z');
}

/**
 * Get the start of the week for a given date
 * @param {Date} date - The date to find week start for (expected to be a UTC Date object)
 * @param {number} weekStartDay - 0 for Sunday, 1 for Monday (UTC day of week)
 * @returns {Date} - Start of the week (normalized to UTC midnight)
 */
export function getWeekStart(date, weekStartDay) {
  const d = new Date(date); // Create copy
  
  const currentDay = d.getUTCDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
  let daysToSubtract;
  
  if (weekStartDay === 0) { // Sunday start
    daysToSubtract = currentDay;
  } else { // Monday start
    daysToSubtract = currentDay === 0 ? 6 : currentDay - 1;
  }
  
  const weekStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); // Start from current day UTC midnight
  weekStart.setUTCDate(weekStart.getUTCDate() - daysToSubtract);
  return weekStart;
}

/**
 * Get days remaining in the current week (including today)
 * @param {Date} date - The current date (expected to be a UTC Date object)
 * @param {number} weekStartDay - 0 for Sunday, 1 for Monday (UTC day of week)
 * @returns {number} - Days remaining including today
 */
export function daysRemainingInWeek(date, weekStartDay) {
  const d = new Date(date); // Create copy
  
  const currentDay = d.getUTCDay();
  let daysFromWeekStart;
  
  if (weekStartDay === 0) { // Sunday start
    daysFromWeekStart = currentDay;
  } else { // Monday start
    daysFromWeekStart = currentDay === 0 ? 6 : currentDay - 1;
  }
  
  return 7 - daysFromWeekStart; // Including today
}

/**
 * Get days remaining in the current week (including today) that don't already have completions
 * @param {Date} date - The current date (expected to be a UTC Date object)
 * @param {number} weekStartDay - 0 for Sunday, 1 for Monday (UTC day of week)
 * @param {Array<string>} completionDatesInWeek - Array of completion date strings (YYYY-MM-DD) in the current week
 * @returns {number} - Available days remaining for new completions
 */
export function availableDaysRemainingInWeek(date, weekStartDay, completionDatesInWeek) {
  const d = new Date(date); // Create copy
  
  const currentDay = d.getUTCDay();
  let daysFromWeekStart;
  
  if (weekStartDay === 0) { // Sunday start
    daysFromWeekStart = currentDay;
  } else { // Monday start
    daysFromWeekStart = currentDay === 0 ? 6 : currentDay - 1;
  }
  
  const totalDaysRemainingIncludingToday = 7 - daysFromWeekStart;
  
  // Create a Set of completion dates for fast lookup
  const completionDateSet = new Set(completionDatesInWeek);
  
  // Count days from today until end of week that don't have completions
  let availableDays = 0;
  const currentDate = new Date(d); // Start from the passed date (local today as UTC midnight)
  
  for (let i = 0; i < totalDaysRemainingIncludingToday; i++) {
    const dayStr = getLocalYYYYMMDD(currentDate); // Get local YYYY-MM-DD from this current Date object
    if (!completionDateSet.has(dayStr)) {
      availableDays++;
    }
    currentDate.setUTCDate(currentDate.getUTCDate() + 1); // Move to next day (UTC)
  }
  
  return availableDays;
}

/**
 * Get all weeks between two dates
 * @param {Date} startDate - Start date (expected UTC Date object)
 * @param {Date} endDate - End date (expected UTC Date object)
 * @param {number} weekStartDay - 0 for Sunday, 1 for Monday (UTC day of week)
 * @returns {Array<{start: Date, end: Date}>} - Array of week ranges (UTC Date objects)
 */
function getWeeksBetween(startDate, endDate, weekStartDay) {
  const weeks = [];
  let currentWeekStart = getWeekStart(startDate, weekStartDay); // Returns UTC Date
  const normalizedEndDate = new Date(endDate); // Create copy
  
  while (currentWeekStart.getTime() <= normalizedEndDate.getTime()) { // Compare UTC timestamps
    const weekEnd = new Date(currentWeekStart); // Create copy
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6); // Add 6 days (UTC)
    
    weeks.push({
      start: new Date(currentWeekStart), // Push copies
      end: weekEnd
    });
    
    currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + 7); // Move to next week (UTC)
  }
  
  return weeks;
}

/**
 * Check if a date falls within a week range
 * @param {Date} date - Date to check (expected UTC Date object)
 * @param {Object} week - Week object with start and end dates (expected UTC Date objects)
 * @returns {boolean} - True if date is in week
 */
function isDateInWeek(date, week) {
  // All dates are already UTC midnight, so direct comparison is fine
  return date.getTime() >= week.start.getTime() && date.getTime() <= week.end.getTime();
}

/**
 * Count completions in a specific week
 * @param {Array<string>} completions - Array of completion date strings (YYYY-MM-DD)
 * @param {Object} week - Week object with start and end dates (expected UTC Date objects)
 * @returns {number} - Number of completions in the week
 */
function countCompletionsInWeek(completions, week) {
  return completions.filter(completionDateStr => {
    const completionDate = getUTCMidnightForYYYYMMDD(completionDateStr); // Convert string to UTC Date
    return isDateInWeek(completionDate, week);
  }).length;
}

/**
 * Get completion dates in a specific week
 * @param {Array<string>} completions - Array of completion date strings
 * @param {Object} week - Week object with start and end dates (expected UTC Date objects)
 * @returns {Array<string>} - Array of completion date strings in the week
 */
function getCompletionsInWeek(completions, week) {
  return completions.filter(completionDateStr => {
    const completionDate = getUTCMidnightForYYYYMMDD(completionDateStr); // Convert string to UTC Date
    return isDateInWeek(completionDate, week);
  });
}

/**
 * Get the first completion date in a week
 * @param {Array<string>} completions - Array of completion date strings
 * @param {Object} week - Week object with start and end dates (expected UTC Date objects)
 * @returns {Date|null} - First completion date in week (UTC Date object) or null
 */
function getFirstCompletionInWeek(completions, week) {
  const weekCompletions = completions
    .filter(completionDateStr => {
      const completionDate = getUTCMidnightForYYYYMMDD(completionDateStr); // Convert string to UTC Date
      return isDateInWeek(completionDate, week);
    })
    .map(getUTCMidnightForYYYYMMDD) // Map strings to UTC Dates
    .sort((a, b) => a.getTime() - b.getTime()); // Sort by UTC timestamp
  
  return weekCompletions.length > 0 ? weekCompletions[0] : null;
}

/**
 * Main streak calculation function
 * @param {Object} habit - Habit object with completions and settings
 * @param {number} weekStartDay - 0 for Sunday, 1 for Monday (0 for Sunday, 1 for Monday)
 * @param {Date|null} todayOverride - Optional Date object to override the current date for testing. If provided, will be converted to UTC midnight of its local calendar day.
 * @returns {Object} - Object with currentStreak, lastStreakBrokenAt, and streakStartDate
 */
export function recomputeStreak(habit, weekStartDay, todayOverride = null) {
  const completions = habit.completions || [];
  const timesPerWeek = habit.frequency || 1; // Default to 1 if not specified
  
  // Normalize completion dates to YYYY-MM-DD format as they might be ISO strings initially
  const normalizedCompletions = completions
    .map(c => typeof c === 'string' ? c.split('T')[0] : getLocalYYYYMMDD(new Date(c))) // Ensure YYYY-MM-DD format
    .sort(); // Sort them for consistent processing
  
  // Determine 'today' as a UTC Date object representing the local calendar day's midnight
  const localToday = todayOverride ? new Date(todayOverride) : new Date();
  const today = getUTCMidnightForYYYYMMDD(getLocalYYYYMMDD(localToday));

  // If no completions, streak is 0
  if (normalizedCompletions.length === 0) {
    return {
      currentStreak: 0,
      lastStreakBrokenAt: null,
      streakStartDate: null
    };
  }
  
  // Start from habit creation date or first completion, whichever is earlier
  const firstCompletionDate = getUTCMidnightForYYYYMMDD(normalizedCompletions[0]);
  const createdAt = habit.created_date ? getUTCMidnightForYYYYMMDD(habit.created_date.split('T')[0]) : firstCompletionDate;
  const startDate = new Date(Math.min(createdAt.getTime(), firstCompletionDate.getTime())); // Compare UTC timestamps
  
  // Get all weeks from start to today (all Date objects are UTC)
  const weeks = getWeeksBetween(startDate, today, weekStartDay);
  
  let currentStreak = 0;
  let lastStreakBrokenAt = null;
  let streakActive = true;
  let streakStartDate = null; // Track when current streak started
  
  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i];
    const hits = countCompletionsInWeek(normalizedCompletions, week);
    let required = timesPerWeek;
    
    // Check for partial-week grace
    const isFirstActiveWeek = i === 0 || (lastStreakBrokenAt && week.start.getTime() > getUTCMidnightForYYYYMMDD(lastStreakBrokenAt).getTime());
    
    if (isFirstActiveWeek) {
      const firstCompletionInWeek = getFirstCompletionInWeek(normalizedCompletions, week);
      if (firstCompletionInWeek) {
        // daysRemainingInWeek calculates using UTC days
        const daysRemaining = daysRemainingInWeek(firstCompletionInWeek, weekStartDay);
        if (daysRemaining < required) {
          required = 0; // Grace week - no requirement
        }
      }
    }
    
    // Check if week is successful
    const weekSuccessful = required === 0 || hits >= required;
    
    if (!weekSuccessful) {
      // Check if this is the current week and might still be achievable
      const isCurrentWeek = isDateInWeek(today, week);
      
      if (isCurrentWeek) {
        // Get completion dates in the current week for refined calculation
        const completionDatesInWeek = getCompletionsInWeek(normalizedCompletions, week);
        const availableDays = availableDaysRemainingInWeek(today, weekStartDay, completionDatesInWeek);
        const canStillAchieve = hits + availableDays >= required;
        
        if (!canStillAchieve) {
          // Impossible to achieve - break streak now
          streakActive = false;
          lastStreakBrokenAt = getLocalYYYYMMDD(today); // Store local date string of breakdown
          streakStartDate = null;
          break;
        } else {
          // It's the current week, not yet successful, but can still achieve.
          // If the streak was previously broken, restart it now to show current momentum.
          if (!streakActive) {
            streakActive = true;
            lastStreakBrokenAt = null;
            const firstCompletionInCurrentWeek = getFirstCompletionInWeek(normalizedCompletions, week);
            if (firstCompletionInCurrentWeek) {
              streakStartDate = getLocalYYYYMMDD(firstCompletionInCurrentWeek); // Store local date string
            }
          }
        }
      } else {
        // Past week that failed - break streak
        streakActive = false;
        lastStreakBrokenAt = getLocalYYYYMMDD(week.end); // Store local date string of breakdown
        streakStartDate = null;
        // Continue to see if streak restarts later
        continue;
      }
    }
    
    if (weekSuccessful && !streakActive) {
      // Streak was broken but this week is successful - restart streak
      streakActive = true;
      lastStreakBrokenAt = null;
      
      // Set streak start date to first completion in this successful week
      const firstCompletionInWeek = getFirstCompletionInWeek(normalizedCompletions, week);
      if (firstCompletionInWeek) {
        streakStartDate = getLocalYYYYMMDD(firstCompletionInWeek); // Convert to YYYY-MM-DD format
      }
    } else if (weekSuccessful && streakActive && !streakStartDate) {
      // If streak is active but we don't have a start date yet, set it
      const firstCompletionInWeek = getFirstCompletionInWeek(normalizedCompletions, week);
      if (firstCompletionInWeek) {
        streakStartDate = getLocalYYYYMMDD(firstCompletionInWeek);
      }
    }
  }
  
  // Calculate final currentStreak using the improved logic
  if (streakActive && streakStartDate) {
    // Count completions from streak start date onward
    currentStreak = normalizedCompletions.filter((dateStr) => {
      // Compare YYYY-MM-DD strings directly
      return dateStr >= streakStartDate;
    }).length;
  } else if (streakActive && !streakStartDate && !lastStreakBrokenAt && normalizedCompletions.length > 0) {
    // If streak is active, never broken, and no specific start date from a restart (e.g., brand new habit with first completion in first week with grace)
    // Count all completions as the streak is effectively from the very beginning
    currentStreak = normalizedCompletions.length;
  } else {
    currentStreak = 0;
  }
  
  return {
    currentStreak,
    lastStreakBrokenAt,
    streakStartDate
  };
}

/**
 * Calculate streak for a habit (main public function)
 * @param {Object} habit - Habit object
 * @param {Array<Object>} completions - Array of completion objects (from HabitCompletion entity)
 * @param {string} weekStart - 'sunday' or 'monday'
 * @param {Date|null} todayOverride - Optional date to override the current date for testing
 * @returns {number} - Current streak count
 */
export function calculateHabitStreak(habit, completions, weekStart, todayOverride = null) {
  // Convert completions to the format expected by recomputeStreak (array of YYYY-MM-DD strings)
  const habitCompletionsAsStrings = completions
    .filter(c => {
      // Handle both user_habit_id (authenticated) and habit_id (anonymous)
      const completionHabitId = c.user_habit_id || c.habit_id;
      return completionHabitId === habit.id && c.completed;
    })
    .map(c => c.completion_date) // Ensure this is YYYY-MM-DD format from the entity
    .sort();
  
  const habitWithNormalizedCompletions = {
    ...habit,
    completions: habitCompletionsAsStrings
  };
  
  const result = recomputeStreak(habitWithNormalizedCompletions, weekStart === 'sunday' ? 0 : 1, todayOverride);
  return result.currentStreak;
}
