// src/app/upgrade/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Image as ImageIcon, Palette, SunMoon } from "lucide-react";
import { UpgradePreview } from "@/components/UpgradePreview";

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
];

export default function UpgradePage() {
  return (
    <div className="container">
      <div className="card">
        {/* Hero — ownership-first, reassurance folded into subhead */}
        <div className="upgradeHero">
          <h1>Make your calendar page yours</h1>
          <p>
            Swap our branding for yours &mdash; your logo, your colors,
            your theme. Everything else about Callie stays exactly as it
            is, and stays free.
          </p>
        </div>

        {/* Interactive preview */}
        <UpgradePreview />

        {/* Feature cards — the specifics behind the preview */}
        <div className="upgradePaidLabel">$10/mo makes it yours:</div>
        <div className="upgradeGrid upgradeGridThree">
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

        {/* Pricing */}
        <div className="upgradePrice">
          <p className="upgradePriceAmount">$10/mo</p>
          <p className="upgradePriceNote">
            Cancel anytime. No contracts, no setup fees.
          </p>
        </div>

        {/* Existing-owner path — elevated, this is the primary conversion path */}
        <div className="upgradeExisting">
          <h2>Already have a Callie calendar?</h2>
          <p>
            Email{" "}
            <a href="mailto:hello@callietools.com?subject=Upgrade%20my%20calendar">
              hello@callietools.com
            </a>{" "}
            with your calendar name. We&rsquo;ll send a payment link and
            help you get your branding live &mdash; usually within a day
            or two.
          </p>
        </div>

        <div className="upgradeDivider" />

        {/* Cold visitor path — demoted below existing-owner */}
        <div className="upgradeNew">
          <p className="upgradeNewLabel">Don&rsquo;t have one yet?</p>
          <Link className="btn btnPrimary heroBtn" href="/create">
            Create your calendar &mdash; free
          </Link>
          <p className="upgradeNewNote">
            Start free, upgrade when you&rsquo;re ready.
          </p>
        </div>
      </div>
    </div>
  );
}
