import { NextRequest } from "next/server";
import { getCalendar, getEvents } from "@/lib/sheets";
import { generateIcs } from "@/lib/ics";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Strip .ics extension if present (e.g., /api/ics/CCPS25-26.ics → CCPS25-26)
  const rawId = params.id;
  const id = rawId.endsWith(".ics") ? rawId.slice(0, -4) : rawId;

  try {
    const [cal, events] = await Promise.all([
      getCalendar(id),
      getEvents(id),
    ]);

    if (!cal) {
      return new Response("Calendar not found", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const displayName = cal.name
      ? `${cal.name} (CallieTools)`
      : `CallieTools - ${id}`;

    const icsContent = generateIcs(id, displayName, events);

    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${id}.ics"`,
        // Cache for 10 min at edge, allow stale for 5 min while revalidating
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("Error generating ICS:", err);
    return new Response("Failed to generate calendar", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
