"use client";

import { useState, useCallback, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────

interface EventRow {
  id: string;
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
  accentColor?: string;
  theme?: string;
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

// Curated swatches — intentional palette, not a full picker
const COLOR_SWATCHES = [
  { hex: "#4F6BED", label: "Callie Blue" },
  { hex: "#D4775B", label: "Coral" },
  { hex: "#2D6A4F", label: "Forest" },
  { hex: "#5E548E", label: "Violet" },
  { hex: "#E07A5F", label: "Terracotta" },
  { hex: "#3A86FF", label: "Sky" },
  { hex: "#2B9348", label: "Emerald" },
  { hex: "#C77DFF", label: "Lavender" },
  { hex: "#F4A261", label: "Amber" },
  { hex: "#1D3557", label: "Navy" },
  { hex: "#E63946", label: "Red" },
  { hex: "#333333", label: "Charcoal" },
];

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

  // Branding state
  const [accentColor, setAccentColor] = useState("");
  const [hexInput, setHexInput] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [brandingDirty, setBrandingDirty] = useState(false);
  const [brandingSubmitting, setBrandingSubmitting] = useState(false);
  const [brandingSaveError, setBrandingSaveError] = useState("");
  const [brandingSaveSuccess, setBrandingSaveSuccess] = useState(false);

  // Events UI state
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const isPaid = calendar?.tier === "paid";

  // ── Warn on unsaved changes ────────────────────────────────

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty || brandingDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, brandingDirty]);

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

        // Seed branding state from loaded values
        const color = data.calendar.accentColor || "";
        setAccentColor(color);
        setHexInput(color);
        setTheme(data.calendar.theme === "dark" ? "dark" : "light");

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

  // ── Branding helpers ───────────────────────────────────────

  const handleSwatchClick = (hex: string) => {
    setAccentColor(hex);
    setHexInput(hex);
    setBrandingDirty(true);
  };

  const handleHexInput = (val: string) => {
    setHexInput(val);
    // Only apply if valid 6-digit hex
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setAccentColor(val);
    }
    setBrandingDirty(true);
  };

  const handleThemeToggle = (val: "light" | "dark") => {
    setTheme(val);
    setBrandingDirty(true);
  };

  const handleBrandingSave = async () => {
    setBrandingSaveError("");
    setBrandingSaveSuccess(false);

    if (accentColor && !/^#[0-9A-Fa-f]{6}$/.test(accentColor)) {
      setBrandingSaveError("Enter a valid hex color like #4F6BED");
      return;
    }

    setBrandingSubmitting(true);
    try {
      const res = await fetch(`/api/manage/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accentColor, theme }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setBrandingDirty(false);
      setBrandingSaveSuccess(true);
      setTimeout(() => setBrandingSaveSuccess(false), 4000);
    } catch (err) {
      setBrandingSaveError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setBrandingSubmitting(false);
    }
  };

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

  // ── Save events ───────────────────────────────────────────

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
            end_date: e.start_date,
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

  // ── Derived values ────────────────────────────────────────

  const calendarUrl = `https://callietools.com/${calendar?.id}`;
  const logoPath = `/logos/${calendar?.id}.png`;
  // Apply their accent color to primary buttons on the manage page
  const accentStyle = accentColor
    ? { backgroundColor: accentColor, borderColor: accentColor }
    : {};

  // ── Render: manage form ───────────────────────────────────

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

        {/* ── Branding section (paid only) ─────────────────── */}
        {isPaid && (
          <>
            <div className="formGroup">
              <label className="formLabel">Your branding</label>

              {/* Logo display */}
              <div style={{
                marginBottom: 20,
                padding: "16px",
                background: "var(--color-surface-alt, #f9f9f9)",
                borderRadius: 8,
                border: "1px solid var(--color-border, #eee)",
              }}>
                <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: 10, fontWeight: 500 }}>
                  Your logo
                </p>
                {/* Attempt to render logo — if file doesn't exist yet, show placeholder */}
                <img
                  src={logoPath}
                  alt={`${calendar?.name} logo`}
                  style={{ maxHeight: 56, maxWidth: 180, objectFit: "contain", display: "block" }}
                  onError={(e) => {
                    // Hide broken image and show placeholder text
                    const target = e.currentTarget;
                    target.style.display = "none";
                    const placeholder = target.nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = "block";
                  }}
                />
                <p
                  style={{
                    display: "none",
                    fontSize: "0.8rem",
                    color: "#999",
                    fontStyle: "italic",
                  }}
                >
                  Logo not uploaded yet — email your file (transparent PNG or SVG) to{" "}
                  <a href="mailto:hello@callietools.com" style={{ color: "#4F6BED" }}>
                    hello@callietools.com
                  </a>
                </p>
              </div>

              {/* Accent color */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: 8, fontWeight: 500 }}>
                  Accent color
                </p>
                {/* Swatches */}
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 10,
                }}>
                  {COLOR_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      title={swatch.label}
                      onClick={() => handleSwatchClick(swatch.hex)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: swatch.hex,
                        border: accentColor === swatch.hex
                          ? "3px solid #333"
                          : "2px solid transparent",
                        outline: accentColor === swatch.hex
                          ? "2px solid #fff"
                          : "none",
                        cursor: "pointer",
                        padding: 0,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                      }}
                      aria-label={swatch.label}
                    />
                  ))}
                </div>
                {/* Hex input */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {accentColor && (
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: accentColor,
                      border: "1px solid rgba(0,0,0,0.1)",
                      flexShrink: 0,
                    }} />
                  )}
                  <input
                    type="text"
                    className="formInput"
                    placeholder="#4F6BED"
                    value={hexInput}
                    onChange={(e) => handleHexInput(e.target.value)}
                    style={{ maxWidth: 120, fontFamily: "monospace", fontSize: "0.875rem" }}
                    maxLength={7}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#999" }}>
                    or pick a color above
                  </span>
                </div>
              </div>

              {/* Theme toggle */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: 8, fontWeight: 500 }}>
                  Page theme
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleThemeToggle("light")}
                    style={{
                      padding: "8px 20px",
                      borderRadius: 6,
                      border: theme === "light" ? "2px solid #333" : "2px solid #ddd",
                      background: theme === "light" ? "#fff" : "transparent",
                      fontWeight: theme === "light" ? 600 : 400,
                      cursor: "pointer",
                      fontSize: "0.875rem",
                    }}
                  >
                    ☀️ Light
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeToggle("dark")}
                    style={{
                      padding: "8px 20px",
                      borderRadius: 6,
                      border: theme === "dark" ? "2px solid #333" : "2px solid #ddd",
                      background: theme === "dark" ? "#1a1a1a" : "transparent",
                      color: theme === "dark" ? "#f0f0f0" : "inherit",
                      fontWeight: theme === "dark" ? 600 : 400,
                      cursor: "pointer",
                      fontSize: "0.875rem",
                    }}
                  >
                    🌙 Dark
                  </button>
                </div>
              </div>

              {/* Branding save feedback */}
              {brandingSaveError && (
                <div className="error" style={{ marginBottom: 12 }}>
                  {brandingSaveError}
                </div>
              )}
              {brandingSaveSuccess && (
                <div style={{
                  marginBottom: 12,
                  padding: "10px 14px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 8,
                  color: "#166534",
                  fontSize: "0.875rem",
                }}>
                  ✓ Branding saved — view your calendar page to see changes.
                </div>
              )}

              <button
                type="button"
                className="btn btnPrimary"
                onClick={handleBrandingSave}
                disabled={brandingSubmitting || !brandingDirty}
                style={{
                  ...accentStyle,
                  opacity: (!brandingDirty || brandingSubmitting) ? 0.6 : 1,
                }}
              >
                {brandingSubmitting ? "Saving…" : "Save branding"}
              </button>
            </div>

            <div className="divider" />
          </>
        )}

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

              <input
                type="text"
                className="formInput"
                placeholder="Event title"
                value={ev.title}
                onChange={(e) => updateEvent(ev.id, "title", e.target.value)}
                autoComplete="off"
              />

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
          <div style={{
            marginBottom: 16,
            padding: "12px 16px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
            color: "#166534",
            fontSize: "0.9rem",
          }}>
            ✓ Changes saved — your calendar is updated.
          </div>
        )}

        {/* ── Save button ──────────────────────────────────── */}
        <button
          type="button"
          className="btn btnPrimary createSubmit"
          onClick={handleSave}
          disabled={submitting}
          style={accentStyle}
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>

        {/* ── Upgrade nudge (free only) ────────────────────── */}
        {!isPaid && (
          <>
            <div className="divider" />
            <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#666" }}>
              Want your logo and colors on this page?{" "}
              <a href="/upgrade" style={{ color: "#D4775B", fontWeight: 500 }}>
                Make it yours — $10/month
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
