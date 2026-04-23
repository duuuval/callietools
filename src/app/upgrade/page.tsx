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
    body: "Choose an accent color. Subscribe buttons, highlights, and links all update to match your brand.",
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
        {/* Hero — ownership-first, with anchor link for warm/ready-to-upgrade users */}
        <div className="upgradeHero">
          <h1>Make your calendar page yours</h1>
          <p>
            Your logo, your colors, your theme. Everything that already
            works about Callie stays exactly the same.
          </p>
          <p className="upgradeHeroAnchor">
            <a href="#upgrade">
              <em>Ready to upgrade? Here&rsquo;s how &rarr;</em>
            </a>
          </p>
        </div>

        {/* Interactive preview — now framed as a "try it on" moment */}
        <div className="upgradePreviewHeader">
          <h2>See how it feels</h2>
          <p>Tap a brand to try the colors and themes.</p>
        </div>
        <UpgradePreview />

        {/* Pricing — moved above features, headline absorbs "makes it yours" framing */}
        <div className="upgradePrice">
          <p className="upgradePriceAmount">$10/month makes it yours</p>
          <p className="upgradePriceNote">
            Cancel anytime. Usually live within a day or two.
          </p>
        </div>

        {/* Feature cards — the specifics behind the preview */}
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

        {/* Existing-owner path — elevated with primary button, this is the primary conversion path */}
        <div className="upgradeExisting" id="upgrade">
          <h2>Ready to upgrade your calendar?</h2>
          <p>
            Send us your calendar name and we&rsquo;ll reply with a
            payment link and next steps to get your branding live &mdash;
            usually within a day or two.
          </p>
          <a
            className="btn btnPrimary heroBtn"
            href="mailto:hello@callietools.com?subject=Upgrade%20my%20Callie%20calendar&body=Calendar%20name%3A%20%0A%0A(We%27ll%20reply%20with%20a%20payment%20link%20and%20next%20steps.)"
          >
            Email us to upgrade
          </a>
        </div>

        <div className="upgradeDivider" />

        {/* Cold visitor path — demoted below existing-owner with secondary button */}
        <div className="upgradeNew">
          <p className="upgradeNewLabel">Don&rsquo;t have one yet?</p>
          <Link className="btn btnSecondary heroBtn" href="/create">
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
