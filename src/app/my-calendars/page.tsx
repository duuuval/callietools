"use client";

import { useState } from "react";

export default function MyCalendarsPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;

    setSending(true);
    try {
      await fetch("/api/my-calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
    } catch {
      // Swallow — we show the same confirmation regardless
    }
    setSending(false);
    setSubmitted(true);
  }

  return (
    <main className="main">
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card">
          <h1 className="createHeader">My Calendars</h1>
          <p className="createSubhead">
            Enter your email and we&rsquo;ll send a link to access all your calendars.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
              <div className="formGroup">
                <label className="formLabel" htmlFor="email">
                  Your email
                </label>
                <input
                  id="email"
                  className="formInput"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <p className="formHelper">
                  The email you used when creating your calendars.
                </p>
              </div>

              <button
                className="btn btnPrimary createSubmit"
                type="submit"
                disabled={sending}
              >
                {sending ? "Sending…" : "Send my link"}
              </button>
            </form>
          ) : (
            <div className="successLinkBox" style={{ marginTop: 20 }}>
              <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.5 }}>
                If that email has calendars associated with it, we sent you a link.
                Check your inbox.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
