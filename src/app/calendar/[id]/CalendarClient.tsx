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
}

export function CalendarClient({
  httpsIcs,
  vanityUrl,
  calendarName,
  pastEvents,
}: Props) {
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

  return (
    <>
      {/* Google Calendar — fully expanded, no accordion */}
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
