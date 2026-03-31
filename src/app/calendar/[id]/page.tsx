import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCalendar } from "@/lib/sheets";
import { CalendarClient } from "./CalendarClient";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cal = await getCalendar(params.id);
  return {
    title: cal?.name || "Calendar",
    description: cal
      ? `Sync "${cal.name}" to your phone or computer.`
      : "Calendar not found",
  };
}

export default async function CalendarPage({ params }: Props) {
  const cal = await getCalendar(params.id);

  if (!cal) {
    notFound();
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://callietools.com";
  const httpsIcs = `${siteUrl}/api/ics/${encodeURIComponent(cal.id)}.ics`;
  // webcal:// uses the host without protocol
  const host = siteUrl.replace(/^https?:\/\//, "");
  const webcalIcs = `webcal://${host}/api/ics/${encodeURIComponent(cal.id)}.ics`;

  return (
    <div className="container">
      <div className="card">
        <h1
          className="heroTitle"
          style={{ fontSize: 29, margin: 0 }}
        >
          {cal.name || cal.id}
        </h1>

        <div className="meta" style={{ marginTop: 6 }}>
          Last updated: {cal.last_updated || "—"}
        </div>

        <p className="heroNote" style={{ marginTop: 10 }}>
          Choose your calendar app below to sync this schedule to your phone or
          computer.
        </p>

        <div className="divider" />

        {/* Apple */}
        <div className="section">
          <div className="sectionTitle">🍎 Apple Calendar (iPhone / iPad / Mac)</div>
          <div className="sectionBox">
            <div className="helper">
              <strong>Best option for Apple devices.</strong>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <a className="btn btnPrimary" href={webcalIcs} rel="noopener">
                Sync to Apple Calendar
              </a>
            </div>
            <div className="mini" style={{ marginTop: 12 }}>
              The calendar should open in Apple Calendar.
            </div>
          </div>
        </div>

        {/* Google / Android — needs client interactivity for copy */}
        <CalendarClient httpsIcs={httpsIcs} webcalIcs={webcalIcs} />

        {/* Other apps */}
        <div className="section" style={{ marginTop: 18 }}>
          <div className="sectionTitle">💻 Other calendar apps</div>
          <div className="sectionBox">
            <div className="helper">
              For desktop apps or calendars that don&apos;t support links.
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <a className="btn btnPrimary" href={httpsIcs} rel="noopener">
                Download calendar file
              </a>
            </div>
            <div className="mini">
              You can import the file into most calendar apps.
            </div>
          </div>
        </div>

        <br />

        {/* Troubleshooting */}
        <details className="troubleshoot" style={{ marginTop: 18 }}>
          <summary>Having trouble adding the calendar? Tap for help.</summary>
          <div className="troubleshootBody">
            <div className="divider" />

            <div className="sectionBox" style={{ marginTop: 10 }}>
              <div className="helper" style={{ fontWeight: 800, marginBottom: 6 }}>
                Apple devices
              </div>
              <div className="helper">
                If tapping the button doesn&apos;t open Apple Calendar, copy the
                calendar link below and add it manually using{" "}
                <strong>Calendar → File → New Calendar Subscription</strong>.
              </div>
              <span className="code">{webcalIcs}</span>
            </div>

            <div className="sectionBox" style={{ marginTop: 12 }}>
              <div className="helper" style={{ fontWeight: 800, marginBottom: 6 }}>
                Google Calendar
              </div>
              <div className="helper">
                If the link opens the Google Calendar app, return here and open
                Google Calendar in a browser instead (type or copy + paste:
                calendar.google.com).
                <br />
                You&apos;ll need to use Google Calendar&apos;s{" "}
                <strong>Add by URL</strong> option on the web.
                <br />
                <br />
                Use this URL to sync the calendar:
              </div>
              <span className="code">{httpsIcs}</span>
            </div>

            <div className="sectionBox" style={{ marginTop: 12 }}>
              <div className="helper" style={{ fontWeight: 800, marginBottom: 6 }}>
                Other calendar apps
              </div>
              <div className="helper">
                If your calendar app doesn&apos;t support calendar links,
                download the calendar file above and import it manually.
                Downloaded calendars usually don&apos;t update automatically.
              </div>
            </div>

            <div className="sectionBox" style={{ marginTop: 12 }}>
              <div className="helper" style={{ fontWeight: 800, marginBottom: 6 }}>
                Still stuck?
              </div>
              <div className="helper">
                Email us at{" "}
                <a href="mailto:hello@callietools.com">hello@callietools.com</a>{" "}
                and tell us what device or calendar app you&apos;re using.
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
