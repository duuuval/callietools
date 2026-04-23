// src/app/admin/analytics/page.tsx
// Internal admin dashboard for monitoring click + sync activity across all calendars.
// Gated by ADMIN_TOKEN env var. Access via ?token=xxx&calendar=yyy.

import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Types ───────────────────────────────────────────────────

interface ClickCounts {
  client_type: string;
  last_7d: number;
  prior_7d: number;
  all_time: number;
}

interface SnapshotRow {
  snapshot_date: string;
  active_7d: number;
  active_30d: number;
}

interface RecentClick {
  created_at: string;
  client_type: string;
  calendar_id: string;
}

interface CalendarOption {
  id: string;
  active_30d: number;
}

// ─── Supabase client ─────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ─── Data fetchers ───────────────────────────────────────────

async function getCalendarOptions(): Promise<CalendarOption[]> {
  const sb = getSupabase();
  // Pull every distinct calendar_id from ics_subscribers along with its active_30d count.
  const { data, error } = await sb
    .from("ics_subscribers")
    .select("calendar_id, last_seen_at");

  if (error || !data) return [];

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const counts = new Map<string, number>();
  for (const row of data as { calendar_id: string; last_seen_at: string }[]) {
    const seen = new Date(row.last_seen_at).getTime();
    if (seen >= thirtyDaysAgo) {
      counts.set(row.calendar_id, (counts.get(row.calendar_id) || 0) + 1);
    } else if (!counts.has(row.calendar_id)) {
      counts.set(row.calendar_id, 0);
    }
  }

  return Array.from(counts.entries())
    .map(([id, active_30d]) => ({ id, active_30d }))
    .sort((a, b) => b.active_30d - a.active_30d);
}

async function getClickCounts(calendarId: string | null): Promise<ClickCounts[]> {
  const sb = getSupabase();
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();

  let query = sb.from("subscribe_clicks").select("client_type, created_at");
  if (calendarId) query = query.eq("calendar_id", calendarId);
  const { data, error } = await query;

  if (error || !data) return [];

  const buckets = new Map<string, { last_7d: number; prior_7d: number; all_time: number }>();
  for (const row of data as { client_type: string; created_at: string }[]) {
    const b = buckets.get(row.client_type) || { last_7d: 0, prior_7d: 0, all_time: 0 };
    b.all_time++;
    if (row.created_at >= sevenDaysAgo) b.last_7d++;
    else if (row.created_at >= fourteenDaysAgo) b.prior_7d++;
    buckets.set(row.client_type, b);
  }

  return Array.from(buckets.entries())
    .map(([client_type, b]) => ({ client_type, ...b }))
    .sort((a, b) => b.all_time - a.all_time);
}

async function getCurrentSyncActivity(
  calendarId: string | null
): Promise<{ active_7d: number; active_30d: number }> {
  const sb = getSupabase();
  let query = sb.from("ics_subscribers").select("last_seen_at");
  if (calendarId) query = query.eq("calendar_id", calendarId);
  const { data, error } = await query;

  if (error || !data) return { active_7d: 0, active_30d: 0 };

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  let active_7d = 0;
  let active_30d = 0;
  for (const row of data as { last_seen_at: string }[]) {
    const seen = new Date(row.last_seen_at).getTime();
    if (seen >= sevenDaysAgo) active_7d++;
    if (seen >= thirtyDaysAgo) active_30d++;
  }
  return { active_7d, active_30d };
}

async function getSnapshotTrend(calendarId: string | null): Promise<SnapshotRow[]> {
  const sb = getSupabase();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  let query = sb
    .from("subscriber_snapshots")
    .select("snapshot_date, active_7d, active_30d, calendar_id")
    .gte("snapshot_date", thirtyDaysAgo)
    .order("snapshot_date", { ascending: true });

  if (calendarId) query = query.eq("calendar_id", calendarId);
  const { data, error } = await query;

  if (error || !data) return [];

  // For "all calendars" mode: sum across calendars per date.
  if (!calendarId) {
    const byDate = new Map<string, { active_7d: number; active_30d: number }>();
    for (const row of data as SnapshotRow[]) {
      const existing = byDate.get(row.snapshot_date) || { active_7d: 0, active_30d: 0 };
      existing.active_7d += row.active_7d;
      existing.active_30d += row.active_30d;
      byDate.set(row.snapshot_date, existing);
    }
    return Array.from(byDate.entries())
      .map(([snapshot_date, v]) => ({ snapshot_date, ...v }))
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
  }

  return (data as SnapshotRow[]).map((r) => ({
    snapshot_date: r.snapshot_date,
    active_7d: r.active_7d,
    active_30d: r.active_30d,
  }));
}

async function getRecentClicks(calendarId: string | null): Promise<RecentClick[]> {
  const sb = getSupabase();
  let query = sb
    .from("subscribe_clicks")
    .select("created_at, client_type, calendar_id")
    .order("created_at", { ascending: false })
    .limit(20);

  if (calendarId) query = query.eq("calendar_id", calendarId);
  const { data, error } = await query;

  if (error || !data) return [];
  return data as RecentClick[];
}

// ─── Page ────────────────────────────────────────────────────

interface PageProps {
  searchParams: { token?: string; calendar?: string };
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const expectedToken = process.env.ADMIN_TOKEN;
  if (!expectedToken || searchParams.token !== expectedToken) {
    notFound();
  }

  const selectedCalendar =
    searchParams.calendar && searchParams.calendar !== "__all__"
      ? searchParams.calendar
      : null;

  const [options, clickCounts, syncNow, trend, recent] = await Promise.all([
    getCalendarOptions(),
    getClickCounts(selectedCalendar),
    getCurrentSyncActivity(selectedCalendar),
    getSnapshotTrend(selectedCalendar),
    getRecentClicks(selectedCalendar),
  ]);

  const tdStyle: React.CSSProperties = {
    padding: "4px 10px",
    borderBottom: "1px solid #eee",
    fontSize: 13,
  };
  const thStyle: React.CSSProperties = {
    ...tdStyle,
    fontWeight: 600,
    textAlign: "left",
    borderBottom: "2px solid #333",
  };
  const h2Style: React.CSSProperties = { fontSize: 16, margin: "24px 0 8px" };

  return (
    <div style={{ maxWidth: 900, margin: "20px auto", padding: 16, fontFamily: "monospace" }}>
      <h1 style={{ fontSize: 20, margin: 0 }}>/admin/analytics</h1>
      <p style={{ fontSize: 12, color: "#666", margin: "4px 0 16px" }}>
        Internal. Ugly by design.
      </p>

      {/* Calendar picker — server-rendered form */}
      <form method="GET" style={{ marginBottom: 16 }}>
        <input type="hidden" name="token" value={expectedToken} />
        <label style={{ fontSize: 13 }}>
          Calendar:{" "}
          <select name="calendar" defaultValue={selectedCalendar || "__all__"} style={{ fontSize: 13, padding: 4 }}>
            <option value="__all__">— All calendars (aggregate) —</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} — {o.active_30d} active
              </option>
            ))}
          </select>
          <button type="submit" style={{ marginLeft: 8, fontSize: 13, padding: "4px 10px" }}>Go</button>
        </label>
      </form>

      <div style={{ fontSize: 13, color: "#333", marginBottom: 16 }}>
        Showing: <strong>{selectedCalendar || "All calendars (aggregate)"}</strong>
      </div>

      {/* Current sync activity */}
      <h2 style={h2Style}>Current sync activity</h2>
      <div style={{ fontSize: 13 }}>
        <div>active_7d: <strong>{syncNow.active_7d}</strong></div>
        <div>active_30d: <strong>{syncNow.active_30d}</strong></div>
      </div>

      {/* Click counts by type */}
      <h2 style={h2Style}>Clicks by type</h2>
      {clickCounts.length === 0 ? (
        <div style={{ fontSize: 13, color: "#888" }}>No clicks logged yet.</div>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={thStyle}>client_type</th>
              <th style={thStyle}>last 7d</th>
              <th style={thStyle}>prior 7d</th>
              <th style={thStyle}>all time</th>
            </tr>
          </thead>
          <tbody>
            {clickCounts.map((c) => (
              <tr key={c.client_type}>
                <td style={tdStyle}>{c.client_type}</td>
                <td style={tdStyle}>{c.last_7d}</td>
                <td style={tdStyle}>{c.prior_7d}</td>
                <td style={tdStyle}>{c.all_time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Snapshot trend */}
      <h2 style={h2Style}>Sync activity trend (last 30 days, from snapshots)</h2>
      {trend.length === 0 ? (
        <div style={{ fontSize: 13, color: "#888" }}>No snapshots yet.</div>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={thStyle}>date</th>
              <th style={thStyle}>active_7d</th>
              <th style={thStyle}>active_30d</th>
            </tr>
          </thead>
          <tbody>
            {trend.map((t) => (
              <tr key={t.snapshot_date}>
                <td style={tdStyle}>{t.snapshot_date}</td>
                <td style={tdStyle}>{t.active_7d}</td>
                <td style={tdStyle}>{t.active_30d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Recent clicks — sanity check that logging is alive */}
      <h2 style={h2Style}>Last 20 clicks (logging heartbeat)</h2>
      {recent.length === 0 ? (
        <div style={{ fontSize: 13, color: "#888" }}>No clicks logged yet.</div>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={thStyle}>timestamp</th>
              <th style={thStyle}>client_type</th>
              {!selectedCalendar && <th style={thStyle}>calendar</th>}
            </tr>
          </thead>
          <tbody>
            {recent.map((r, i) => (
              <tr key={i}>
                <td style={tdStyle}>{new Date(r.created_at).toLocaleString()}</td>
                <td style={tdStyle}>{r.client_type}</td>
                {!selectedCalendar && <td style={tdStyle}>{r.calendar_id}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
