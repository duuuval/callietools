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
import { randomUUID } from "crypto";

// ─── Types ───────────────────────────────────────────────────

export interface CalendarMeta {
  id: string;
  name: string;
  tier: string;
  last_updated: string;
  timezone: string;
  email?: string;
  manage_token?: string;
  // Paid-tier branding fields (columns H, I, J)
  accentColor?: string;  // e.g. "#D4775B" — applied to subscribe buttons
  theme?: string;        // "light" | "dark"
  websiteUrl?: string;   // OnDek "Visit Website" back-link
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

const CACHE_TTL = 0; // turned off

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

function clearCache(): void {
  for (const key of Object.keys(cache)) {
    delete cache[key];
  }
}

// ─── Google Sheets client (read-only) ────────────────────────

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
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

// ─── Google Sheets client (read/write) ───────────────────────

function getWriteSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
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
  // Extended to A:J to include new branding columns H (accentColor), I (theme), J (websiteUrl)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: `${sheetName}!A:J`,
  });

  const rows = res.data.values || [];
  const calendars: CalendarMeta[] = rows.slice(1).map((row) => ({
    id: (row[0] || "").trim(),
    name: (row[1] || "").trim(),
    tier: (row[2] || "").trim(),
    last_updated: (row[3] || "").trim(),
    timezone: (row[4] || "America/New_York").trim(),
    email: (row[5] || "").trim(),
    manage_token: (row[6] || "").trim(),
    accentColor: (row[7] || "").trim() || undefined,
    theme: (row[8] || "").trim() || undefined,
    websiteUrl: (row[9] || "").trim() || undefined,
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
    range: `${sheetName}!A:H`,
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

// ─── Public API (reads) ──────────────────────────────────────

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

export async function getCalendarByToken(token: string): Promise<CalendarMeta | null> {
  const all = await fetchAllCalendars();
  return all.find((c) => c.manage_token === token) || null;
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
  const now = new Date().toISOString().slice(0, 10);

  const sheets = getWriteSheets();
  const sheetName = process.env.CALENDARS_SHEET_NAME || "Calendars";

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: `${sheetName}!A:J`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          opts.id,
          opts.name,
          "free",
          now,
          opts.timezone || "America/New_York",
          opts.email,
          manage_token,
          "", // accentColor — empty on create
          "", // theme — empty on create
          "", // websiteUrl — empty on create
        ],
      ],
    },
  });

  clearCache();
  return { manage_token };
}

export async function appendEvents(
  calendarId: string,
  events: Omit<CalendarEvent, "calendar_id">[]
): Promise<void> {
  if (events.length === 0) return;

  const sheets = getWriteSheets();
  const sheetName = process.env.EVENTS_SHEET_NAME || "Events";

  const rows = events.map((e) => [
    calendarId,
    e.title,
    e.start_date,
    e.start_time || "",
    e.end_date || e.start_date,
    e.end_time || "",
    e.location || "",
    e.description || "",
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: `${sheetName}!A:H`,
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });

  clearCache();
}

export async function updateEvents(
  calendarId: string,
  events: Omit<CalendarEvent, "calendar_id">[]
): Promise<void> {
  const sheets = getWriteSheets();
  const sheetName = process.env.EVENTS_SHEET_NAME || "Events";
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:H`,
  });

  const rows = res.data.values || [];

  const rowsToDelete: number[] = [];
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] || "").trim() === calendarId) {
      rowsToDelete.push(i + 1);
    }
  }

  if (rowsToDelete.length > 0) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = meta.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );
    const sheetId = sheet?.properties?.sheetId ?? 0;

    const deleteRequests = [...rowsToDelete]
      .sort((a, b) => b - a)
      .map((rowNum) => ({
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: rowNum - 1,
            endIndex: rowNum,
          },
        },
      }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: deleteRequests },
    });
  }

  if (events.length > 0) {
    await appendEvents(calendarId, events);
  } else {
    clearCache();
  }
}

// ─── /my-calendars — Dashboard tokens ────────────────────────

export async function createDashboardToken(email: string): Promise<string> {
  const token = randomUUID();
  const now = new Date().toISOString();
  const sheets = getWriteSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: "DashboardTokens!A:C",
    valueInputOption: "RAW",
    requestBody: {
      values: [[token, email.toLowerCase().trim(), now]],
    },
  });

  return token;
}

export async function validateDashboardToken(
  token: string
): Promise<{ email: string } | null> {
  const sheets = getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: "DashboardTokens!A:C",
  });

  const rows = res.data.values || [];
  const match = rows.find((row) => row[0] === token);
  if (!match) return null;

  const createdAt = new Date(match[2]).getTime();
  const thirtyMinutes = 30 * 60 * 1000;
  if (Date.now() - createdAt > thirtyMinutes) return null;

  return { email: match[1] };
}

export async function getCalendarsByEmail(
  email: string
): Promise<CalendarMeta[]> {
  const all = await fetchAllCalendars();
  return all.filter(
    (c) => c.email?.toLowerCase().trim() === email.toLowerCase().trim()
  );
}

// ─── Mock data ───────────────────────────────────────────────

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
