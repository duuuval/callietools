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
    <main className="formPage">
      <div className="formCard">
        <h1 className="formTitle">My Calendars</h1>
        <p className="formSubtitle">
          Enter your email and we&rsquo;ll send a link to access all your calendars.
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <label className="fieldLabel" htmlFor="email">
              Your email
            </label>
            <input
              id="email"
              className="fieldInput"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <p className="fieldHelper">
              The email you used when creating your calendars.
            </p>

            <button
              className="btnPrimary"
              type="submit"
              disabled={sending}
              style={{ width: "100%", marginTop: 16 }}
            >
              {sending ? "Sending…" : "Send my link"}
            </button>
          </form>
        ) : (
          <div className="confirmationBox">
            <p>
              If that email has calendars associated with it, we sent you a link.
              Check your inbox.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
