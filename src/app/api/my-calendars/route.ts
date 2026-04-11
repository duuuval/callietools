import { NextRequest, NextResponse } from "next/server";
import { createDashboardToken, getCalendarsByEmail } from "@/lib/sheets";
import { sendMyCalendarsEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email?.trim().toLowerCase();

    // Basic validation — but always return ok regardless
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const calendars = await getCalendarsByEmail(email);

      if (calendars.length > 0) {
        const dashboardToken = await createDashboardToken(email);

        const calendarData = calendars.map((c) => ({
          name: c.name,
          manage_token: c.manage_token || "",
          slug: c.id, // id is the slug (e.g., "CCPS25-26")
        }));

        await sendMyCalendarsEmail(email, dashboardToken, calendarData);
      }
    }

    // Always return ok — never reveal whether the email matched
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in /api/my-calendars:", error);
    // Still return ok to prevent information leakage
    return NextResponse.json({ ok: true });
  }
}
