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

  const now = new Date().toISOString();

  try {
    await supabase.rpc("upsert_ics_subscriber", {
      p_calendar_id: calendarId,
      p_fingerprint: fingerprint,
      p_now: now,
    });
  } catch (err) {
    console.error("ICS log error (non-fatal):", err);
  }
}
