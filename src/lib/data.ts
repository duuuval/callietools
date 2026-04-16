/**
 * Data layer router.
 *
 * Exports the same interface as both sheets.ts and db.ts.
 * Selects which backend to use based on the DATA_BACKEND env var.
 *
 * DATA_BACKEND=sheets (default) — legacy Google Sheets backend
 * DATA_BACKEND=supabase — new Supabase backend
 *
 * This file is temporary scaffolding. Once Supabase is stable in production,
 * all imports will be updated to point directly at db.ts and this file
 * (along with sheets.ts) will be deleted.
 */
import * as sheets from "./sheets";
import * as db from "./db";

const backend = process.env.DATA_BACKEND === "supabase" ? db : sheets;

// Re-export types (same shape in both files)
export type { CalendarMeta, CalendarEvent } from "./sheets";

// Re-export functions from the selected backend
export const getCalendar = backend.getCalendar;
export const getCalendars = backend.getCalendars;
export const getEvents = backend.getEvents;
export const getCalendarByToken = backend.getCalendarByToken;
export const getCalendarsByEmail = backend.getCalendarsByEmail;
export const slugify = backend.slugify;
export const findUniqueSlug = backend.findUniqueSlug;
export const createCalendar = backend.createCalendar;
export const appendEvents = backend.appendEvents;
export const updateEvents = backend.updateEvents;
export const updateCalendarBranding = backend.updateCalendarBranding;
export const createDashboardToken = backend.createDashboardToken;
export const validateDashboardToken = backend.validateDashboardToken;
