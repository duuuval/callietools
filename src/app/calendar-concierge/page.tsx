import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";

export const metadata: Metadata = {
  title: "Calendar Concierge",
  description:
    "Send your dates. Get a ready-to-sync calendar. Email Callie anything with dates and she'll turn it into a calendar link.",
};

export default function CalendarConciergePage() {
  return (
    <div className="container">
      <div className="card">
        <h1 className="heroTitle" style={{ fontSize: 28, margin: "0 0 6px" }}>
          Calendar Concierge
          <span style={{ opacity: 0.8 }}>✨</span>
        </h1>
        <p style={{ margin: "10px 0 6px", fontWeight: 600 }}>
          Send your dates. Get a ready-to-sync calendar.
        </p>

        <p
          style={{
            margin: "0 0 10px",
            color: "var(--muted)",
            lineHeight: 1.6,
          }}
        >
          Email Callie anything with dates—a link, PDF, image, newsletter, or
          simple list—and she&apos;ll turn it into a private calendar link you
          can add in seconds.
        </p>

        <p className="heroNote">
          Skip the manual event creation. Let Callie handle it.
        </p>

        <div className="divider" />

        {/* Email section */}
        <div className="section">
          <div className="sectionTitle">📩 Email</div>
          <div className="sectionBox">
            <div className="helper">Send anything with dates:</div>

            <div className="row" style={{ marginTop: 10 }}>
              <a
                className="btn btnPrimary"
                href="mailto:send@callietools.com?subject=Calendar%20"
              >
                Email Callie ✨
              </a>

              <CopyButton
                text="send@callietools.com"
                label="Copy email address"
                copiedLabel="Copied!"
              />
            </div>

            <div className="mini" style={{ marginTop: 10 }}>
              Tip: on mobile, the Email button is easiest. On desktop, you can
              copy/paste the address.
            </div>
          </div>
        </div>

        {/* What you can send */}
        <div className="section" style={{ marginTop: 18 }}>
          <div className="sectionTitle">✅ What you can send</div>
          <div className="sectionBox">
            <div className="helper">
              Any of these work:
              <ul
                style={{
                  margin: "10px 0 0 18px",
                  padding: 0,
                  color: "var(--muted)",
                }}
              >
                <li>A link to a webpage with a calendar/event</li>
                <li>
                  A PDF / image of a calendar (attached or in body of the email)
                </li>
                <li>
                  A newsletter or email that contains dates (forwarding works)
                </li>
                <li>A list of events and times in plain text</li>
                <li>An .ics file (attachment)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="section" style={{ marginTop: 18 }}>
          <div className="sectionTitle">✨ Tips for best results</div>
          <div className="sectionBox">
            <div className="helper">
              Think of this like writing to a helpful assistant. You don&apos;t
              need a special format — just explain what you want in plain
              English. Like:
            </div>

            <ul className="tipsList">
              <li>&quot;Name this calendar &apos;Fall Soccer 2025&apos;.&quot;</li>
              <li>
                &quot;These are all-day events, but I&apos;d like them to show
                up around 7am.&quot;
              </li>
              <li>&quot;Only include varsity games.&quot;</li>
              <li>&quot;Ignore past events.&quot;</li>
              <li>
                &quot;This PDF is messy — use your best judgment.&quot;
              </li>
            </ul>

            <div className="mini" style={{ marginTop: 12 }}>
              Callie reads context — the more naturally you write, the better it
              works. You can always adjust event names or reminders later inside
              your calendar app.
            </div>
          </div>
        </div>

        <div className="mini" style={{ marginTop: 18 }}>
          Prefer to start with a ready-to-use calendar instead?{" "}
          <Link href="/">Browse calendars</Link>
        </div>
      </div>
    </div>
  );
}
