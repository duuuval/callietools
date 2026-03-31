/**
 * Data layer for CallieTools.
 *
 * Reads from Google Sheets API when credentials are configured.
 * Falls back to mock data for local development.
 *
 * Caching: results are held in-memory for 10 minutes per Vercel
 * serverless function instance. On Vercel, cold starts will re-fetch.
 * This is fine at your scale — if you outgrow it, swap in Vercel KV.
 */

import { google } from "googleapis";

// ─── Types ───────────────────────────────────────────────────

export interface CalendarMeta {
  id: string;
  name: string;
  tier: string;
  last_updated: string;
}

export interface CalendarEvent {
  calendar_id: string;
  title: string;
  start_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM or ""
  end_date: string;
  end_time: string;
  location: string;
  description: string;
}

// ─── In-memory cache ─────────────────────────────────────────

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const cache: Record<string, CacheEntry<unknown>> = {};

function getCached<T>(key: string): T | null {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    delete cache[key];
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache[key] = { data, ts: Date.now() };
}

// ─── Google Sheets client ────────────────────────────────────

function isConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SPREADSHEET_ID
  );
}

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      // Vercel stores the key with literal \n — convert to real newlines
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

// ─── Data fetchers ───────────────────────────────────────────

async function fetchAllCalendars(): Promise<CalendarMeta[]> {
  const cacheKey = "calendars:all";
  const cached = getCached<CalendarMeta[]>(cacheKey);
  if (cached) return cached;

  if (!isConfigured()) return MOCK_CALENDARS;

  const sheets = getSheets();
  const sheetName = process.env.CALENDARS_SHEET_NAME || "Calendars";
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: `${sheetName}!A:D`, // id, name, tier, last_updated
  });

  const rows = res.data.values || [];
  // Skip header row
  const calendars: CalendarMeta[] = rows.slice(1).map((row) => ({
    id: (row[0] || "").trim(),
    name: (row[1] || "").trim(),
    tier: (row[2] || "").trim(),
    last_updated: (row[3] || "").trim(),
  }));

  setCache(cacheKey, calendars);
  return calendars;
}

async function fetchAllEvents(): Promise<CalendarEvent[]> {
  const cacheKey = "events:all";
  const cached = getCached<CalendarEvent[]>(cacheKey);
  if (cached) return cached;

  if (!isConfigured()) return MOCK_EVENTS;

  const sheets = getSheets();
  const sheetName = process.env.EVENTS_SHEET_NAME || "Events";
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: `${sheetName}!A:H`, // calendar_id, title, start_date, start_time, end_date, end_time, location, description
  });

  const rows = res.data.values || [];
  const events: CalendarEvent[] = rows.slice(1).map((row) => ({
    calendar_id: (row[0] || "").trim(),
    title: (row[1] || "").trim(),
    start_date: (row[2] || "").trim(),
    start_time: (row[3] || "").trim(),
    end_date: (row[4] || "").trim(),
    end_time: (row[5] || "").trim(),
    location: (row[6] || "").trim(),
    description: (row[7] || "").trim(),
  }));

  setCache(cacheKey, events);
  return events;
}

// ─── Public API ──────────────────────────────────────────────

export async function getCalendar(id: string): Promise<CalendarMeta | null> {
  const all = await fetchAllCalendars();
  return all.find((c) => c.id === id) || null;
}

export async function getCalendars(): Promise<CalendarMeta[]> {
  return fetchAllCalendars();
}

export async function getEvents(calendarId: string): Promise<CalendarEvent[]> {
  const all = await fetchAllEvents();
  return all.filter((e) => e.calendar_id === calendarId);
}

// ─── Mock data (used when Google credentials aren't set) ─────

const MOCK_CALENDARS: CalendarMeta[] = [
  {
    id: "CCPS25-26",
    name: "CCPS Traditional Calendar 2025-2026",
    tier: "free",
    last_updated: "2025-06-01",
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
  {
    calendar_id: "CCPS25-26",
    title: "Labor Day - No School",
    start_date: "2025-09-01",
    start_time: "",
    end_date: "2025-09-01",
    end_time: "",
    location: "",
    description: "",
  },
  {
    calendar_id: "CCPS25-26",
    title: "Teacher Workday - No School",
    start_date: "2025-11-03",
    start_time: "",
    end_date: "2025-11-03",
    end_time: "",
    location: "",
    description: "",
  },
  {
    calendar_id: "CCPS25-26",
    title: "Thanksgiving Break",
    start_date: "2025-11-26",
    start_time: "",
    end_date: "2025-11-28",
    end_time: "",
    location: "",
    description: "",
  },
  {
    calendar_id: "CCPS25-26",
    title: "Winter Break",
    start_date: "2025-12-22",
    start_time: "",
    end_date: "2026-01-02",
    end_time: "",
    location: "",
    description: "",
  },
  {
    calendar_id: "CCPS25-26",
    title: "Last Day of School",
    start_date: "2026-06-12",
    start_time: "",
    end_date: "2026-06-12",
    end_time: "",
    location: "",
    description: "",
  },
];
