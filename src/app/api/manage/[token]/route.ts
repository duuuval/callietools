// src/app/api/manage/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getCalendarByToken,
  getEvents,
  updateEvents,
} from "@/lib/sheets";

// ─── Types ───────────────────────────────────────────────────

interface EventInput {
  title: string;
  start_date: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  location?: string;
  description?: string;
}

// ─── GET — load calendar + events by token ───────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const calendar = await getCalendarByToken(token);
  if (!calendar) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  const events = await getEvents(calendar.id);

  return NextResponse.json({ calendar, events });
}

// ─── POST — save updated events ──────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // Verify token is valid
  const calendar = await getCalendarByToken(token);
  if (!calendar) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Missing request body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  // Validate events array
  if (!Array.isArray(b.events)) {
    return NextResponse.json({ error: "Events must be an array" }, { status: 400 });
  }

  if (b.events.length > 200) {
    return NextResponse.json({ error: "Maximum 200 events per calendar" }, { status: 400 });
  }

  const events: EventInput[] = [];
  for (let i = 0; i < b.events.length; i++) {
    const e = b.events[i] as Record<string, unknown>;
    const title = typeof e.title === "string" ? e.title.trim() : "";
    const start_date = typeof e.start_date === "string" ? e.start_date.trim() : "";

    if (!title) {
      return NextResponse.json(
        { error: `Event ${i + 1}: title is required` },
        { status: 400 }
      );
    }
    if (!start_date || !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      return NextResponse.json(
        { error: `Event ${i + 1}: a valid date (YYYY-MM-DD) is required` },
        { status: 400 }
      );
    }

    events.push({
      title,
      start_date,
      start_time: typeof e.start_time === "string" ? e.start_time.trim() : "",
      end_date: typeof e.end_date === "string" ? e.end_date.trim() : "",
      end_time: typeof e.end_time === "string" ? e.end_time.trim() : "",
      location: typeof e.location === "string" ? e.location.trim() : "",
      description: typeof e.description === "string" ? e.description.trim() : "",
    });
  }

  // Replace all events for this calendar
  await updateEvents(
    calendar.id,
    events.map((e) => ({
      title: e.title,
      start_date: e.start_date,
      start_time: e.start_time || "",
      end_date: e.end_date || e.start_date,
      end_time: e.end_time || "",
      location: e.location || "",
      description: e.description || "",
    }))
  );

  return NextResponse.json({ ok: true });
}
