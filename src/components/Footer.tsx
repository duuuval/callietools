"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  const isUpgrade = pathname === "/upgrade";

  return (
    <footer className="siteFooter">
      <div className="container footerInner">
        <div className="footerRow">
          <div className="footerLeft">
            <div className="footerBrand">Callie</div>
            <div className="footerMini">
              Your events, on everyone&apos;s phone<span style={{ color: "var(--accent)" }}>.</span>
            </div>
          </div>
          <a className="footerLink" href="mailto:hello@callietools.com">
            hello@callietools.com
          </a>
        </div>
        {!isUpgrade && (
          <div className="footerRow">
            <span className="footerUpgrade">
              Want your own logo and colors on your calendar page?{" "}
              <Link href="/upgrade">Make it yours &mdash; $10/mo</Link>
            </span>
          </div>
        )}
      </div>
    </footer>
  );
}
