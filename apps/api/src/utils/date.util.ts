const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const addMinutes = (date: Date, minutes: number): Date => new Date(date.getTime() + minutes * MINUTE_MS);

const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);

const isPast = (date: Date | null | undefined, now: Date = new Date()): boolean => !!date && date.getTime() <= now.getTime();

// Tanggal kalender (YYYY-MM-DD) di zona waktu tertentu, mis. tanggal acara di lokasi acara.
const calendarDay = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

const isValidTimeZone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
};

const WIB_OFFSET_MS = 7 * 60 * MINUTE_MS;

// Awal hari WIB (YYYY-MM-DD) dalam UTC, mis. "2026-10-20" -> 2026-10-19T17:00:00Z.
const startOfWibDay = (day: string): Date => new Date(Date.parse(day + "T00:00:00Z") - WIB_OFFSET_MS);

// Akhir hari WIB (inklusif) dalam UTC.
const endOfWibDay = (day: string): Date => new Date(startOfWibDay(day).getTime() + DAY_MS - 1);

// Tanggal WIB (YYYY-MM-DD) dari waktu UTC.
const wibDay = (date: Date): string => new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);

export { addMinutes, addDays, isPast, calendarDay, isValidTimeZone, startOfWibDay, endOfWibDay, wibDay };
