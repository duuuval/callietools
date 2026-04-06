"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const slug = params.get("slug") || "";
  const email = params.get("email") || "";
  const token = params.get("token") || "";

  const calendarUrl = `https://callietools.com/${slug}`;
  const manageUrl = token
    ? `https://callietools.com/manage/${token}`
    : "";

  const handleShare = async () => {
    const shareData = {
      title: "Check out our calendar",
      text: `Subscribe once and every event shows up on your phone: ${calendarUrl}`,
      url: calendarUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or error — fall through to copy
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(calendarUrl);
      alert("Link copied!");
    } catch {
      window.prompt("Copy this link:", calendarUrl);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(calendarUrl);
      // Brief visual feedback handled by the button text swap below
    } catch {
      window.prompt("Copy this link:", calendarUrl);
    }
  };

  if (!slug) {
    return (
      <div className="container">
        <div className="card">
          <div className="error">
            Something went wrong — no calendar info found. Try creating again.
          </div>
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <a href="/create" className="btn btnPrimary">
              Create a calendar
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="createHeader">Your calendar is live!</h1>

        {/* Calendar link */}
        <div className="successLinkBox">
          <a
            href={calendarUrl}
            className="successLink"
            target="_blank"
            rel="noopener"
          >
            callietools.com/{slug}
          </a>
        </div>

        {/* Share CTA — the highest-intent moment */}
        <button
          type="button"
          className="btn btnPrimary createSubmit"
          onClick={handleShare}
        >
          Share your calendar with your group
        </button>

        <button
          type="button"
          className="btn btnSecondary createSubmit"
          onClick={handleCopy}
          style={{ marginTop: 8 }}
        >
          Copy link
        </button>

        <p className="formHelper" style={{ textAlign: "center", marginTop: 12 }}>
          Send this to your people — they subscribe once and stay updated
          automatically.
        </p>

        <div className="divider" />

        {/* Manage link */}
        {manageUrl && (
          <div style={{ marginBottom: 16 }}>
            <p className="formLabel">Manage your calendar</p>
            <a
              href={manageUrl}
              className="successManageLink"
            >
              Open manage page →
            </a>
            <p className="formHelper" style={{ marginTop: 6 }}>
              Bookmark this link to add, edit, or remove events anytime.
            </p>
          </div>
        )}

        {email && (
          <p className="formHelper">
            We sent your manage link to <strong>{email}</strong> — check your
            inbox.
          </p>
        )}

        <div className="divider" />

        {/* Upgrade nudge */}
        <p className="successUpgrade">
          Want your logo and colors on this page?{" "}
          <a href="mailto:hello@callietools.com">Make it yours — $10/month</a>
        </p>
      </div>

      <div className="calFooter">
        <p className="calFooterBrand">Callie</p>
        <p className="calFooterEmail">
          <a href="mailto:hello@callietools.com">hello@callietools.com</a>
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container">
          <div className="card">
            <p style={{ textAlign: "center", padding: 32 }}>Loading…</p>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
