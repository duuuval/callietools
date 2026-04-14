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
            <img
              src="/callie-name.png"
              alt="Callie"
              height={28}
              style={{ height: "28px", width: "auto", display: "block", marginBottom: "4px" }}
            />
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
              <Link href="/create">Create your own calendar &mdash; free</Link>
            </span>
          </div>
        )}
      </div>
    </footer>
  );
}
