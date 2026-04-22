"use client";

import { useState } from "react";

/* ─── Archetype definitions ──────────────────────────────────

   To update: swap logos in /public/logos/, adjust colors,
   or tweak sample event copy. Keep shapes stable.

   ──────────────────────────────────────────────────────────── */

type Archetype = {
  id: "kidsStudio" | "riversideSwim" | "mapleStreetMoms";
  tabLabel: string;
  calendarName: string;
  logoPath: string;
  defaultTheme: "light" | "dark";
  defaultColor: string;
  colors: string[]; // preset swatches — first is the default
  events: {
    weekday: string;
    dateDisplay: string;
    title: string;
    timeDisplay?: string;
    location?: string;
  }[];
};

const ARCHETYPES: Archetype[] = [
  {
    id: "kidsStudio",
    tabLabel: "Kids Studio",
    calendarName: "Kids Studio",
    logoPath: "/logos/kids-studio.png",
    defaultTheme: "light",
    defaultColor: "#D4775B",
    // Warm/playful palette — updated once real logo colors reviewed
    colors: ["#E85D75", "#F4A261", "#8BB17C", "#6B8EBF", "#B07BC9"],
    events: [
      {
        weekday: "Mon",
        dateDisplay: "Apr 28",
        title: "Toddler Music Mondays",
        timeDisplay: "9:30 – 10:15 AM",
        location: "Main Studio",
      },
      {
        weekday: "Wed",
        dateDisplay: "Apr 30",
        title: "Open Art Studio",
        timeDisplay: "10:00 – 11:30 AM",
      },
    ],
  },
  {
    id: "riversideSwim",
    tabLabel: "Riverside Swim",
    calendarName: "Riverside Swim Team",
    logoPath: "/logos/riverside-swim.png",
    defaultTheme: "dark",
    defaultColor: "#1E3A8A",
    // Cool/sporty palette — updated once real logo colors reviewed
    colors: ["#1E3A8A", "#4F9FD6", "#0EA5E9", "#DC2626", "#F59E0B"],
    events: [
      {
        weekday: "Tue",
        dateDisplay: "Apr 29",
        title: "Practice — U12 Group",
        timeDisplay: "5:00 – 6:30 PM",
        location: "Riverside Pool",
      },
      {
        weekday: "Sat",
        dateDisplay: "May 3",
        title: "Home Meet vs. Eastwood",
        timeDisplay: "8:00 AM",
        location: "Riverside Pool",
      },
    ],
  },
  {
    id: "mapleStreetMoms",
    tabLabel: "Maple Street Moms",
    calendarName: "Maple Street Moms",
    logoPath: "/logos/maple-street-moms.png",
    defaultTheme: "light",
    defaultColor: "#92400E",
    // Warm-community palette — updated once real logo colors reviewed
    colors: ["#92400E", "#C97B5E", "#B45309", "#7C2D12", "#059669"],
    events: [
      {
        weekday: "Thu",
        dateDisplay: "May 1",
        title: "Playground Meetup",
        timeDisplay: "10:00 AM",
        location: "Maple Park",
      },
      {
        weekday: "Fri",
        dateDisplay: "May 9",
        title: "Moms' Night Out",
        timeDisplay: "7:30 PM",
      },
    ],
  },
];

/* ─── Helpers ────────────────────────────────────────────── */

function isLightColor(hex: string): boolean {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

/* ─── Component ──────────────────────────────────────────── */

export function UpgradePreview() {
  const [activeId, setActiveId] =
    useState<Archetype["id"]>("kidsStudio");

  // Per-archetype theme + color state, so switching tabs
  // preserves each archetype's customizations (and the defaults
  // feel intentional when you tab across).
  const [themeMap, setThemeMap] = useState<
    Record<Archetype["id"], "light" | "dark">
  >(() =>
    Object.fromEntries(
      ARCHETYPES.map((a) => [a.id, a.defaultTheme])
    ) as Record<Archetype["id"], "light" | "dark">
  );

  const [colorMap, setColorMap] = useState<
    Record<Archetype["id"], string>
  >(() =>
    Object.fromEntries(
      ARCHETYPES.map((a) => [a.id, a.defaultColor])
    ) as Record<Archetype["id"], string>
  );

  const active = ARCHETYPES.find((a) => a.id === activeId)!;
  const theme = themeMap[activeId];
  const accent = colorMap[activeId];
  const buttonTextColor = isLightColor(accent) ? "#000000" : "#ffffff";
  const isDark = theme === "dark";

  return (
    <div className="upgradePreviewWrap">
      {/* Tab row */}
      <div className="upgradePreviewTabs" role="tablist">
        {ARCHETYPES.map((a) => {
          const isActive = a.id === activeId;
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`upgradePreviewTab ${
                isActive ? "upgradePreviewTab--active" : ""
              }`}
              onClick={() => setActiveId(a.id)}
            >
              <img
                src={a.logoPath}
                alt=""
                className="upgradePreviewTabLogo"
                aria-hidden="true"
              />
              <span className="upgradePreviewTabLabel">{a.tabLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Controls: theme + color */}
      <div className="upgradePreviewControls">
        <div className="upgradePreviewControl">
          <span className="upgradePreviewControlLabel">Theme</span>
          <div
            className="upgradePreviewThemeToggle"
            role="group"
            aria-label="Theme"
          >
            <button
              type="button"
              className={`upgradePreviewThemeBtn ${
                theme === "light" ? "upgradePreviewThemeBtn--active" : ""
              }`}
              onClick={() =>
                setThemeMap((m) => ({ ...m, [activeId]: "light" }))
              }
            >
              Light
            </button>
            <button
              type="button"
              className={`upgradePreviewThemeBtn ${
                theme === "dark" ? "upgradePreviewThemeBtn--active" : ""
              }`}
              onClick={() =>
                setThemeMap((m) => ({ ...m, [activeId]: "dark" }))
              }
            >
              Dark
            </button>
          </div>
        </div>

        <div className="upgradePreviewControl">
          <span className="upgradePreviewControlLabel">Color</span>
          <div className="upgradePreviewSwatches" role="group" aria-label="Color">
            {active.colors.map((c) => {
              const isActive = c.toLowerCase() === accent.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  className={`upgradePreviewSwatch ${
                    isActive ? "upgradePreviewSwatch--active" : ""
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                  onClick={() =>
                    setColorMap((m) => ({ ...m, [activeId]: c }))
                  }
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Scoped mini-preview of the real calendar page.
          Uses the same class names (calPageTitle, eventRow, etc.)
          so fidelity stays in sync with the production page.
          Wrapped in .upgradePreviewStage which scopes data-theme
          and the accent CSS variables locally. */}
      <div
        className="upgradePreviewStage"
        data-theme={isDark ? "dark" : "light"}
        data-paid="true"
        style={
          {
            "--primary": accent,
            "--primaryHover": accent,
            "--primary-text": buttonTextColor,
          } as React.CSSProperties
        }
      >
        {/* Card 1: header + events */}
        <div className="card upgradePreviewCard">
          <div className="upgradePreviewHeader">
            <img
              src={active.logoPath}
              alt={active.calendarName}
              className="calLogoImg"
            />
            <h1
              className="calPageTitle"
              style={{ margin: 0, textAlign: "right", flex: 1 }}
            >
              {active.calendarName}
            </h1>
          </div>
          <div className="divider" />

          <div className="eventsSection">
            {active.events.map((e, i) => (
              <div className="eventRow" key={i}>
                <div className="eventDateCol">
                  <span className="eventWeekday">{e.weekday}</span>
                  <span className="eventDate">{e.dateDisplay}</span>
                </div>
                <div className="eventDetails">
                  <div className="eventTitle">{e.title}</div>
                  {e.timeDisplay && (
                    <span className="eventTime">{e.timeDisplay}</span>
                  )}
                  {e.location && (
                    <span className="eventLocation">{e.location}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: subscribe — truncated with fade */}
        <div
          className="card upgradePreviewCard upgradePreviewCardFade"
          style={{ marginTop: 16 }}
        >
          <p className="calSubscribeIntro">
            Add this calendar to your phone — events update automatically.
          </p>
          <p
            className="mini"
            style={{
              fontStyle: "italic",
              marginTop: 0,
              marginBottom: 18,
            }}
          >
            New events typically appear within a couple hours.
          </p>

          {/* Apple section — button is display-only */}
          <div className="section">
            <div className="sectionTitle">
              🍎 Apple Calendar (iPhone / iPad / Mac)
            </div>
            <div className="sectionBox">
              <div className="row">
                <span
                  className="btn btnPrimary"
                  style={{
                    backgroundColor: accent,
                    borderColor: accent,
                    color: buttonTextColor,
                    cursor: "default",
                  }}
                  aria-hidden="true"
                >
                  Subscribe in Apple Calendar
                </span>
              </div>
            </div>
          </div>

          {/* Google section — header only, fades into nothing below */}
          <div className="section" style={{ marginTop: 18 }}>
            <div className="sectionTitle">
              🤖 Google Calendar (Android / Gmail)
            </div>
          </div>
        </div>
      </div>

      {/* Preview cutoff label */}
      <p className="upgradePreviewNote">
        Preview — your real page continues with subscribe steps, sharing,
        and more.
      </p>
    </div>
  );
}
