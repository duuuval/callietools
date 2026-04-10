import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCalendar, getEvents } from "@/lib/sheets";
import type { CalendarEvent } from "@/lib/sheets";
import { CalendarClient } from "./CalendarClient";
export const revalidate = 0;

const EVENTS_PREVIEW_COUNT = 5;

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cal = await getCalendar(params.id);
  const name = cal?.name || "Calendar";
  const description = cal
    ? `Subscribe to ${name}. Every update shows up on your phone automatically. No app needed.`
    : "Calendar not found";

  return {
    title: name,
    description,
    openGraph: {
      title: `${name} — Callie`,
      description,
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — Callie`,
      images: ["/og-image.png"],
    },
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

  const previewEvents = upcoming.slice(0, EVENTS_PREVIEW_COUNT);
  const remainingEvents = upcoming.slice(EVENTS_PREVIEW_COUNT);
  const hasMore = remainingEvents.length > 0;

  return (
    <div className="container">

      {/* ── Card 1: Header + Events ── */}
      <div className="card">
        <h1 className="calPageTitle">{cal.name || cal.id}</h1>

        {/* Sentinel — sticky bar appears when this scrolls off screen */}
        <p className="calPageSubtitle" id="callie-sentinel">A Callie calendar</p>

        <div className="divider" />

        {upcoming.length > 0 ? (
          <div className="eventsSection">
            {previewEvents.map((e, i) => (
              <EventRow
                key={`${e.start_date}-${e.title}-${i}`}
                event={e}
              />
            ))}

            {hasMore && (
              <CalendarClient
                httpsIcs={httpsIcs}
                webcalIcs={webcalIcs}
                vanityUrl={vanityUrl}
                calendarName={cal.name || cal.id}
                pastEvents={past}
                remainingEvents={remainingEvents}
                showEventsOnly
              />
            )}
          </div>
        ) : (
          <div className="eventsEmpty">
            <p>
              No upcoming events — subscribe to get notified when new ones are
              added.
            </p>
          </div>
        )}
      </div>

      {/* ── Card 2: Subscribe ── */}
      <div className="card" style={{ marginTop: 16 }}>
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

        {/* Google / Other / Share / Past — client component */}
        <CalendarClient
          httpsIcs={httpsIcs}
          webcalIcs={webcalIcs}
          vanityUrl={vanityUrl}
          calendarName={cal.name || cal.id}
          pastEvents={past}
          remainingEvents={remainingEvents}
          showEventsOnly={false}
        />
      </div>

      {/* Footer CTAs */}
      <div className="calFooter">
        <p className="calFooterCta">
          Run a group or class?{" "}
          <a href="/create">Create your own calendar — free</a>
        </p>
        <p className="calFooterCta calFooterUpgrade">
          Want your logo and colors on this page?{" "}
          <a href="/upgrade">Make it yours — $10/month</a>
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
  const isMultiDay = event.end_date && event.end_date !== event.start_date;

  const dateShort = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  let dateDisplay = dateShort;
  if (isMultiDay) {
    const end = new Date(event.end_date + "T00:00:00");
    dateDisplay = `${dateShort} – ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  }

  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });

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
      <div className="eventDateCol">
        <span className="eventWeekday">{weekday}</span>
        <span className="eventDate">{dateDisplay}</span>
      </div>
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
