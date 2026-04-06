import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "School Calendars",
  description:
    "Subscribe to your school's calendar and get every holiday, half-day, early release, and teacher workday synced to your phone automatically.",
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

export default function SchoolsPage() {
  return (
    <div className="container">
      <div className="card">
        <h1 className="homeSectionTitle" style={{ fontSize: "1.5rem", marginBottom: 8 }}>
          School Calendars
        </h1>
        <p className="schoolDesc">
          Subscribe once and every holiday, half-day, early release, and
          teacher workday is already on your calendar. No app to install,
          no manual entry.
        </p>

        <div className="districtCard">
          <h2 className="districtName">
            Chesterfield County Public Schools (2025&ndash;2026)
          </h2>
          <p className="districtSub">
            This calendar covers all 2025&ndash;2026 CCPS Traditional Calendar
            dates &mdash; holidays, half-days, early releases, teacher workdays,
            and breaks &mdash; for every school in the district.
          </p>
          <Link className="btn btnPrimary" href="/CCPS25-26">
            View &amp; subscribe
          </Link>

          <details className="schoolListDetails">
            <summary className="schoolListSummary">
              Covered schools ({SCHOOLS.length})
            </summary>
            <div
              className="schoolList"
              aria-label="Chesterfield County Public Schools"
            >
              {SCHOOLS.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
