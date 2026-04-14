import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get all subscribers seen in last 7 days
  const { data, error } = await supabase
    .from("ics_subscribers")
    .select("calendar_id, fingerprint")
    .gte("last_seen_at", sevenDaysAgo.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count distinct fingerprints per calendar
  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.calendar_id] = (counts[row.calendar_id] || 0) + 1;
  }

  const today = new Date().toISOString().split("T")[0];

  // Upsert one snapshot row per calendar
  const rows = Object.entries(counts).map(([calendar_id, active_7d]) => ({
    calendar_id,
    snapshot_date: today,
    active_7d,
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
