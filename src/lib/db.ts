/**
 * Data layer for CallieTools — Supabase backend.
 *
 * Drop-in replacement for sheets.ts with matching function signatures.
 * Reads/writes to Supabase when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * are configured. Falls back to mock data otherwise (matches sheets.ts behavior).
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// ─── Types (match sheets.ts exactly) ─────────────────────────

export interface CalendarMeta {
  id: string;
  name: string;
  tier: string;
  last_updated: string;
  timezone: string;
  email?: string;
  manage_token?: string;
  accentColor?: string;
  theme?: string;
  websiteUrl?: string;
  logoUrl?: string;
}

export interface CalendarEvent {
  calendar_id: string;
  title: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  location: string;
  description: string;
}

// ─── Supabase client ─────────────────────────────────────────

function isConfigured(): boolean {
  return !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    }
  );
  return _client;
}

// ─── Date/time conversion helpers ────────────────────────────

/**
 * Convert a date string + time string + IANA timezone into a UTC ISO timestamp.
 * - date: "YYYY-MM-DD" (required)
 * - time: "HH:MM" or "" (empty = all-day event)
 * - timezone: IANA string like "America/New_York"
 *
 * Returns { iso, allDay } where iso is a UTC ISO string suitable for Postgres timestamptz.
 */
function toTimestamptz(
  date: string,
  time: string,
  timezone: string
): { iso: string; allDay: boolean } {
  if (!date) throw new Error("Date is required");

  const allDay = !time;
  // For all-day events, use midnight in the calendar's timezone as the anchor.
  const timeStr = time || "00:00";

  // Build ISO-like string with no timezone, then interpret in the given timezone.
  // Strategy: use Intl to figure out the timezone offset for that wall-clock moment,
  // then convert to UTC.
  const wallClock = `${date}T${timeStr}:00`;

  // Use a trick: format the same moment in both UTC and target TZ, diff = offset
  const naiveDate = new Date(wallClock + "Z"); // pretend it's UTC
  const localFormat = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = localFormat.formatToParts(naiveDate);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  const asLocal = new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`
  );

  // The difference tells us the timezone offset
  const offsetMs = naiveDate.getTime() - asLocal.getTime();
  const utcDate = new Date(naiveDate.getTime() + offsetMs);

  return { iso: utcDate.toISOString(), allDay };
}

/**
 * Convert a Postgres timestamptz + timezone back to date/time strings.
 * Returns { date: "YYYY-MM-DD", time: "HH:MM" or "" if all_day }.
 */
function fromTimestamptz(
  iso: string,
  timezone: string,
  allDay: boolean
): { date: string; time: string } {
  const d = new Date(iso);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const time = allDay ? "" : `${get("hour")}:${get("minute")}`;

  return { date, time };
}

// ─── Row → Interface mappers ─────────────────────────────────

interface CalendarRow {
  id: string;
  name: string;
  tier: string;
  timezone: string;
  email: string;
  manage_token: string;
  accent_color: string | null;
  theme: string | null;
  website_url: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

interface EventRow {
  id: string;
  calendar_id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location: string | null;
  description: string | null;
}

function rowToCalendarMeta(row: CalendarRow): CalendarMeta {
  return {
    id: row.id,
    name: row.name,
    tier: row.tier,
    last_updated: row.updated_at.slice(0, 10),
    timezone: row.timezone,
    email: row.email,
    manage_token: row.manage_token,
    accentColor: row.accent_color || undefined,
    theme: row.theme || undefined,
    websiteUrl: row.website_url || undefined,
    logoUrl: row.logo_url || undefined,
  };
}

function rowToCalendarEvent(row: EventRow, timezone: string): CalendarEvent {
  const start = fromTimestamptz(row.start_at, timezone, row.all_day);
  const end = row.end_at
    ? fromTimestamptz(row.end_at, timezone, row.all_day)
    : { date: start.date, time: "" };

  return {
    calendar_id: row.calendar_id,
    title: row.title,
    start_date: start.date,
    start_time: start.time,
    end_date: end.date,
    end_time: end.time,
    location: row.location || "",
    description: row.description || "",
  };
}

// ─── Public API (reads) ──────────────────────────────────────

export async function getCalendar(id: string): Promise<CalendarMeta | null> {
  if (!isConfigured()) return MOCK_CALENDARS.find((c) => c.id === id) || null;

  const client = getClient();
  const { data, error } = await client
    .from("calendars")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getCalendar error:", error);
    return null;
  }
  if (!data) return null;
  return rowToCalendarMeta(data as CalendarRow);
}

export async function getCalendars(): Promise<CalendarMeta[]> {
  if (!isConfigured()) return MOCK_CALENDARS;

  const client = getClient();
  const { data, error } = await client.from("calendars").select("*");

  if (error) {
    console.error("getCalendars error:", error);
    return [];
  }
  return (data as CalendarRow[]).map(rowToCalendarMeta);
}

export async function getEvents(calendarId: string): Promise<CalendarEvent[]> {
  if (!isConfigured()) return MOCK_EVENTS.filter((e) => e.calendar_id === calendarId);

  const client = getClient();

  // Need the calendar's timezone to render dates/times correctly.
  const { data: calRow, error: calErr } = await client
    .from("calendars")
    .select("timezone")
    .eq("id", calendarId)
    .maybeSingle();

  if (calErr) {
    console.error("getEvents (calendar lookup) error:", calErr);
    return [];
  }
  const timezone = (calRow?.timezone as string) || "America/New_York";

  const { data, error } = await client
    .from("events")
    .select("*")
    .eq("calendar_id", calendarId)
    .order("start_at", { ascending: true });

  if (error) {
    console.error("getEvents error:", error);
    return [];
  }
  return (data as EventRow[]).map((row) => rowToCalendarEvent(row, timezone));
}

export async function getCalendarByToken(token: string): Promise<CalendarMeta | null> {
  if (!isConfigured()) return null;

  const client = getClient();
  const { data, error } = await client
    .from("calendars")
    .select("*")
    .eq("manage_token", token)
    .maybeSingle();

  if (error) {
    console.error("getCalendarByToken error:", error);
    return null;
  }
  if (!data) return null;
  return rowToCalendarMeta(data as CalendarRow);
}

export async function getCalendarsByEmail(email: string): Promise<CalendarMeta[]> {
  if (!isConfigured()) return [];

  const client = getClient();
  const { data, error } = await client
    .from("calendars")
    .select("*")
    .eq("email", email.toLowerCase().trim());

  if (error) {
    console.error("getCalendarsByEmail error:", error);
    return [];
  }
  return (data as CalendarRow[]).map(rowToCalendarMeta);
}

// ─── Public API (writes) ─────────────────────────────────────

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function findUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  if (!base) throw new Error("Calendar name produces empty slug");

  const existing = await getCalendar(base);
  if (!existing) return base;

  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`;
    const found = await getCalendar(candidate);
    if (!found) return candidate;
  }

  return `${base}-${randomUUID().slice(0, 6)}`;
}

export async function createCalendar(opts: {
  id: string;
  name: string;
  email: string;
  timezone?: string;
}): Promise<{ manage_token: string }> {
  const manage_token = randomUUID();

  // Inherit paid branding from existing calendars for this email
  const existingCalendars = await getCalendarsByEmail(opts.email);
  const paidCalendar = existingCalendars.find((c) => c.tier === "paid");
  const tier = paidCalendar ? "paid" : "free";
  const accent_color = paidCalendar?.accentColor ?? null;
  const theme = paidCalendar?.theme ?? null;
  const logo_url = paidCalendar?.logoUrl ?? null;

  const client = getClient();
  const { error } = await client.from("calendars").insert({
    id: opts.id,
    name: opts.name,
    tier,
    timezone: opts.timezone || "America/New_York",
    email: opts.email,
    manage_token,
    accent_color,
    theme,
    website_url: null,
    logo_url,
  });

  if (error) {
    console.error("createCalendar error:", error);
    throw new Error(`Failed to create calendar: ${error.message}`);
  }

  return { manage_token };
}

export async function appendEvents(
  calendarId: string,
  events: Omit<CalendarEvent, "calendar_id">[]
): Promise<void> {
  if (events.length === 0) return;

  // Need the calendar's timezone to convert date/time strings to UTC timestamps.
  const calendar = await getCalendar(calendarId);
  if (!calendar) throw new Error(`Calendar ${calendarId} not found`);
  const timezone = calendar.timezone || "America/New_York";

  const client = getClient();
  const rows = events.map((e) => {
    const start = toTimestamptz(e.start_date, e.start_time, timezone);
    const end = e.end_date
      ? toTimestamptz(e.end_date, e.end_time || e.start_time, timezone)
      : null;

    return {
      calendar_id: calendarId,
      title: e.title,
      start_at: start.iso,
      end_at: end?.iso || null,
      all_day: start.allDay,
      location: e.location || null,
      description: e.description || null,
    };
  });

  const { error } = await client.from("events").insert(rows);
  if (error) {
    console.error("appendEvents error:", error);
    throw new Error(`Failed to append events: ${error.message}`);
  }
}

export async function updateEvents(
  calendarId: string,
  events: Omit<CalendarEvent, "calendar_id">[]
): Promise<void> {
  const client = getClient();

  // Delete all existing events for this calendar, then insert the new set.
  // This matches the "replace-all" strategy from sheets.ts.
  const { error: delError } = await client
    .from("events")
    .delete()
    .eq("calendar_id", calendarId);

  if (delError) {
    console.error("updateEvents (delete) error:", delError);
    throw new Error(`Failed to clear events: ${delError.message}`);
  }

  if (events.length > 0) {
    await appendEvents(calendarId, events);
  }
}

export async function updateCalendarBranding(
  calendarId: string,
  branding: { accentColor?: string; theme?: string }
): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from("calendars")
    .update({
      accent_color: branding.accentColor ?? null,
      theme: branding.theme ?? null,
    })
    .eq("id", calendarId);

  if (error) {
    console.error("updateCalendarBranding error:", error);
    throw new Error(`Failed to update branding: ${error.message}`);
  }
}

// ─── /my-calendars — Dashboard tokens ────────────────────────

export async function createDashboardToken(email: string): Promise<string> {
  const token = randomUUID();
  const client = getClient();

  const { error } = await client.from("dashboard_tokens").insert({
    token,
    email: email.toLowerCase().trim(),
  });

  if (error) {
    console.error("createDashboardToken error:", error);
    throw new Error(`Failed to create dashboard token: ${error.message}`);
  }

  return token;
}

export async function validateDashboardToken(
  token: string
): Promise<{ email: string } | null> {
  const client = getClient();
  const { data, error } = await client
    .from("dashboard_tokens")
    .select("email, created_at")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    console.error("validateDashboardToken error:", error);
    return null;
  }
  if (!data) return null;

  const createdAt = new Date(data.created_at as string).getTime();
  const thirtyMinutes = 30 * 60 * 1000;
  if (Date.now() - createdAt > thirtyMinutes) return null;

  return { email: data.email as string };
}

// ─── Mock data (matches sheets.ts) ───────────────────────────

const MOCK_CALENDARS: CalendarMeta[] = [
  {
    id: "CCPS25-26",
    name: "CCPS Traditional Calendar 2025-2026",
    tier: "free",
    last_updated: "2025-06-01",
    timezone: "America/New_York",
  },
];

const MOCK_EVENTS: CalendarEvent[] = [
  {
    calendar_id: "CCPS25-26",
    title: "First Day of School",
    start_date: "2025-09-02",
    start_time: "",
    end_date: "2025-09-02",
    end_time: "",
    location: "",
    description: "First day of school for all CCPS students",
  },
];
