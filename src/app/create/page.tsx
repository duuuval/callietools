"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────

interface EventRow {
  id: string; // client-side key
  title: string;
  start_date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  showDetails: boolean;
}

function makeEmptyEvent(): EventRow {
  return {
    id: crypto.randomUUID(),
    title: "",
    start_date: "",
    start_time: "",
    end_time: "",
    location: "",
    description: "",
    showDetails: false,
  };
}

// ─── Slug preview ────────────────────────────────────────────

function slugPreview(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "your-calendar";
}

// ─── Component ───────────────────────────────────────────────

export default function CreatePage() {
  const router = useRouter();

  // Form state
  const [calendarName, setCalendarName] = useState("");
  const [email, setEmail] = useState("");
  const [events, setEvents] = useState<EventRow[]>([
    makeEmptyEvent(),
    makeEmptyEvent(),
    makeEmptyEvent(),
  ]);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Event row helpers ──────────────────────────────────────

  const updateEvent = useCallback(
    (id: string, field: keyof EventRow, value: string | boolean) => {
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
      );
    },
    []
  );

  const removeEvent = useCallback((id: string) => {
    setEvents((prev) => {
      const next = prev.filter((e) => e.id !== id);
      // Always keep at least 1 row
      return next.length > 0 ? next : [makeEmptyEvent()];
    });
  }, []);

  const addEvent = useCallback(() => {
    setEvents((prev) => [...prev, makeEmptyEvent()]);
  }, []);

  // ── Submit ─────────────────────────────────────────────────

  const handleSubmit = async () => {
    setError("");

    // Client-side validation
    const name = calendarName.trim();
    if (!name) {
      setError("Give your calendar a name.");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email so we can send your manage link.");
      return;
    }

    // Filter to events that have at least a title and date
    const validEvents = events.filter(
      (e) => e.title.trim() && e.start_date.trim()
    );
    if (validEvents.length === 0) {
      setError("Add at least one event with a title and date.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: trimmedEmail,
          events: validEvents.map((e) => ({
            title: e.title.trim(),
            start_date: e.start_date,
            start_time: e.start_time || "",
            end_date: e.start_date, // v1: single-day events
            end_time: e.end_time || "",
            location: e.location.trim(),
            description: e.description.trim(),
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Something went wrong (${res.status}). Please try again.`
        );
      }

      const data = await res.json();

      // Redirect to confirmation page
      router.push(
        `/create/success?slug=${encodeURIComponent(data.slug)}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(trimmedEmail)}&token=${encodeURIComponent(data.manage_token)}`
      );

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────

  const slug = slugPreview(calendarName);

  return (
    <div className="container">
      <div className="card">
        {/* ── Confidence block ──────────────────────────── */}
        <h1 className="createHeader">Create your calendar</h1>
        <p className="createSubhead">
          Add your events, share the link — your people subscribe once and stay
          updated automatically.
        </p>

        <div className="divider" />

        {/* ── Flyer import (UI shell — not yet active) ── */}
        <div className="flyerUpload">
          <div className="flyerUploadInner">
            <div className="flyerIcon" aria-hidden="true">
              📄
            </div>
            <p className="flyerHeadline">
              Got a flyer or schedule? Upload it and Callie will pull your events
              out.
            </p>
            <p className="flyerFormats">JPEG, PNG, or PDF</p>
            <button type="button" className="btn btnSecondary" disabled>
              Coming soon
            </button>
          </div>
        </div>

        <div className="createOrDivider">
          <span>or add events manually</span>
        </div>

        {/* ── Calendar name ─────────────────────────────── */}
        <div className="formGroup">
          <label className="formLabel" htmlFor="cal-name">
            Calendar name
          </label>
          <input
            id="cal-name"
            type="text"
            className="formInput"
            placeholder="e.g., Crestwood Swim Team"
            value={calendarName}
            onChange={(e) => setCalendarName(e.target.value)}
            maxLength={100}
            autoComplete="off"
          />
          <div className="formHelper">
            This is the name people will see when they subscribe.
          </div>
          {calendarName.trim() && (
            <div className="slugPreview">
              callietools.com/<strong>{slug}</strong>
            </div>
          )}
        </div>

        {/* ── Email ─────────────────────────────────────── */}
        <div className="formGroup">
          <label className="formLabel" htmlFor="cal-email">
            Your email
          </label>
          <input
            id="cal-email"
            type="email"
            className="formInput"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <div className="formHelper">
            We&rsquo;ll send you a private link to manage your calendar. Not
            displayed publicly.
          </div>
        </div>

        <div className="divider" />

        {/* ── Events ────────────────────────────────────── */}
        <div className="formGroup">
          <label className="formLabel">Events</label>

          {events.map((ev, idx) => (
            <div key={ev.id} className="eventCard">
              <div className="eventCardHeader">
                <span className="eventCardNum">{idx + 1}</span>
                {events.length > 1 && (
                  <button
                    type="button"
                    className="eventCardRemove"
                    onClick={() => removeEvent(ev.id)}
                    aria-label={`Remove event ${idx + 1}`}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Title */}
              <input
                type="text"
                className="formInput"
                placeholder="Event title"
                value={ev.title}
                onChange={(e) => updateEvent(ev.id, "title", e.target.value)}
                autoComplete="off"
              />

              {/* Date + times row */}
              <div className="eventTimeRow">
                <div className="eventTimeField eventDateField">
                  <label className="formLabelSmall">Date</label>
                  <input
                    type="date"
                    className="formInput"
                    value={ev.start_date}
                    onChange={(e) =>
                      updateEvent(ev.id, "start_date", e.target.value)
                    }
                  />
                </div>
                <div className="eventTimeField">
                  <label className="formLabelSmall">Start</label>
                  <input
                    type="time"
                    className="formInput"
                    value={ev.start_time}
                    onChange={(e) =>
                      updateEvent(ev.id, "start_time", e.target.value)
                    }
                  />
                </div>
                <div className="eventTimeField">
                  <label className="formLabelSmall">End</label>
                  <input
                    type="time"
                    className="formInput"
                    value={ev.end_time}
                    onChange={(e) =>
                      updateEvent(ev.id, "end_time", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Location */}
              <input
                type="text"
                className="formInput"
                placeholder="Location (optional)"
                value={ev.location}
                onChange={(e) => updateEvent(ev.id, "location", e.target.value)}
                autoComplete="off"
              />

              {/* Description toggle */}
              <button
                type="button"
                className="eventDetailsToggle"
                onClick={() =>
                  updateEvent(ev.id, "showDetails", !ev.showDetails)
                }
              >
                {ev.showDetails ? "− Hide details" : "+ More details"}
              </button>

              {ev.showDetails && (
                <textarea
                  className="formInput formTextarea"
                  placeholder="Description (optional)"
                  rows={3}
                  value={ev.description}
                  onChange={(e) =>
                    updateEvent(ev.id, "description", e.target.value)
                  }
                />
              )}
            </div>
          ))}

          <button
            type="button"
            className="addEventLink"
            onClick={addEvent}
          >
            + Add event
          </button>
        </div>

        <div className="divider" />

        {/* ── Error ─────────────────────────────────────── */}
        {error && (
          <div className="error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* ── Submit ────────────────────────────────────── */}
        <button
          type="button"
          className="btn btnPrimary createSubmit"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Creating…" : "Create my calendar"}
        </button>
      </div>

      {/* ── Page footer ─────────────────────────────────── */}
      <div className="calFooter">
        <p className="calFooterBrand">Callie</p>
        <p className="calFooterEmail">
          <a href="mailto:hello@callietools.com">hello@callietools.com</a>
        </p>
      </div>
    </div>
  );
}
