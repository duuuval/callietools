"use client";

import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import type { CalendarEvent } from "@/lib/sheets";


interface Props {
  httpsIcs: string;
  webcalIcs: string;
  vanityUrl: string;
  calendarName: string;
  pastEvents: CalendarEvent[];
  remainingEvents: CalendarEvent[];
  /** When true, renders only the "Show all events" toggle — used inside the events section */
  showEventsOnly?: boolean;
}

export function CalendarClient({
  httpsIcs,
  vanityUrl,
  calendarName,
  pastEvents,
  remainingEvents,
  showEventsOnly = false,
}: Props) {
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: calendarName,
      text: `Subscribe to ${calendarName} — events sync to your phone automatically.`,
      url: vanityUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        fallbackCopy();
      }
    } else {
      fallbackCopy();
    }
  };

  const fallbackCopy = async () => {
    try {
      await navigator.clipboard.writeText(vanityUrl);
    } catch {
      window.prompt("Copy this link:", vanityUrl);
    }
  };

  // ── Events-only mode: just the "Show all" toggle ──────────────────────────
  if (showEventsOnly) {
    const grouped = groupByMonth(remainingEvents);
    return (
      <>
        {showAllEvents &&
          grouped.map(({ month, events }) => (
            <div key={month} className="eventsMonth">
              <div className="eventsMonthHeader">{month}</div>
              {events.map((e, i) => (
                <EventRow key={`${e.start_date}-${e.title}-${i}`} event={e} />
              ))}
            </div>
          ))}
        <button
          type="button"
          className="btn btnSecondary"
          style={{ fontSize: 13, marginTop: 12 }}
          onClick={() => setShowAllEvents(!showAllEvents)}
        >
          {showAllEvents
            ? "Show fewer events"
            : `Show all events (+${remainingEvents.length} more)`}
        </button>
      </>
    );
  }

  // ── Full mode: Google, Other apps, Share, Past events ────────────────────
  return (
    <>
      {/* Google Calendar — fully expanded */}
      <div className="section" style={{ marginTop: 18 }}>
        <div className="sectionTitle">
          🤖 Google Calendar (Android / Gmail)
        </div>
        <div className="sectionBox">
          <div
            className="helper"
            style={{
              marginBottom: 12,
              fontWeight: 600,
              padding: "8px 10px",
              background: "var(--color-surface-alt, #f5f5f5)",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            ⚠️ Google requires adding shared calendars from a browser — not the
            app.
          </div>

          <ol className="helper googleSteps" style={{ margin: "0 0 14px 0", paddingLeft: 20 }}>
            <li style={{ marginBottom: 10 }}>
              Copy the calendar link
              <div className="row" style={{ marginTop: 8 }}>
                <CopyButton
                  text={httpsIcs}
                  label="Copy calendar link"
                  copiedLabel="Copied!"
                  className="btn btnPrimary"
                />
              </div>
            </li>
            <li style={{ marginBottom: 10 }}>
              Open Google Calendar in a browser
              <div className="row" style={{ marginTop: 8 }}>
                <a
                  className="btn btnSecondary"
                  href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
                  target="_blank"
                  rel="noopener"
                  style={{ fontSize: 14 }}
                >
                  Open Google Calendar (web) →
                </a>
              </div>
              <div className="mini" style={{ marginTop: 6 }}>
                If the Google Calendar app opens instead, long-press the button,
                copy the link, and paste it into your browser manually.
              </div>
            </li>
            <li>
              Paste the calendar link and tap &quot;Add calendar&quot;
              <div className="mini" style={{ marginTop: 4 }}>
                Once added, it syncs everywhere you use Google Calendar.
              </div>
            </li>
          </ol>
        </div>
      </div>

      {/* Other apps */}
      <div className="section" style={{ marginTop: 18 }}>
        <div className="sectionTitle">💻 Other calendar apps</div>
        <div className="sectionBox">
          <div className="row">
            <a className="btn btnSecondary" href={httpsIcs} download>
              Download calendar file
            </a>
          </div>
          <div className="mini" style={{ marginTop: 8 }}>
            Import this .ics file into any calendar app.
          </div>
        </div>
      </div>

      {/* Share section */}
      <div className="divider" />

      <div className="shareSection">
        <button
          type="button"
          className="btn btnPrimary shareBtn"
          onClick={handleShare}
        >
          Share this calendar
        </button>
        <p className="mini" style={{ marginTop: 8, textAlign: "center" }}>
          Send the link to your group — they subscribe once and stay updated.
        </p>
      </div>

      {/* Past events */}
      {pastEvents.length > 0 && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            type="button"
            className="btn btnSecondary"
            style={{ fontSize: 13 }}
            onClick={() => setShowPast(!showPast)}
          >
            {showPast ? "Hide past events" : `Show past events (${pastEvents.length})`}
          </button>
          {showPast && (
            <div className="eventsSection" style={{ marginTop: 12, textAlign: "left" }}>
              {pastEvents.map((e, i) => (
                <div key={`${e.start_date}-${e.title}-${i}`} className="eventRow">
                  <div className="eventDate">
                    {new Date(e.start_date + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="eventDetails">
                    <div className="eventTitle">{e.title}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ─── Shared helpers (needed in events-only mode) ───────────── */

function EventRow({ event }: { event: CalendarEvent }) {
  const date = new Date(event.start_date + "T00:00:00");
  const formatted = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const isMultiDay = event.end_date && event.end_date !== event.start_date;
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
