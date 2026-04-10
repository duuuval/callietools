import { NextRequest, NextResponse } from "next/server";
import {
  findUniqueSlug,
  createCalendar,
  appendEvents,
} from "@/lib/sheets";
import { sendManageLink } from "@/lib/email";

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

interface CreateCalendarBody {
  name: string;
  email: string;
  events: EventInput[];
}

// ─── Validation ──────────────────────────────────────────────

function validateBody(body: unknown): {
  ok: true;
  data: CreateCalendarBody;
} | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Missing request body" };
  }

  const b = body as Record<string, unknown>;

  // Calendar name
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name || name.length < 2) {
    return { ok: false, error: "Calendar name is required (at least 2 characters)" };
  }
  if (name.length > 100) {
    return { ok: false, error: "Calendar name must be 100 characters or fewer" };
  }

  // Email
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "A valid email address is required" };
  }

  // Events
  if (!Array.isArray(b.events) || b.events.length === 0) {
    return { ok: false, error: "At least one event is required" };
  }

  if (b.events.length > 200) {
    return { ok: false, error: "Maximum 200 events per calendar" };
  }

  const events: EventInput[] = [];
  for (let i = 0; i < b.events.length; i++) {
    const e = b.events[i] as Record<string, unknown>;
    const title = typeof e.title === "string" ? e.title.trim() : "";
    const start_date = typeof e.start_date === "string" ? e.start_date.trim() : "";

    if (!title) {
      return { ok: false, error: `Event ${i + 1}: title is required` };
    }
    if (!start_date || !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      return { ok: false, error: `Event ${i + 1}: a valid date (YYYY-MM-DD) is required` };
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

  return { ok: true, data: { name, email, events } };
}

// ─── Route handler ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(body);

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { name, email, events } = validation.data;

    // Generate unique slug
    const slug = await findUniqueSlug(name);

    // Write calendar row
    const { manage_token } = await createCalendar({
      id: slug,
      name,
      email,
    });

    // Write events
    await appendEvents(
      slug,
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

    // Build URLs
    const calendarUrl = `https://callietools.com/${slug}`;
    const manageUrl = `https://callietools.com/manage/${manage_token}`;

    // Send manage link email — non-blocking: calendar is already written,
    // don't fail the whole request if email has a transient error.
    try {
      await sendManageLink({ to: email, calendarName: name, calendarUrl, manageUrl });
    } catch (emailErr) {
      console.error("Resend error (non-fatal):", emailErr);
    }

    return NextResponse.json(
      {
        slug,
        manage_token,
        url: calendarUrl,
        manage_url: manageUrl,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating calendar:", err);
    return NextResponse.json(
      { error: "Failed to create calendar. Please try again." },
      { status: 500 }
    );
  }
}
