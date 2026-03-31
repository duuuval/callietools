/**
 * ICS feed generator.
 * Ported from ics.php — same output format, same UID strategy.
 */

import { CalendarEvent } from "./sheets";
import crypto from "crypto";

const TZID = "America/New_York";

function icsEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/** YYYY-MM-DD → YYYYMMDD */
function dtAllDay(date: string): string {
  return date.replace(/-/g, "");
}

/** YYYY-MM-DD + HH:MM → YYYYMMDDTHHMMSS */
function dtLocal(date: string, time: string): string {
  const d = date.replace(/-/g, "");
  let t = time.replace(/:/g, "");
  if (t.length === 4) t += "00";
  return `${d}T${t}`;
}

/** Add one day to YYYY-MM-DD */
function addOneDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

/** Build a stable UID matching the PHP implementation */
function buildUid(calId: string, e: CalendarEvent): string {
  const parts = [
    e.title.trim(),
    e.start_date.trim(),
    e.start_time.trim(),
    e.end_date.trim(),
    e.end_time.trim(),
    e.location.trim(),
  ];
  const fingerprint = parts.join("|");
  const hash = crypto.createHash("sha1").update(fingerprint).digest("hex");
  return `${calId}-${hash}@callietools.com`;
}

export function generateIcs(
  calId: string,
  displayName: string,
  events: CalendarEvent[]
): string {
  const nowUtc = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CallieTools//Calendar Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(displayName)}`,
    `X-WR-TIMEZONE:${TZID}`,
    // Timezone definition (America/New_York)
    "BEGIN:VTIMEZONE",
    `TZID:${TZID}`,
    `X-LIC-LOCATION:${TZID}`,
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0400",
    "TZNAME:EDT",
    "DTSTART:19700308T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:-0400",
    "TZOFFSETTO:-0500",
    "TZNAME:EST",
    "DTSTART:19701101T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const e of events) {
    const title = e.title.trim() || "Event";
    const sd = e.start_date.trim();
    const st = e.start_time.trim();
    const ed = (e.end_date || "").trim() || sd;
    const et = (e.end_time || "").trim() || st;

    if (!sd) continue;

    const uid = buildUid(calId, e);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${icsEscape(uid)}`);
    lines.push(`DTSTAMP:${nowUtc}`);
    lines.push(`SUMMARY:${icsEscape(title)}`);

    if (!st) {
      // All-day event
      lines.push(`DTSTART;VALUE=DATE:${dtAllDay(sd)}`);
      lines.push(`DTEND;VALUE=DATE:${dtAllDay(addOneDay(ed))}`);
    } else {
      lines.push(`DTSTART;TZID=${TZID}:${dtLocal(sd, st)}`);
      lines.push(`DTEND;TZID=${TZID}:${dtLocal(ed, et)}`);
    }

    const loc = (e.location || "").trim();
    if (loc) lines.push(`LOCATION:${icsEscape(loc)}`);

    const desc = (e.description || "").trim();
    if (desc) lines.push(`DESCRIPTION:${icsEscape(desc)}`);

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // ICS spec requires CRLF line endings
  return lines.join("\r\n") + "\r\n";
}
