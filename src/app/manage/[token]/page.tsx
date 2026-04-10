"use client";

// src/app/manage/[token]/page.tsx

import { useState, useCallback, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────

interface EventRow {
  id: string; // client-side key only
  title: string;
  start_date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  showDetails: boolean;
}

interface CalendarMeta {
  id: string;
  name: string;
  tier: string;
  timezone: string;
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

// ─── Component ───────────────────────────────────────────────

export default function ManagePage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;

  // Load state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Calendar state
  const [calendar, setCalendar] = useState<CalendarMeta | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // ── Warn on unsaved changes ────────────────────────────────

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ── Load calendar + events on mount ───────────────────────

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/manage/${token}`);
        if (res.status === 404) {
          setLoadError("This manage link isn't valid. Check that you copied the full URL from your email.");
          return;
        }
        if (!res.ok) {
          setLoadError("Something went wrong loading your calendar. Please try again.");
          return;
        }
        const data = await res.json();
        setCalendar(data.calendar);
        setEvents(
          data.events.length > 0
            ? data.events
                .map(
                  (e: {
                    title: string;
                    start_date: string;
                    start_time: string;
                    end_time: string;
                    location: string;
                    description: string;
                  }) => ({
                    id: crypto.randomUUID(),
                    title: e.title,
                    start_date: e.start_date,
                    start_time: e.start_time || "",
                    end_time: e.end_time || "",
                    location: e.location || "",
                    description: e.description || "",
                    showDetails: !!(e.location || e.description),
                  })
                )
                .sort((a: EventRow, b: EventRow) => {
                  if (!a.start_date) return 1;
                  if (!b.start_date) return -1;
                  return a.start_date.localeCompare(b.start_date);
                })
            : [makeEmptyEvent()]
        );
      } catch {
        setLoadError("Something went wrong loading your calendar. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  // ── Event row helpers ──────────────────────────────────────

  const updateEvent = useCallback(
    (id: string, field: keyof EventRow, value: string | boolean) => {
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
      );
      setIsDirty(true);
    },
    []
  );

  const removeEvent = useCallback((id: string) => {
    setEvents((prev) => {
      const next = prev.filter((e) => e.id !== id);
      return next.length > 0 ? next : [makeEmptyEvent()];
    });
    setIsDirty(true);
  }, []);

  const addEvent = useCallback(() => {
    setEvents((prev) => [...prev, makeEmptyEvent()]);
    setIsDirty(true);
  }, []);

  // ── Save ──────────────────────────────────────────────────

  const handleSave = async () => {
    setSaveError("");
    setSaveSuccess(false);

    const validEvents = events.filter(
      (e) => e.title.trim() && e.start_date.trim()
    );

    if (validEvents.length === 0) {
      setSaveError("Add at least one event with a title and date.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/manage/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

      setIsDirty(false);
      setSaveSuccess(true);
      // Clear success message after 4 seconds
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render: loading ───────────────────────────────────────

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <p style={{ color: "var(--text-muted, #666)" }}>Loading your calendar…</p>
        </div>
      </div>
    );
  }

  // ── Render: error ─────────────────────────────────────────

  if (loadError) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: 12 }}>Manage link not found</h1>
          <p style={{ color: "var(--text-muted, #666)", marginBottom: 24 }}>{loadError}</p>
          <a href="/recover" className="btn btnPrimary" style={{ display: "inline-block" }}>
            Recover your manage link
          </a>
        </div>
      </div>
    );
  }

  // ── Render: manage form ───────────────────────────────────

  const calendarUrl = `https://callietools.com/${calendar?.id}`;

  return (
    <div className="container">
      <div className="card">
        {/* ── Header ──────────────────────────────────────── */}
        <div style={{ marginBottom: 4 }}>
          <h1 className="createHeader" style={{ marginBottom: 4 }}>
            {calendar?.name}
          </h1>
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "0.875rem", color: "#4F6BED" }}
          >
            View calendar page →
          </a>
        </div>

        <div className="divider" />

        {/* ── Events ──────────────────────────────────────── */}
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
                onChange={(e) =>
                  updateEvent(ev.id, "location", e.target.value)
                }
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

          <button type="button" className="addEventLink" onClick={addEvent}>
            + Add event
          </button>
        </div>

        <div className="divider" />

        {/* ── Save feedback ────────────────────────────────── */}
        {saveError && (
          <div className="error" style={{ marginBottom: 16 }}>
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 16px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              color: "#166534",
              fontSize: "0.9rem",
            }}
          >
            ✓ Changes saved — your calendar is updated.
          </div>
        )}

        {/* ── Save button ──────────────────────────────────── */}
        <button
          type="button"
          className="btn btnPrimary createSubmit"
          onClick={handleSave}
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>

        <div className="divider" />

        {/* ── Upgrade nudge ────────────────────────────────── */}
        <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#666" }}>
          Want your logo and colors on this page?{" "}
          <a href="/upgrade" style={{ color: "#D4775B", fontWeight: 500 }}>
            Make it yours — $10/month
          </a>
        </p>
      </div>
    </div>
  );
}
