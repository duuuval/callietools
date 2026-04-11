import Link from "next/link";
import { validateDashboardToken, getCalendarsByEmail, getEvents } from "@/lib/sheets";

export default async function MyCalendarsDashboard({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await validateDashboardToken(token);

  // ── Expired or invalid token ──────────────────────────────
  if (!result) {
    return (
      <main className="main">
        <div className="container" style={{ maxWidth: 480 }}>
          <div className="card" style={{ textAlign: "center" }}>
            <h1 className="createHeader">Link expired</h1>
            <p className="createSubhead">
              This link has expired. No worries — just request a new one.
            </p>
            <Link
              className="btn btnPrimary"
              href="/my-calendars"
              style={{ display: "inline-block", marginTop: 16 }}
            >
              Get a new link
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Valid token — fetch calendars ─────────────────────────
  const calendars = await getCalendarsByEmail(result.email);

  // ── Empty state (email exists but no calendars) ───────────
  if (calendars.length === 0) {
    return (
      <main className="main">
        <div className="container" style={{ maxWidth: 480 }}>
          <div className="card" style={{ textAlign: "center" }}>
            <h1 className="createHeader">My Calendars</h1>
            <p className="createSubhead">
              No calendars found. Ready to make one?
            </p>
            <Link
              className="btn btnPrimary"
              href="/create"
              style={{ display: "inline-block", marginTop: 16 }}
            >
              Create Calendar
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Fetch event counts for each calendar ──────────────────
  const calendarsWithCounts = await Promise.all(
    calendars.map(async (c) => {
      const events = await getEvents(c.id);
      return { ...c, eventCount: events.length };
    })
  );

  // ── Dashboard ─────────────────────────────────────────────
  return (
    <main className="main">
      <div className="container" style={{ maxWidth: 580 }}>
        <div className="card">
          <h1 className="createHeader">My Calendars</h1>
          <p className="createSubhead">
            Manage your calendars or share them with your people.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
            {calendarsWithCounts.map((c) => (
              <div
                key={c.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radiusMd)",
                  padding: 16,
                  background: "#fafafa",
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <Link
                    href={`/${c.id}`}
                    style={{
                      color: "var(--primary)",
                      fontWeight: 600,
                      fontSize: "1rem",
                      textDecoration: "none",
                    }}
                  >
                    {c.name}
                  </Link>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                    {c.eventCount} event{c.eventCount !== 1 ? "s" : ""}
                    {c.last_updated ? ` · Created ${c.last_updated}` : ""}
                  </span>

                  <Link
                    href={`/manage/${c.manage_token}`}
                    style={{
                      color: "var(--primary)",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Manage &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Footer nudge */}
          <p
            className="footerUpgrade"
            style={{ textAlign: "center", marginTop: 32 }}
          >
            Want your logo and colors on your calendar?{" "}
            <a href="/upgrade">Make it yours — $10/month.</a>
          </p>
        </div>
      </div>
    </main>
  );
}
