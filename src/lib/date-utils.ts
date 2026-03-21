// date-utils.ts

/**
 * For TRUE UTC timestamps (completedAt, createdAt, canceledAt, etc.)
 * Just format them for display in the user's local timezone.
 * No reinterpretation needed — JS Date already handles this correctly.
 */
export function formatUTCTimestamp(
    date: Date | string | null,
    locale = 'en-US',
    options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    },
): string | null {
    if (!date) return null;
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString(locale, options);
}

/**
 * For "date-only" fields stored WITHOUT timezone intent
 * (Show.startDate, Show.endDate — stored as midnight UTC but meaning
 * "this calendar date" with no time component).
 *
 * Extracts the calendar date from UTC components, ignoring time entirely.
 * Use this ONLY for display, never for arithmetic with real UTC timestamps.
 */
export function formatCalendarDate(
    date: Date | string,
    locale = 'en-US',
    options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    },
): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    // Read the UTC components directly — don't let JS shift the date
    const isoDateOnly = d.toISOString().slice(0, 10); // "2024-03-15"
    const [year, month, day] = isoDateOnly.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(locale, options);
}

/**
 * Converts a UTC-midnight calendar date from the DB into a local Date
 * object at midnight, suitable for use in date pickers and form state.
 */
export function calendarDateToLocal(date: Date | string): Date {
    const iso = typeof date === 'string' ? date : date.toISOString();
    // Slice the date part and parse as local midnight — no timezone shift
    return new Date(iso.slice(0, 10) + 'T00:00:00');
}


/**
 * For STORING a calendar-only date (Show.startDate, Show.endDate).
 * Normalizes any date to UTC midnight so it round-trips cleanly.
 * Pass a local date string like "2024-03-15" or a Date object.
 */
export function toCalendarDateUTC(date: Date | string): Date {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/**
 * Given a UTC offset in minutes (e.g. -480 for PST, 330 for IST),
 * returns the start of the user's local day as a UTC Date.
 *
 * Note: Date.prototype.getTimezoneOffset() returns minutes *behind* UTC
 * (positive for west, negative for east). If you're passing the browser's
 * getTimezoneOffset() directly, that convention is already handled here.
 */
export function getUTCStartOfUserDay(
    referenceUTC: Date = new Date(),
): Date {
    // Shift the UTC time into the user's local time
    const utcOffsetMinutes = -new Date().getTimezoneOffset();
    const localMs = referenceUTC.getTime() + utcOffsetMinutes * 60_000;
    const localDate = new Date(localMs);

    // Truncate to midnight in that local time
    const midnightLocal = Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate(), 0, 0, 0, 0);

    // Convert back to UTC by subtracting the offset
    return new Date(midnightLocal - utcOffsetMinutes * 60_000);
}

/**
 * Returns [startUTC, endUTC] for the user's local day.
 */
export function getUserDayBoundsUTC(referenceUTC: Date = new Date()): [Date, Date] {
    const start = getUTCStartOfUserDay(referenceUTC);
    const end = new Date(start.getTime() + 24 * 60 * 60_000); // exactly 24h later
    return [start, end];
}

/**
 * Returns [startUTC, endUTC] for the user's local week (Sunday start).
 */
export function getUserWeekBoundsUTC(referenceUTC: Date = new Date()): [Date, Date] {
    const dayStart = getUTCStartOfUserDay(referenceUTC);
    const utcOffsetMinutes = -new Date().getTimezoneOffset();

    // Find what day of the week this is in the user's local time
    const localMs = referenceUTC.getTime() + utcOffsetMinutes * 60_000;
    const localDate = new Date(localMs);
    const dayOfWeek = localDate.getUTCDay(); // 0 = Sunday

    const weekStart = new Date(dayStart.getTime() - dayOfWeek * 24 * 60 * 60_000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60_000);
    return [weekStart, weekEnd];
}
