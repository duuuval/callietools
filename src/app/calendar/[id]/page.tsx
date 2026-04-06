import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCalendar, getEvents } from "@/lib/sheets";
import type { CalendarEvent } from "@/lib/sheets";
import { CalendarClient } from "./CalendarClient";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cal = await getCalendar(params.id);
  return {
    title: cal?.name || "Calendar",
    description: cal
      ? `Subscribe to "${cal.name}" — events sync to your phone automatically.`
      : "Calendar not found",
  };
}

export default async function CalendarPage({ params }: Props) {
  const cal = await getCalendar(params.id);

  if (!cal) {
    notFound();
  }

  const [events] = await Promise.all([getEvents(cal.id)]);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://callietools.com";
  const httpsIcs = `${siteUrl}/api/ics/${encodeURIComponent(cal.id)}.ics`;
  const host = siteUrl.replace(/^https?:\/\//, "");
  const webcalIcs = `webcal://${host}/api/ics/${encodeURIComponent(cal.id)}.ics`;
  const vanityUrl = `${siteUrl}/${encodeURIComponent(cal.id)}`;

  // Split events into upcoming and past
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming: CalendarEvent[] = [];
  const past: CalendarEvent[] = [];

  for (const e of events) {
    const eventDate = new Date(e.start_date + "T00:00:00");
    if (eventDate >= today) {
      upcoming.push(e);
    } else {
      past.push(e);
    }
  }

  // Sort upcoming chronologically
  upcoming.sort(
    (a, b) =>
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  // Sort past reverse-chronologically
  past.sort(
    (a, b) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  // Group upcoming events by month
  const groupedUpcoming = groupByMonth(upcoming);

  return (
    <div className="container">
      <div className="card">
        {/* Header */}
        <h1 className="calPageTitle">{cal.name || cal.id}</h1>
        <p className="calPageSubtitle">Subscribable calendar by Callie</p>

        {/* Events List */}
        <div className="divider" />

        {upcoming.length > 0 ? (
          <div className="eventsSection">
            {groupedUpcoming.map(({ month, events: monthEvents }) => (
              <div key={month} className="eventsMonth">
                <div className="eventsMonthHeader">{month}</div>
                {monthEvents.map((e, i) => (
                  <EventRow key={`${e.start_date}-${e.title}-${i}`} event={e} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="eventsEmpty">
            <p>
              No upcoming events — subscribe to get notified when new ones are
              added.
            </p>
          </div>
        )}

        {/* Subscribe Section */}
        <div className="divider" />

        <p className="calSubscribeIntro">
          Add this calendar to your phone — events update automatically.
        </p>

        {/* Apple */}
        <div className="section">
          <div className="sectionTitle">
            🍎 Apple Calendar (iPhone / iPad / Mac)
          </div>
          <div className="sectionBox">
            <div className="row">
              <a className="btn btnPrimary" href={webcalIcs} rel="noopener">
                Sync to Apple Calendar
              </a>
            </div>
            <div className="mini" style={{ marginTop: 10 }}>
              Opens in Apple Calendar — tap Subscribe to add it.
            </div>
          </div>
        </div>

        {/* Google / Other — client component for interactivity */}
        <CalendarClient
          httpsIcs={httpsIcs}
          webcalIcs={webcalIcs}
          vanityUrl={vanityUrl}
          calendarName={cal.name || cal.id}
          pastEvents={past}
        />
      </div>

      {/* Footer CTAs */}
      <div className="calFooter">
        <p className="calFooterBrand">Subscribable calendar by Callie</p>
        <p className="calFooterCta">
          Run a group or class?{" "}
          <a href="/create">Create your own calendar — free</a>
        </p>
        <p className="calFooterCta calFooterUpgrade">
          Want your logo and colors on this page?{" "}
          <a href="mailto:hello@callietools.com">Make it yours — $10/month</a>
        </p>
        <p className="calFooterEmail">
          <a href="mailto:hello@callietools.com">hello@callietools.com</a>
        </p>
      </div>
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────── */

function EventRow({ event }: { event: CalendarEvent }) {
  const date = new Date(event.start_date + "T00:00:00");
  const formatted = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const isMultiDay =
    event.end_date &&
    event.end_date !== event.start_date;

  let dateDisplay = formatted;
  if (isMultiDay) {
    const end = new Date(event.end_date + "T00:00:00");
    const endFormatted = end.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    dateDisplay = `${formatted} – ${endFormatted}`;
  }

  // Format time if present
  let timeDisplay = "";
  if (event.start_time) {
    const [h, m] = event.start_time.split(":").map(Number);
    const startDate = new Date(2000, 0, 1, h, m);
    timeDisplay = startDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    if (event.end_time && event.end_time !== event.start_time) {
      const [eh, em] = event.end_time.split(":").map(Number);
      const endDate = new Date(2000, 0, 1, eh, em);
      timeDisplay += ` – ${endDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    }
  }

  return (
    <div className="eventRow">
      <div className="eventDate">{dateDisplay}</div>
      <div className="eventDetails">
        <div className="eventTitle">{event.title}</div>
        {timeDisplay && <span className="eventTime">{timeDisplay}</span>}
        {event.location && (
          <span className="eventLocation">{event.location}</span>
        )}
      </div>
    </div>
  );
}

function groupByMonth(
  events: CalendarEvent[]
): { month: string; events: CalendarEvent[] }[] {
  const groups: Map<string, CalendarEvent[]> = new Map();
  for (const e of events) {
    const d = new Date(e.start_date + "T00:00:00");
    const key = d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return Array.from(groups.entries()).map(([month, events]) => ({
    month,
    events,
  }));
}
