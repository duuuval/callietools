import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get all subscribers seen in last 30 days (superset of 7-day)
  const { data, error } = await supabase
    .from("ics_subscribers")
    .select("calendar_id, fingerprint, last_seen_at")
    .gte("last_seen_at", thirtyDaysAgo.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count distinct fingerprints per calendar for both windows
  const counts7: Record<string, number> = {};
  const counts30: Record<string, number> = {};

  for (const row of data || []) {
    // Every row is within 30 days
    counts30[row.calendar_id] = (counts30[row.calendar_id] || 0) + 1;

    // Check if also within 7 days
    if (new Date(row.last_seen_at) >= sevenDaysAgo) {
      counts7[row.calendar_id] = (counts7[row.calendar_id] || 0) + 1;
    }
  }

  const today = new Date().toISOString().split("T")[0];

  // Get all calendar IDs from either window
  const allCalendars = new Set([...Object.keys(counts7), ...Object.keys(counts30)]);

  const rows = Array.from(allCalendars).map((calendar_id) => ({
    calendar_id,
    snapshot_date: today,
    active_7d: counts7[calendar_id] || 0,
    active_30d: counts30[calendar_id] || 0,
  }));

  if (rows.length === 0) {
    return NextResponse.json({ message: "No active subscribers", snapshots: 0 });
  }

  const { error: upsertError } = await supabase
    .from("subscriber_snapshots")
    .upsert(rows, { onConflict: "calendar_id,snapshot_date" });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Snapshot complete", snapshots: rows.length });
}