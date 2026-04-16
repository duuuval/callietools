import { NextRequest } from "next/server";
import { getCalendar, getEvents } from "@/lib/data";
import { generateIcs } from "@/lib/ics";
import { logIcsFetch } from "@/lib/ics-log";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Fire-and-forget — don't block the ICS response
    const ua = _req.headers.get("user-agent") || "unknown";
    const ip = _req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    logIcsFetch(id, ua, ip).catch(() => {});

    const displayName = cal.name
      ? `${cal.name} (CallieTools)`
      : `CallieTools - ${id}`;

    const icsContent = generateIcs(id, displayName, events, cal.timezone);

    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${id}.ics"`,
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
