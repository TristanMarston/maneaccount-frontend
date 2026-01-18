export function normalizeDateToUTC(date: Date | string | null): Date | null {
    if (!date) return null;
    const d = typeof date === 'string' ? new Date(date) : date;

    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function parseUTCToLocal(date: Date | string | null): Date | null {
    if (!date) return null;
    const d = typeof date === 'string' ? new Date(date) : date;

    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function getLocalTodayStart(timezoneOffsetMinutes: number): Date {
    const now = new Date();
    const localToday = new Date(now.getTime() - timezoneOffsetMinutes * 60000);
    localToday.setHours(0, 0, 0, 0);

    return new Date(localToday.getTime() + timezoneOffsetMinutes * 60000);
}
