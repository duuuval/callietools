"use client";

import { CopyButton } from "@/components/CopyButton";

interface Props {
  httpsIcs: string;
  webcalIcs: string;
}

export function CalendarClient({ httpsIcs }: Props) {
  return (
    <div className="section" style={{ marginTop: 18 }}>
      <div className="sectionTitle">🤖 Google Calendar (Android / Gmail)</div>
      <div className="sectionBox">
        <div className="helper">
          <strong>This won&apos;t work inside the Google Calendar app.</strong>
          <br />
          Google requires adding shared calendars from the web…we don&apos;t
          make the rules 🤷‍♀️.
        </div>
        <br />
        <div className="helper" style={{ marginTop: 10, fontWeight: 700 }}>
          How to add this calendar:
        </div>

        <ol className="helper" style={{ margin: "8px 0 0 18px", padding: 0 }}>
          <li style={{ margin: "0 0 10px" }}>
            Copy the calendar link
            <div className="row" style={{ marginTop: 8 }}>
              <CopyButton
                text={httpsIcs}
                label="Copy calendar link"
                copiedLabel="Copied!"
              />
            </div>
          </li>

          <li style={{ margin: "0 0 10px" }}>
            Open Google Calendar in a browser (on a computer, or in desktop mode
            on your phone)
            <div className="row" style={{ marginTop: 8 }}>
              <a
                className="btn btnPrimary"
                href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
                target="_blank"
                rel="noopener"
              >
                Open Google Calendar (web)
              </a>
            </div>
            <div className="mini" style={{ marginTop: 6 }}>
              (Long hold, copy link + paste in browser if your Google Calendar
              app opens)
            </div>
          </li>

          <li style={{ margin: 0 }}>
            Paste the link and tap &quot;Add calendar&quot;
            <div className="mini" style={{ marginTop: 6 }}>
              Once added, it will appear everywhere you use Google Calendar.
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
