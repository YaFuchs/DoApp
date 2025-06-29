/**
 * Date utility functions for consistent date handling across the app
 */

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export const getTodayString = () => {
  return new Date().toLocaleDateString('en-CA');
};

/**
 * Get yesterday's date in YYYY-MM-DD format (local timezone)
 * @returns {string} Yesterday's date in YYYY-MM-DD format
 */
export const getYesterdayString = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toLocaleDateString('en-CA');
};

/**
 * Get tomorrow's date in YYYY-MM-DD format (local timezone)
 * @returns {string} Tomorrow's date in YYYY-MM-DD format
 */
export const getTomorrowString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toLocaleDateString('en-CA');
};

/**
 * Format a date string for display
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDateForDisplay = (dateString, options = {}) => {
  if (!dateString) return '';
  
  const defaultOptions = {
    weekday: 'short',
    month: 'short', 
    day: 'numeric'
  };
  
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

/**
 * Check if a date string is today
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {boolean} True if the date is today
 */
export const isToday = (dateString) => {
  return dateString === getTodayString();
};

/**
 * Check if a date string is yesterday
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {boolean} True if the date is yesterday
 */
export const isYesterday = (dateString) => {
  return dateString === getYesterdayString();
};

/**
 * Check if a date string is tomorrow
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {boolean} True if the date is tomorrow
 */
export const isTomorrow = (dateString) => {
  return dateString === getTomorrowString();
};

/**
 * Get relative date label (Today, Yesterday, Tomorrow, or formatted date)
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Relative date label
 */
export const getRelativeDateLabel = (dateString) => {
  if (isToday(dateString)) return 'Today';
  if (isYesterday(dateString)) return 'Yesterday';
  if (isTomorrow(dateString)) return 'Tomorrow';
  return formatDateForDisplay(dateString);
};

/**
 * Get the start of week for a given date
 * @param {Date|string} date - Date object or YYYY-MM-DD string
 * @param {string} weekStart - 'monday' or 'sunday'
 * @returns {string} Week start date in YYYY-MM-DD format
 */
export const getWeekStart = (date, weekStart = 'monday') => {
  let dateObj;
  if (typeof date === 'string') {
    dateObj = new Date(date + 'T00:00:00Z');
  } else {
    const localDateString = date.toLocaleDateString('en-CA');
    dateObj = new Date(localDateString + 'T00:00:00Z');
  }

  const dayOfWeekUTC = dateObj.getUTCDay();

  if (weekStart === 'sunday') {
    dateObj.setUTCDate(dateObj.getUTCDate() - dayOfWeekUTC);
  } else {
    const daysToSubtract = dayOfWeekUTC === 0 ? 6 : dayOfWeekUTC - 1;
    dateObj.setUTCDate(dateObj.getUTCDate() - daysToSubtract);
  }

  return dateObj.toISOString().split('T')[0];
};

/**
 * Get an array of dates for a week
 * @param {string} weekStartDate - Week start date in YYYY-MM-DD format
 * @returns {string[]} Array of 7 dates in YYYY-MM-DD format
 */
export const getWeekDates = (weekStartDate) => {
  const dates = [];
  const startDate = new Date(weekStartDate + 'T00:00:00Z');
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
};

/**
 * Parse completion date, preferring completion_date over created_date
 * @param {object} completion - Completion object with completion_date and/or created_date
 * @returns {Date} Parsed date object
 */
export const parseCompletionDate = (completion) => {
  const dateToFormat = completion.completion_date || completion.created_date;
  return new Date(dateToFormat);
};

/**
 * Compare two date strings
 * @param {string} date1 - First date in YYYY-MM-DD format
 * @param {string} date2 - Second date in YYYY-MM-DD format
 * @returns {number} -1 if date1 < date2, 1 if date1 > date2, 0 if equal
 */
export const compareDateStrings = (date1, date2) => {
  if (date1 < date2) return -1;
  if (date1 > date2) return 1;
  return 0;
};

/**
 * Check if a date is within a date range (inclusive)
 * @param {string} date - Date to check in YYYY-MM-DD format
 * @param {string} startDate - Range start date in YYYY-MM-DD format
 * @param {string} endDate - Range end date in YYYY-MM-DD format
 * @returns {boolean} True if date is within range
 */
export const isDateInRange = (date, startDate, endDate) => {
  return date >= startDate && date <= endDate;
};
