import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Callie — Your events, on everyone's phone",
  description:
    "Create a free calendar page your people can subscribe to. They add it once — every update shows up automatically. Perfect for teams, classes, PTAs, and community groups.",
  openGraph: {
    title: "Callie — Your events, on everyone's phone",
    description:
      "Create a free calendar page your people can subscribe to. They add it once — every update shows up automatically.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Callie — Your events, on everyone's phone",
    images: ["/og-image.png"],
  },
};

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="hero">
        <div className="heroInner heroInnerRedesign">
          <div className="heroCopy">
            <h1>
              Everyone has a calendar app.
              <br />
              Nobody has <span className="heroHighlight">your events</span> on
              it&nbsp;&mdash;&nbsp;yet.
            </h1>
            <p className="heroSub">
              Create a free calendar page your people can subscribe to.
              They add it once&nbsp;&mdash; every update shows up automatically.
            </p>
            <div className="heroCtas">
              <Link className="btn btnPrimary heroBtn" href="/create">
                Create your calendar &mdash; free
              </Link>
              <p className="heroConfidence">
                Completely free &mdash; create your calendar, share it with
                your people, update it anytime. Upgrade only if you want your
                own logo and colors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section className="homeSection">
        <div className="container">
          <div className="card">
            <h2 className="homeSectionTitle">How it works</h2>

            <div className="stepsRow">
              <div className="stepCard">
                <span className="stepNum">1</span>
                <h3 className="stepTitle">Add your events</h3>
                <p className="stepDesc">
                  Enter them manually or upload an image or
                  schedule and we&apos;ll pull them out for you.
                </p>
              </div>

              <div className="stepCard">
                <span className="stepNum">2</span>
                <h3 className="stepTitle">Share your link</h3>
                <p className="stepDesc">
                  You get a calendar page with a clean URL. Send it
                  to your people.
                </p>
              </div>

              <div className="stepCard">
                <span className="stepNum">3</span>
                <h3 className="stepTitle">They subscribe</h3>
                <p className="stepDesc">
                  One tap and your events are on their phone.
                  You update, they see it automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who it's for ─────────────────────────────────── */}
      <section className="homeSection homeSectionWho">
        <div className="container">
          <h2 className="homeSectionTitleCenter">Who it&apos;s for</h2>
          <p className="recognitionLine">
            Teams, classes, scout troops, church groups, PTAs, community
            orgs&nbsp;&mdash; if you&apos;re the one everyone asks{" "}
            <em>&ldquo;when is it again?&rdquo;</em>, this is for you.
          </p>
        </div>
      </section>

      {/* ── Side-by-Side Comparison ──────────────────────── */}
      <section className="homeSection">
        <div className="container">
          <div className="card">
            <h2 className="homeSectionTitle">Same work. Better outcome.</h2>

            <div className="compareTable">
              <div className="compareHeader">
                <div className="compareColLabel">Now</div>
                <div className="compareColLabel compareColRight">
                  With Callie
                </div>
              </div>

              <div className="compareRow">
                <div className="compareCell">Plan your events</div>
                <div className="compareCell compareCellRight">
                  Plan your events
                </div>
              </div>
              <div className="compareRow">
                <div className="compareCell">Share your schedule</div>
                <div className="compareCell compareCellRight">
                  Share your schedule&nbsp;&mdash;{" "}
                  <strong>with your calendar link</strong>
                </div>
              </div>
              <div className="compareRow">
                <div className="compareCell">Fight for attention</div>
                <div className="compareCell compareCellRight">
                  Capture subscribers
                </div>
              </div>
              <div className="compareRow">
                <div className="compareCell">Hope they remember</div>
                <div className="compareCell compareCellRight">
                  It&apos;s already on their calendar
                </div>
              </div>
              <div className="compareRow compareRowFinal">
                <div className="compareCell">
                  <strong>Do it all again next month</strong>
                </div>
                <div className="compareCell compareCellRight">
                  <strong>Build an audience that never misses</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mid-page CTA ─────────────────────────────────── */}
      <section className="homeSection homeSectionCta">
        <div className="container" style={{ textAlign: "center" }}>
          <p className="midCtaLine">Get your events on their phones.</p>
          <Link className="btn btnPrimary heroBtn" href="/create">
            Create your calendar
          </Link>
        </div>
      </section>

      {/* ── School Calendars ─────────────────────────────── */}
      <section className="homeSection">
        <div className="container schoolTeaser">
          <h2 className="homeSectionTitle">
            Looking for your school calendar?
          </h2>
          <p className="schoolTeaserDesc">
            Subscribe once and every half-day, early release, and teacher
            workday is already on your calendar. Currently available for
            Chesterfield County Public Schools.
          </p>
          <Link className="btn btnSecondary" href="/schools">
            Browse school calendars &rarr;
          </Link>
        </div>
      </section>
    </>
  );
}
