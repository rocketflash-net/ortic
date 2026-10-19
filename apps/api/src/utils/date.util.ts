const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const addMinutes = (date: Date, minutes: number): Date => new Date(date.getTime() + minutes * MINUTE_MS);

const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);

const isPast = (date: Date | null | undefined, now: Date = new Date()): boolean => !!date && date.getTime() <= now.getTime();

// Tanggal kalender (YYYY-MM-DD) di zona waktu tertentu, mis. tanggal acara di lokasi acara.
const calendarDay = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

const isValidTimeZone =(timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
};

export { addMinutes, addDays, isPast, calendarDay, isValidTimeZone };
