import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Upgrade Your Calendar",
  description:
    "Add your logo, colors, and branding to your Callie calendar page. $10/month.",
};

export default function UpgradePage() {
  return (
    <div className="container">
      <div className="card">
        <div className="upgradeHero">
          <h1>Make your calendar page yours</h1>
          <p>
            Everything in the free plan, plus your branding
            front and center.
          </p>
        </div>

        <div className="upgradeGrid">
          <div className="upgradeCard">
            <span className="upgradeCardIcon" aria-hidden="true">🎨</span>
            <h3>Your colors</h3>
            <p>
              Choose an accent color that matches your brand.
              Subscribe buttons, highlights, and links all update
              to match.
            </p>
          </div>
          <div className="upgradeCard">
            <span className="upgradeCardIcon" aria-hidden="true">🏷️</span>
            <h3>Your logo</h3>
            <p>
              Your logo at the top of your calendar page instead
              of Callie branding. Your group sees your brand, not ours.
            </p>
          </div>
          <div className="upgradeCard">
            <span className="upgradeCardIcon" aria-hidden="true">🌗</span>
            <h3>Light or dark theme</h3>
            <p>
              Pick the look that fits your style. Dark for a bold,
              modern feel. Light for something clean and bright.
            </p>
          </div>
          <div className="upgradeCard">
            <span className="upgradeCardIcon" aria-hidden="true">✨</span>
            <h3>Clean footer</h3>
            <p>
              Callie branding moves to a small &ldquo;Powered
              by&rdquo; credit in the footer. The page feels like
              yours because it is.
            </p>
          </div>
        </div>

        <div className="upgradePrice">
          <p className="upgradePriceAmount">$10/mo</p>
          <p className="upgradePriceNote">
            Cancel anytime. No contracts, no setup fees.
          </p>
        </div>

        <div className="upgradeCtas">
          <Link className="btn btnPrimary heroBtn" href="/create">
            Create your calendar &mdash; free
          </Link>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>
            Start free, upgrade when you&apos;re ready.
          </p>
        </div>

        <div className="upgradeDivider" />

        <div className="upgradeAlready">
          <p>
            Already have a Callie calendar and want to add
            your branding? Email us your calendar name and
            we&apos;ll get you set up.
          </p>
          <a href="mailto:hello@callietools.com?subject=Upgrade%20my%20calendar">
            hello@callietools.com
          </a>
        </div>
      </div>
    </div>
  );
}
