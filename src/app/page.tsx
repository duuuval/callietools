import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Add your school's calendar to your phone in one tap. Holidays, early releases, teacher workdays — Callie keeps everything organized.",
};

const SCHOOLS = [
  "Bensley", "Beulah", "Bon Air", "Chester Early Childhood Learning Academy",
  "Chalkley", "Chesterfield Virtual School", "Marguerite Christian",
  "Clover Hill", "Crenshaw", "Crestwood", "Curtis", "Davis", "Ecoff",
  "Enon", "Ettrick", "Evergreen", "Falling Creek", "Gates", "Gordon",
  "Grange Hall", "Greenfield", "Harrowgate", "Hening", "Hopkins",
  "Jacobs Road", "Matoaca", "Moseley", "Old Hundred", "Providence",
  "Reams", "Robious", "Salem Church", "Elizabeth Scott", "Alberta Smith",
  "Spring Run", "Swift Creek", "Watkins", "Bettie Weaver", "Wells",
  "Winterpock", "Woolridge",
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="heroInner">
          <picture className="heroImage">
            <source
              srcSet="/images/callie-mobile.png"
              media="(max-width: 768px)"
            />
            <img
              src="/images/callie-desktop.png"
              alt="Callie the calendar helper"
            />
          </picture>

          <div className="heroCopy">
            <h1>Your school calendar, synced to your phone.</h1>
            <p className="heroSub">
              No more checking the district website or guessing when the next
              half-day is. Add your school&apos;s calendar to your phone in one
              tap, and Callie keeps everything organized.
            </p>
            <p className="heroNote">
              Free. No logins. No app to install.
            </p>
            <div className="scrollHint">
              Find your school below <span aria-hidden="true">↓</span>
            </div>
          </div>
        </div>
      </section>

      {/* Schools */}
      <section className="schools" id="schools">
        <div className="container">
          <div className="card">
            <h2 className="sectionTitle">Available schools</h2>

            <div className="districtCard">
              <h3 className="districtName">
                Chesterfield County Public Schools (2025-2026)
              </h3>
              <p className="districtSub">
                This calendar includes all 2025-2026 CCPS Traditional Calendar
                dates.
              </p>
              <Link className="districtLink" href="/calendar/CCPS25-26">
                Open CCPS 2025-2026 calendar →
              </Link>
            </div>

            <div className="schoolListWrap">
              <div
                className="schoolList"
                aria-label="Chesterfield County Public Schools elementary schools"
              >
                {SCHOOLS.map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <div className="container" style={{ marginTop: 18 }}>
        <div className="card">
          <h2
            className="sectionTitle"
            style={{ fontSize: 18, marginBottom: 12 }}
          >
            How it works
          </h2>

          <div className="row">
            <div className="sectionBox" style={{ flex: 1, minWidth: 240 }}>
              <div className="sectionTitle">1) Find your calendar above</div>
              <div className="helper">
                Choose your school, county, or system and open its calendar
                page.
              </div>
            </div>
            <div className="sectionBox" style={{ flex: 1, minWidth: 240 }}>
              <div className="sectionTitle">
                2) Choose your calendar app&apos;s link
              </div>
              <div className="helper">
                Tap the link that matches your device or calendar app.
              </div>
            </div>
            <div className="sectionBox" style={{ flex: 1, minWidth: 240 }}>
              <div className="sectionTitle">3) Add it once</div>
              <div className="helper">
                Events will appear on your phone or computer.
              </div>
            </div>
          </div>

          <div className="divider" />

          <div className="helper">
            Have other events or a PDF/image with dates you want added to your
            calendar?
            <br />
            Visit our{" "}
            <Link href="/calendar-concierge">Calendar Concierge</Link> page to
            learn more and see what else Callie can do ✨
          </div>
        </div>
      </div>
    </>
  );
}
