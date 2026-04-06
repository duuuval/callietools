"use client";

import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { CalendarEvent } from "@/lib/sheets";

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
  const [googleOpen, setGoogleOpen] = useState(false);
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
        // User cancelled or share failed — fall back to copy
        fallbackCopy();
      }
    } else {
      fallbackCopy();
    }
  };

  const fallbackCopy = async () => {
    try {
      await navigator.clipboard.writeText(vanityUrl);
      // Could add a toast here later
    } catch {
      window.prompt("Copy this link:", vanityUrl);
    }
  };

  return (
    <>
      {/* Google Calendar — accordion pattern */}
      <div className="section" style={{ marginTop: 18 }}>
        <div className="sectionTitle">
          🤖 Google Calendar (Android / Gmail)
        </div>
        <div className="sectionBox">
          <div className="row">
            <CopyButton
              text={httpsIcs}
              label="Copy calendar link"
              copiedLabel="Copied!"
              className="btn btnPrimary"
            />
          </div>

          <button
            type="button"
            className="accordionToggle"
            onClick={() => setGoogleOpen(!googleOpen)}
            aria-expanded={googleOpen}
          >
            {googleOpen ? "Hide" : "Show"} step-by-step instructions
            <span
              className="accordionArrow"
              aria-hidden="true"
            >
              {googleOpen ? "▲" : "▼"}
            </span>
          </button>

          {googleOpen && (
            <div className="accordionContent">
              <div className="helper" style={{ marginBottom: 8, fontWeight: 600 }}>
                Google requires adding shared calendars from a browser — not the
                app.
              </div>
              <ol
                className="helper googleSteps"
              >
                <li>
                  Copy the calendar link above
                </li>
                <li>
                  Open Google Calendar in a browser
                  <div className="row" style={{ marginTop: 8 }}>
                    <a
                      className="btn btnSecondary"
                      href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
                      target="_blank"
                      rel="noopener"
                      style={{ fontSize: 14 }}
                    >
                      Open Google Calendar (web)
                    </a>
                  </div>
                  <div className="mini" style={{ marginTop: 6 }}>
                    If the Google Calendar app opens instead, long-press the
                    button, copy the link, and paste it in your browser.
                  </div>
                </li>
                <li>
                  Paste the calendar link and tap &quot;Add calendar&quot;
                  <div className="mini" style={{ marginTop: 4 }}>
                    Once added, it will appear everywhere you use Google
                    Calendar.
                  </div>
                </li>
              </ol>
            </div>
          )}
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

      {/* Past events toggle */}
      {pastEvents.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <button
            type="button"
            className="accordionToggle"
            onClick={() => setShowPast(!showPast)}
            aria-expanded={showPast}
          >
            {showPast ? "Hide" : "Show"} past events ({pastEvents.length})
            <span className="accordionArrow" aria-hidden="true">
              {showPast ? "▲" : "▼"}
            </span>
          </button>

          {showPast && (
            <div className="eventsSection eventsPast">
              {pastEvents.map((e, i) => {
                const date = new Date(e.start_date + "T00:00:00");
                const formatted = date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });

                const isMultiDay =
                  e.end_date && e.end_date !== e.start_date;

                let dateDisplay = formatted;
                if (isMultiDay) {
                  const end = new Date(e.end_date + "T00:00:00");
                  dateDisplay = `${formatted} – ${end.toLocaleDateString(
                    "en-US",
                    { weekday: "short", month: "short", day: "numeric" }
                  )}`;
                }

                return (
                  <div
                    key={`past-${e.start_date}-${e.title}-${i}`}
                    className="eventRow"
                  >
                    <div className="eventDate">{dateDisplay}</div>
                    <div className="eventDetails">
                      <div className="eventTitle">{e.title}</div>
                      {e.location && (
                        <span className="eventLocation">{e.location}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
