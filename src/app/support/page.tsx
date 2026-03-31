import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support Callie",
  description:
    "Callie is free for personal use. Tips help cover hosting and maintenance.",
};

export default function SupportPage() {
  return (
    <div className="container">
      <div className="card">
        {/* Top split section */}
        <div className="supportWrap">
          <div className="supportCopy">
            <h1>Support Callie 💜</h1>

            <p className="supportIntro">
              Callie was built by a parent to make school (and other)
              calendars simple for other busy parents.
            </p>
            <p className="supportIntro">
              No logins. No clutter. No manual event entry.
            </p>

            <p className="supportTight">
              It&apos;s free for personal use — if it&apos;s saved you time (or
              a little sanity), you can support it with an optional tip.
            </p>
          </div>

          {/* Mascot column */}
          <div className="supportMascot" aria-hidden="true">
            <img
              src="/images/callie-mobile.png"
              alt="Callie the Calendar Wizard"
            />
          </div>
        </div>

        <div className="divider" />

        {/* Coffee section */}
        <div className="supportCard fullWidthCard">
          <h2>Buy Callie a Coffee ☕</h2>
          <p>
            Tips help cover web hosting, maintenance, and time spent keeping
            calendars accurate and up to date.
          </p>

          <a
            href="https://www.buymeacoffee.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btnPrimary"
          >
            Support Callie
          </a>
        </div>
      </div>
    </div>
  );
}
