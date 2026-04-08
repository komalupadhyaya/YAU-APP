import { formatInTimeZone } from "date-fns-tz";

const DEFAULT_TZ = "America/New_York";

export function todayDisplayMmDdYyyy(d: Date = new Date()): string {
  // Display format requested: MM/DD/YYYY
  return formatInTimeZone(d, DEFAULT_TZ, "MM/dd/yyyy");
}

export function todayApiYyyyMmDd(d: Date = new Date()): string {
  // Pickup API uses YYYY-MM-DD (docs/Pickup-api.md)
  return formatInTimeZone(d, DEFAULT_TZ, "yyyy-MM-dd");
}

export function displayFromApiDate(apiDate: string): string {
  // apiDate: YYYY-MM-DD
  // Use midday UTC to avoid timezone day-shifts when formatting in America/New_York.
  const d = new Date(`${apiDate}T12:00:00Z`);
  return formatInTimeZone(d, DEFAULT_TZ, "MM/dd/yyyy");
}
