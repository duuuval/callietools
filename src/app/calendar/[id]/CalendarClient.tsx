"use client";

import { useState, useEffect } from "react";
import { CopyButton } from "@/components/CopyButton";
import { logClick } from "@/lib/log-click";
import type { CalendarEvent } from "@/lib/data";

interface Props {
  httpsIcs: string;
  webcalIcs: string;
  vanityUrl: string;
  calendarName: string;
  calendarId?: string;
  pastEvents: CalendarEvent[];
  remainingEvents: CalendarEvent[];
  showEventsOnly?: boolean;
  isPaid?: boolean;
  accentColor?: string;
}

export function CalendarClient({
  httpsIcs,
  vanityUrl,
  calendarName,
  calendarId,
  pastEvents,
  remainingEvents,
  showEventsOnly = false,
  isPaid = false,
  accentColor,
}: Props) {
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [showOtherApps, setShowOtherApps] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);

  // Observe the subtitle sentinel — show sticky bar when it scrolls off screen
  // Sticky bar is only shown on free-tier pages
  useEffect(() => {
    if (isPaid) return; // paid pages never show the sticky bar
    const sentinel = document.getElementById("callie-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isPaid]);

  // Log page view once per mount. Only fires from the full (non-showEventsOnly)
  // instance since both instances mount on the same page — this avoids
  // double-counting. Guarded on calendarId to avoid firing during the brief
  // window where the prop hasn't been wired up from page.tsx yet.
  useEffect(() => {
    if (showEventsOnly) return;
    if (!calendarId) return;
    logClick(calendarId, "page_view");
  }, [calendarId, showEventsOnly]);

  // Accent color as inline style for buttons (overrides CSS default)
  const accentStyle = accentColor
    ? { backgroundColor: accentColor, borderColor: accentColor }
    : {};

  const handleShare = async () => {
    if (calendarId) logClick(calendarId, "share");
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

  // ── Events-only mode: inline expand toggle ────────────────────────────────
  if (showEventsOnly) {
    return (
      <>
        {showAllEvents &&
          remainingEvents.map((e, i) => (
            <EventRowClient
              key={`${e.start_date}-${e.title}-${i}`}
              event={e}
            />
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

  // ── Full mode ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Sticky bar — free tier only, hidden on paid pages */}
      {!isPaid && (
        <div className={`callieSticky ${stickyVisible ? "callieSticky--visible" : ""}`}>
          <a href="/create" className="callieStickyLink">
            Like what you see? Build your own — free.
          </a>
        </div>
      )}

      {/* Google Calendar — fully expanded */}
      <div className="section" style={{ marginTop: 18 }}>
        <div className="sectionTitle">🤖 Google Calendar (Android / Gmail)</div>
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
            ⚠️ Google requires adding shared calendars from a browser — not the app.
          </div>
          <ol
            className="helper googleSteps"
            style={{ margin: "0 0 14px 0", paddingLeft: 20 }}
          >
            <li style={{ marginBottom: 10 }}>
              Copy the calendar link
              <div
                className="row"
                style={{ marginTop: 8 }}
                onClick={() => {
                  if (calendarId) logClick(calendarId, "google_copy");
                }}
              >
                <CopyButton
                  text={httpsIcs}
                  label="Copy calendar link"
                  copiedLabel="Copied!"
                  className="btn btnPrimary"
                  style={accentStyle}
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
                  onClick={() => {
                    if (calendarId) logClick(calendarId, "google_open");
                  }}
                >
                  Open Google Calendar (web) →
                </a>
              </div>
              <div className="mini" style={{ marginTop: 6, fontStyle: "italic" }}>
                If the Google Calendar app opens instead, long-press the button,
                copy the link, and paste it into your browser manually.
              </div>
            </li>
            <li style={{ marginBottom: 10 }}>
              Paste the calendar link and tap &quot;Add calendar&quot;
            </li>
          </ol>
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              opacity: 0.7,
              marginBottom: 6,
              marginTop: 4,
            }}
          >
            Now switch to the Google Calendar app on your phone:
          </div>
          <ol
            className="helper googleSteps"
            start={4}
            style={{ margin: "0 0 8px 0", paddingLeft: 20 }}
          >
            <li style={{ marginBottom: 10 }}>
              Go to Settings → tap the new calendar
            </li>
            <li style={{ marginBottom: 10 }}>
              Toggle Sync to on
            </li>
            <li>
              Go back to ☰ → find the calendar in the list → tap the checkbox to make it visible
            </li>
          </ol>          
        </div>
      </div>

      {/* Other apps — collapsed behind accordion */}
      <div className="section" style={{ marginTop: 18 }}>
        <button
          type="button"
          onClick={() => setShowOtherApps(!showOtherApps)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
          }}
        >
          <div className="sectionTitle" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>💻 Using a different calendar app?</span>
            <span style={{ fontSize: 14, color: "var(--muted, #888)" }}>
              {showOtherApps ? "▲" : "▼"}
            </span>
          </div>
        </button>
        {showOtherApps && (
          <div className="sectionBox" style={{ marginTop: 8 }}>
            <div className="row">
              <a  
                className="btn btnSecondary"
                href={httpsIcs}
                download
                onClick={() => {
                  if (calendarId) logClick(calendarId, "other_download");
                }}
              >
                Download calendar file
              </a>
            </div>
            <div className="mini" style={{ marginTop: 8, fontStyle: "italic" }}>
              Import this .ics file into any calendar app. Note: this is a
              one-time import — it won&apos;t sync future updates automatically.
            </div>
          </div>
        )}
      </div>

      {/* Share */}
      <div className="divider" />

      <div className="shareSection">
        <button
          type="button"
          className="btn btnPrimary shareBtn"
          style={accentStyle}
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
            {showPast
              ? "Hide past events"
              : `Show past events (${pastEvents.length})`}
          </button>
          {showPast && (
            <div
              className="eventsSection"
              style={{ marginTop: 12, textAlign: "left" }}
            >
              {pastEvents.map((e, i) => (
                <div key={`${e.start_date}-${e.title}-${i}`} className="eventRow">
                  <div className="eventDateCol">
                    <span className="eventWeekday">
                      {new Date(e.start_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className="eventDate">
                      {new Date(e.start_date + "T00:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
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

/* ─── Client-side EventRow (used in showEventsOnly expand) ─── */

function EventRowClient({ event }: { event: CalendarEvent }) {
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
