import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "School Calendars",
  description:
    "Subscribe to your school's calendar and get every holiday, half-day, early release, and teacher workday synced to your phone automatically.",
};

/* ─────────────────────────────────────────────────────────────────────────────
   District data
   • To activate a "Coming soon" district, change  href: null  →  href: "/your-slug"
   • The component auto-switches from Coming Soon to View & Subscribe based on href
   ──────────────────────────────────────────────────────────────────────────── */

interface SchoolGroup {
  label: string;
  schools: string[];
}

interface District {
  name: string;
  year: string;
  /** Calendar page path — null = Coming Soon */
  href: string | null;
  groups: SchoolGroup[];
}

const DISTRICTS: District[] = [
  {
    name: "Chesterfield County Public Schools",
    year: "2025\u20132026",
    href: "/CCPS25-26",
    groups: [
      {
        label: "Elementary Schools",
        schools: [
          "Bensley", "Beulah", "Bon Air", "Chalkley",
          "Chester Early Childhood Learning Academy",
          "Marguerite Christian", "Clover Hill", "Crenshaw", "Crestwood",
          "Curtis", "A.M. Davis", "Ecoff", "Enon", "Ettrick", "Evergreen",
          "Falling Creek", "Gates", "Gordon", "Grange Hall", "Greenfield",
          "Harrowgate", "Hening", "Hopkins", "Jacobs Road", "Matoaca",
          "Moseley", "Old Hundred", "Providence", "Reams", "Robious",
          "Salem Church", "Elizabeth Scott", "Alberta Smith", "Spring Run",
          "Swift Creek", "Watkins", "Bettie Weaver", "Wells", "Winterpock",
          "Woolridge",
        ],
      },
      {
        label: "Middle Schools",
        schools: [
          "Bailey Bridge", "Carver", "Deep Creek", "Elizabeth Davis",
          "Falling Creek", "Manchester", "Matoaca", "Midlothian",
          "Providence", "Robious", "Salem Church", "Swift Creek",
          "Tomahawk Creek",
        ],
      },
      {
        label: "High Schools & Specialty",
        schools: [
          "Lloyd C. Bird", "Carver College and Career Academy",
          "Clover Hill", "Cosby", "Thomas Dale", "James River",
          "Manchester", "Matoaca", "Meadowbrook", "Midlothian", "Monacan",
          "Career and Technical Center @ Courthouse",
          "Career and Technical Center @ Hull",
        ],
      },
    ],
  },
  {
    name: "Henrico County Public Schools",
    year: "2026\u20132027",
    href: null,
    groups: [
      {
        label: "Elementary Schools",
        schools: [
          "Arthur R. Ashe Jr.", "Cashell Donahoe", "Chamberlayne",
          "Charles M. Johnson", "Colonial Trail", "Crestview",
          "David A. Kaechele", "Dumbarton", "Echo Lake",
          "Elizabeth Holladay", "Fair Oaks", "Gayton", "George F. Baker",
          "Glen Allen", "Glen Lea", "Greenwood",
          "Harold Macon Ratcliffe", "Harvie", "Henry D. Ward",
          "Highland Springs", "Jackson Davis", "Jacob L. Adams",
          "Laburnum", "Lakeside", "Longdale", "Maude Trevvett",
          "Maybeury", "Anthony P. Mehfoud", "Montrose", "Nuckols Farm",
          "Pemberton", "Raymond B. Pinchbeck", "R.C. Longan", "Ridge",
          "Rivers Edge", "Ruby F. Carver", "Sandston", "Seven Pines",
          "Shady Grove", "Short Pump", "Skipwith", "Springfield Park",
          "Three Chopt", "Tuckahoe", "Twin Hickory", "Varina",
          "New Bridge Learning Center",
        ],
      },
      {
        label: "Middle Schools",
        schools: [
          "Brookland", "Elko", "Fairfield", "Holman", "Hungary Creek",
          "George H. Moody", "Pocahontas", "Quioccasin", "John Rolfe",
          "Short Pump", "Tuckahoe", "L. Douglas Wilder",
        ],
      },
      {
        label: "High Schools & Specialty",
        schools: [
          "Deep Run", "Douglas S. Freeman", "Glen Allen", "Henrico",
          "Hermitage", "Highland Springs", "John Randolph Tucker",
          "Mills E. Godwin", "Varina",
          "Academy at Virginia Randolph",
          "Evening School of Excellence",
        ],
      },
    ],
  },
  {
    name: "Hanover County Public Schools",
    year: "2026\u20132027",
    href: null,
    groups: [
      {
        label: "Elementary Schools",
        schools: [
          "Ashland", "Battlefield Park", "Beaverdam", "Cold Harbor",
          "Cool Spring", "Elmont", "Kersey Creek", "Laurel Meadow",
          "Mechanicsville", "Pearson's Corner", "Pole Green",
          "Rural Point", "South Anna", "Washington-Henry",
        ],
      },
      {
        label: "Middle Schools",
        schools: [
          "Bell Creek", "Chickahominy", "Liberty", "Oak Knoll",
        ],
      },
      {
        label: "High Schools & Specialty",
        schools: [
          "Atlee", "Hanover", "Mechanicsville", "Patrick Henry",
          "The Georgetown School",
          "The Hanover Center for Trades & Technology",
        ],
      },
    ],
  },
  {
    name: "City of Richmond Public Schools",
    year: "2026\u20132027",
    href: null,
    groups: [
      {
        label: "Preschools",
        schools: [
          "J.H. Blackwell Preschool", "Mary Scott Preschool",
          "Maymont Preschool", "Martin Luther King, Jr. Preschool",
          "Summer Hill Preschool",
        ],
      },
      {
        label: "Elementary Schools",
        schools: [
          "Barack Obama", "Bellevue", "Broad Rock", "Cardinal",
          "Chimborazo", "Elizabeth D. Redd", "Fairfield Court",
          "G.H. Reid", "George W. Carver", "Frances W. McClenney",
          "Henry L. Marsh III", "J.B. Fisher", "J.H. Blackwell",
          "J.L. Francis", "Lois Harrison-Jones", "Linwood Holton",
          "Mary Munford", "Miles J. Jones", "Oak Grove-Bellemeade",
          "Overby-Sheppard", "Southampton", "Swansboro",
          "Westover Hills", "William Fox", "Woodville",
        ],
      },
      {
        label: "Middle Schools",
        schools: [
          "Albert Hill", "Dogwood", "Lucille M. Brown",
          "Martin Luther King, Jr.", "River City",
          "Thomas C. Boushall", "Thomas H. Henderson",
        ],
      },
      {
        label: "High Schools & Specialty",
        schools: [
          "Armstrong", "Huguenot", "John Marshall",
          "Richmond High School for the Arts", "Open High School",
          "Richmond Community High", "Thomas Jefferson",
          "Franklin Military Academy",
          "Richmond Technical Center",
          "Richmond Adult Technical Center",
          "Amelia Street School",
          "Patrick Henry School of Science and Arts",
          "Richmond Career Education and Employment Academy",
          "Richmond Success Academy",
          "Virgie Binford Education Center",
        ],
      },
    ],
  },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function totalSchools(d: District): number {
  return d.groups.reduce((sum, g) => sum + g.schools.length, 0);
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function SchoolsPage() {
  return (
    <div className="container">
      <div className="card">
        <h1
          className="homeSectionTitle"
          style={{ fontSize: "1.5rem", marginBottom: 8 }}
        >
          School Calendars
        </h1>
        <p className="schoolDesc">
          Subscribe once and every holiday, half-day, early release, and
          teacher workday is already on your calendar. No app to install,
          no manual entry.
        </p>
        <p
          className="schoolDesc"
          style={{ fontSize: "0.9rem", opacity: 0.75, marginTop: 8 }}
        >
          Callie mirrors each district&rsquo;s published calendar. For snow
          days and last-minute changes, your school&rsquo;s official channels
          remain the source of truth.
        </p>

        {DISTRICTS.map((d) => (
          <div className="districtCard" key={d.name}>
            <h2 className="districtName">
              {d.name} ({d.year})
            </h2>

            {/* ── CTA: live link or coming soon ── */}
            <div style={{ marginTop: 16 }}>
              {d.href ? (
                <Link className="btn btnPrimary" href={d.href}>
                  View &amp; subscribe
                </Link>
              ) : (
                <span className="btn btnComingSoon">Coming soon</span>
              )}
            </div>
            
            {/* ── School list with sub-headers ── */}
            <details className="schoolListDetails" style={{ marginTop: 16 }}>
              <summary className="schoolListSummary">
                Covered schools ({totalSchools(d)})
              </summary>

              {d.groups.map((g) => (
                <div key={g.label}>
                  <h3 className="schoolGroupLabel">{g.label}</h3>
                  <div
                    className="schoolList"
                    aria-label={`${d.name} \u2014 ${g.label}`}
                  >
                    {g.schools.map((name) => (
                      <span key={name}>{name}</span>
                    ))}
                  </div>
                </div>
              ))}
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
