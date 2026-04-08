import type { Metadata } from "next";
import Link from "next/link";
import { Image as ImageIcon, Palette, SunMoon, ArrowLeftRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Upgrade Your Calendar",
  description:
    "Add your logo, colors, and branding to your Callie calendar page. $10/month.",
};

const features = [
  {
    icon: <ImageIcon size={22} strokeWidth={1.75} />,
    title: "Your logo",
    body: "Your logo at the top of the page instead of ours. Subscribers see your brand the moment they arrive.",
  },
  {
    icon: <Palette size={22} strokeWidth={1.75} />,
    title: "Your colors",
    body: "Choose an accent color that matches your brand. Subscribe buttons, highlights, and links all update to match.",
  },
  {
    icon: <SunMoon size={22} strokeWidth={1.75} />,
    title: "Light or dark theme",
    body: "Pick the look that fits your style. Dark for a bold, modern feel. Light for something clean and bright.",
  },
  {
    icon: <ArrowLeftRight size={22} strokeWidth={1.75} />,
    title: "We get out of the way",
    body: "Your branding takes the lead. We step aside — no Callie nav, no busy footer. Small \u201cPowered by Callie\u201d credits in the header and footer, and the rest is yours.",
  },
];

export default function UpgradePage() {
  return (
    <div className="container">
      <div className="card">
        <div className="upgradeHero">
          <h1>Make your calendar page yours</h1>
          <p>
            Everything Callie offers is already free &mdash; no limits,
            no expiration. The upgrade is about one thing: making the
            page look like yours instead of ours.
          </p>
        </div>

        <div className="upgradeFreeBlock">
          <p>
            <strong>Always free:</strong> Create your calendar, share
            your page, add events (including our upload an image or
            schedule tool), update anytime &mdash; your group gets
            every change automatically.
          </p>
        </div>

        <div className="upgradePaidLabel">$10/mo adds:</div>

        <div className="upgradeGrid">
          {features.map((f) => (
            <div className="upgradeCard" key={f.title}>
              <span className="upgradeCardIcon" aria-hidden="true">
                {f.icon}
              </span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
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
            Already have a Callie calendar and want to add your branding?
            Email us your calendar name and we&apos;ll get you set up.
          </p>
          <a href="mailto:hello@callietools.com?subject=Upgrade%20my%20calendar">
            hello@callietools.com
          </a>
        </div>
      </div>
    </div>
  );
}
