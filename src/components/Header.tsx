"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function Header() {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Close on resize to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 768) setOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <header className="siteHeader">
        <div className="container headerInner">
          <Link className="brand" href="/">
            <span className="brandMark" aria-hidden="true">
              ✨
            </span>
            <span className="brandName">Callie</span>
          </Link>

          <button
            className={`navToggle${open ? " isOpen" : ""}`}
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="siteNav"
            onClick={() => setOpen(!open)}
          >
            <span className="navToggleBars" aria-hidden="true" />
          </button>

          <nav
            className={`nav${open ? " isOpen" : ""}`}
            id="siteNav"
            ref={navRef}
            aria-label="Primary navigation"
          >
            <Link
              className="navLink"
              href="/support"
              onClick={() => setOpen(false)}
            >
              Support Callie
            </Link>
            <Link
              className="navLink navLinkPrimary"
              href="/calendar-concierge"
              onClick={() => setOpen(false)}
            >
              Calendar Concierge
            </Link>
          </nav>
        </div>
      </header>

      {/* Overlay */}
      <div
        className="navOverlay"
        hidden={!open}
        onClick={() => setOpen(false)}
      />
    </>
  );
}
