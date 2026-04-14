import crypto from "crypto";
import { getSupabase } from "./supabase";

/**
 * Log an ICS fetch to Supabase for subscriber tracking.
 * Non-blocking — failures are swallowed so the ICS feed always returns.
 */
export async function logIcsFetch(
  calendarId: string,
  userAgent: string,
  ip: string
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  // Skip known bots — they monitor uptime, not subscribe to calendars
  const ua = userAgent.toLowerCase();
  if (ua.includes("uptimerobot")) return;

  const raw = `${ip}|${userAgent}`;
  const fingerprint = crypto
    .createHash("sha256")
    .update(raw)
    .digest("hex")
    .slice(0, 16);

  try {
    await supabase.from("ics_subscribers").upsert(
      {
        calendar_id: calendarId,
        fingerprint,
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: "calendar_id,fingerprint",
        ignoreDuplicates: false,
      }
    );
  } catch (err) {
    console.error("ICS log error (non-fatal):", err);
  }
}
