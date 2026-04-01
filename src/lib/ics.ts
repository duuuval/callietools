/**
 * ICS feed generator.
 * Ported from ics.php — same output format, same UID strategy.
 */
import { CalendarEvent } from "./sheets";
import crypto from "crypto";

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
  events: CalendarEvent[],
  timezone: string = "America/New_York"
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
    `X-WR-TIMEZONE:${timezone}`,
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
      lines.push(`DTSTART;TZID=${timezone}:${dtLocal(sd, st)}`);
      lines.push(`DTEND;TZID=${timezone}:${dtLocal(ed, et)}`);
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
