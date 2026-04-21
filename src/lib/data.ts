// src/lib/data.ts
/**
 * Data layer router.
 *
 * Re-exports the Supabase backend (db.ts) under the name expected by the
 * rest of the app. sheets.ts is retained in the repo as legacy reference
 * but is no longer wired in — DATA_BACKEND=supabase has been stable in
 * production and the sheets path is dead.
 *
 * This file is temporary scaffolding. Once all imports are updated to
 * point directly at db.ts, this file and sheets.ts will be deleted.
 */
export type { CalendarMeta, CalendarEvent } from "./db";

export {
  getCalendar,
  getCalendars,
  getEvents,
  getCalendarByToken,
  getCalendarsByEmail,
  slugify,
  findUniqueSlug,
  createCalendar,
  appendEvents,
  updateEvents,
  updateCalendarBranding,
  createDashboardToken,
  validateDashboardToken,
} from "./db";
