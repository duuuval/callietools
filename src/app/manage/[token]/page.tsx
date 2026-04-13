"use client";

import { useState, useCallback, useEffect, useRef } from "react";

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
  logoUrl?: string;
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

function makeEventFromParse(e: {
  title?: string;
  start_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;
}): EventRow {
  return {
    id: crypto.randomUUID(),
    title: e.title || "",
    start_date: e.start_date || "",
    start_time: e.start_time || "",
    end_time: e.end_time || "",
    location: e.location || "",
    description: e.description || "",
    showDetails: !!(e.location || e.description),
  };
}

function isPastEvent(ev: EventRow): boolean {
  if (!ev.start_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const evDate = new Date(ev.start_date + "T00:00:00");
  return evDate < today;
}

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1600;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file),
        "image/jpeg", 0.88
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

const PARSE_PHRASES = [
  "Reading your image…",
  "Finding your events…",
  "Almost there…",
];

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

function isLightColor(hex: string): boolean {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

export default function ManagePage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [calendar, setCalendar] = useState<CalendarMeta | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [pastExpanded, setPastExpanded] = useState(false);

  // ── Flyer import state ──
  const [parseStatus, setParseStatus] = useState<"idle" | "parsing" | "success" | "error">("idle");
  const [parseMessage, setParseMessage] = useState("");
  const [parsePhrase, setParsePhrase] = useState(PARSE_PHRASES[0]);
  const [parsePhraseVisible, setParsePhraseVisible] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const parsePhraseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [accentColor, setAccentColor] = useState("");
  const [hexInput, setHexInput] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [brandingDirty, setBrandingDirty] = useState(false);
  const [brandingSubmitting, setBrandingSubmitting] = useState(false);
  const [brandingSaveError, setBrandingSaveError] = useState("");
  const [brandingSaveSuccess, setBrandingSaveSuccess] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const isPaid = calendar?.tier === "paid";
  const buttonTextColor = isLightColor(accentColor) ? "#000" : "#fff";

  const previewBg = theme === "dark" ? "#1a1a1a" : "#ffffff";
  const previewBorder = theme === "dark" ? "#3a3a3a" : "#e5e5e5";
  const previewSecondaryBg = theme === "dark" ? "#242424" : "#ffffff";
  const previewSecondaryBorder = theme === "dark" ? "#3a3a3a" : "#e0e0e0";
  const previewSecondaryText = theme === "dark" ? accentColor || "#4F6BED" : accentColor || "#4F6BED";

  // ── Derived: split events into upcoming and past ──
  const upcomingEvents = events.filter((e) => !isPastEvent(e));
  const pastEvents = events.filter((e) => isPastEvent(e));

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty || brandingDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, brandingDirty]);

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
        const color = data.calendar.accentColor || "";
        setAccentColor(color);
        setHexInput(color);
        setTheme(data.calendar.theme === "dark" ? "dark" : "light");
        setEvents(
          data.events.length > 0
            ? data.events
                .map((e: {
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
                }))
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

  // ── Parse phrase animation ──
  useEffect(() => {
    parsePhraseTimers.current.forEach(clearTimeout);
    parsePhraseTimers.current = [];
    if (parseStatus !== "parsing") return;
    PARSE_PHRASES.forEach((_, i) => {
      if (i === 0) return;
      const delay = i * 2200;
      const t = setTimeout(() => {
        setParsePhraseVisible(false);
        const swap = setTimeout(() => {
          setParsePhrase(PARSE_PHRASES[i]);
          setParsePhraseVisible(true);
        }, 300);
        parsePhraseTimers.current.push(swap);
      }, delay);
      parsePhraseTimers.current.push(t);
    });
    return () => { parsePhraseTimers.current.forEach(clearTimeout); };
  }, [parseStatus]);

  // ── Flyer import ──
  const handleFile = useCallback(async (file: File) => {
    if (parseStatus === "parsing") return;
    setParseStatus("parsing");
    setParseMessage("");
    setParsePhrase(PARSE_PHRASES[0]);
    setParsePhraseVisible(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressed);
      const res = await fetch("/api/parse-flyer", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setParseStatus("error");
        setParseMessage(data.error || "We couldn't read that. Try a sharper image, or add events manually below.");
        return;
      }
      const parsedEvents: EventRow[] = data.events.map(makeEventFromParse);
      setEvents((prev) => {
      const nonEmpty = prev.filter((e) => e.title.trim() || e.start_date.trim());
      return [...parsedEvents, ...nonEmpty].sort((a, b) => {
          if (!a.start_date) return 1;
          if (!b.start_date) return -1;
          return a.start_date.localeCompare(b.start_date);
        });
      });
      setIsDirty(true);
      setParseStatus("success");
      setParseMessage(
        `We added ${parsedEvents.length} event${parsedEvents.length !== 1 ? "s" : ""} from your upload — review below, then save your calendar.`
      );
    } catch {
      setParseStatus("error");
      setParseMessage("Something went wrong. Try again or add events manually below.");
    }
  }, [parseStatus]);

  const triggerFilePicker = () => fileInputRef.current?.click();

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  // ── Branding handlers ──
  const handleSwatchClick = (hex: string) => {
    setAccentColor(hex);
    setHexInput(hex);
    setBrandingDirty(true);
  };

  const handleHexInput = (val: string) => {
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) setAccentColor(val);
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

  // ── Event handlers ──
  const updateEvent = useCallback(
    (id: string, field: keyof EventRow, value: string | boolean) => {
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
      setIsDirty(true);
    }, []
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

  const handleSave = async () => {
    setSaveError("");
    setSaveSuccess(false);
    const validEvents = events.filter((e) => e.title.trim() && e.start_date.trim());
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
        throw new Error(data.error || `Something went wrong (${res.status}). Please try again.`);
      }
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Shared event card renderer ──
  function renderEventCard(ev: EventRow, globalIdx: number) {
    return (
      <div key={ev.id} className="eventCard">
        <div className="eventCardHeader">
          <span className="eventCardNum">{globalIdx + 1}</span>
          {events.length > 1 && (
            <button
              type="button"
              className="eventCardRemove"
              onClick={() => removeEvent(ev.id)}
              aria-label={`Remove event ${globalIdx + 1}`}
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
              onChange={(e) => updateEvent(ev.id, "start_date", e.target.value)}
            />
          </div>
          <div className="eventTimeField">
            <label className="formLabelSmall">Start</label>
            <input
              type="time"
              className="formInput"
              value={ev.start_time}
              onChange={(e) => updateEvent(ev.id, "start_time", e.target.value)}
            />
          </div>
          <div className="eventTimeField">
            <label className="formLabelSmall">End</label>
            <input
              type="time"
              className="formInput"
              value={ev.end_time}
              onChange={(e) => updateEvent(ev.id, "end_time", e.target.value)}
            />
          </div>
        </div>

        <input
          type="text"
          className="formInput"
          placeholder="Location (optional)"
          value={ev.location}
          onChange={(e) => updateEvent(ev.id, "location", e.target.value)}
          autoComplete="off"
        />

        <button
          type="button"
          className="eventDetailsToggle"
          onClick={() => updateEvent(ev.id, "showDetails", !ev.showDetails)}
        >
          {ev.showDetails ? "− Hide details" : "+ More details"}
        </button>

        {ev.showDetails && (
          <textarea
            className="formInput formTextarea"
            placeholder="Description (optional)"
            rows={3}
            value={ev.description}
            onChange={(e) => updateEvent(ev.id, "description", e.target.value)}
          />
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <p style={{ color: "var(--text-muted, #666)" }}>Loading your calendar…</p>
        </div>
      </div>
    );
  }

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

  const calendarUrl = `https://callietools.com/${calendar?.id}`;
  const logoUrl = calendar?.logoUrl || null;
  const accentStyle = accentColor
    ? { backgroundColor: accentColor, borderColor: accentColor, color: buttonTextColor }
    : {};

  return (
    <div className="container">
      <div className="card">

        {/* ── Header ── */}
        <div style={{ marginBottom: 4 }}>
          <h1 className="createHeader" style={{ marginBottom: 4 }}>{calendar?.name}</h1>
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

        {/* ── Branding section (paid only) ── */}
        {isPaid && (
          <>
            <div className="formGroup">
              <label className="formLabel">Your branding</label>

              <div style={{
                marginBottom: 20,
                padding: "20px",
                background: previewBg,
                borderRadius: 10,
                border: `1px solid ${previewBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                transition: "background 0.2s, border-color 0.2s",
              }}>
                <div style={{ flexShrink: 0 }}>
                  {logoUrl ? (
                    <>
                      <img
                        src={logoUrl}
                        alt={`${calendar?.name} logo`}
                        style={{ maxHeight: 64, maxWidth: 140, objectFit: "contain", display: "block" }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const el = e.currentTarget.nextElementSibling as HTMLElement;
                          if (el) el.style.display = "block";
                        }}
                      />
                      <p style={{ display: "none", fontSize: "0.75rem", color: "#999", fontStyle: "italic" }}>
                        Logo not found
                      </p>
                    </>
                  ) : (
                    <p style={{ fontSize: "0.8rem", color: theme === "dark" ? "#666" : "#bbb", fontStyle: "italic", maxWidth: 140 }}>
                      Logo not uploaded yet —{" "}
                      <a href="mailto:hello@callietools.com" style={{ color: "#4F6BED" }}>email us your file</a>
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <span style={{ fontSize: "0.7rem", color: theme === "dark" ? "#666" : "#bbb", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                    Your buttons
                  </span>
                  <div style={{ padding: "8px 18px", borderRadius: 6, background: accentColor || "#4F6BED", border: `1px solid ${accentColor || "#4F6BED"}`, color: buttonTextColor, fontSize: "0.875rem", fontWeight: 500, whiteSpace: "nowrap" }}>
                    Sync to Calendar
                  </div>
                  <div style={{ padding: "8px 18px", borderRadius: 6, background: previewSecondaryBg, border: `1px solid ${previewSecondaryBorder}`, color: previewSecondaryText, fontSize: "0.875rem", fontWeight: 500, whiteSpace: "nowrap" }}>
                    Copy link
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: 8, fontWeight: 500 }}>Page theme</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => handleThemeToggle("light")} style={{ padding: "8px 20px", borderRadius: 6, border: theme === "light" ? "2px solid #333" : "2px solid #ddd", background: theme === "light" ? "#fff" : "transparent", fontWeight: theme === "light" ? 600 : 400, cursor: "pointer", fontSize: "0.875rem" }}>
                    ☀️ Light
                  </button>
                  <button type="button" onClick={() => handleThemeToggle("dark")} style={{ padding: "8px 20px", borderRadius: 6, border: theme === "dark" ? "2px solid #333" : "2px solid #ddd", background: theme === "dark" ? "#1a1a1a" : "transparent", color: theme === "dark" ? "#f0f0f0" : "inherit", fontWeight: theme === "dark" ? 600 : 400, cursor: "pointer", fontSize: "0.875rem" }}>
                    🌙 Dark
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: 8, fontWeight: 500 }}>Accent color</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  {COLOR_SWATCHES.map((swatch) => (
                    <button key={swatch.hex} type="button" title={swatch.label} onClick={() => handleSwatchClick(swatch.hex)} style={{ width: 28, height: 28, borderRadius: "50%", background: swatch.hex, border: accentColor === swatch.hex ? "3px solid #333" : "2px solid transparent", outline: accentColor === swatch.hex ? "2px solid #fff" : "none", cursor: "pointer", padding: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} aria-label={swatch.label} />
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {accentColor && (
                    <div style={{ width: 24, height: 24, borderRadius: 4, background: accentColor, border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
                  )}
                  <input type="text" className="formInput" placeholder="#4F6BED" value={hexInput} onChange={(e) => handleHexInput(e.target.value)} style={{ maxWidth: 120, fontFamily: "monospace", fontSize: "0.875rem" }} maxLength={7} autoComplete="off" spellCheck={false} />
                  <span style={{ fontSize: "0.75rem", color: "#999" }}>or pick a color above</span>
                </div>
              </div>

              {brandingSaveError && <div className="error" style={{ marginBottom: 12 }}>{brandingSaveError}</div>}
              {brandingSaveSuccess && (
                <div style={{ marginBottom: 12, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, color: "#166534", fontSize: "0.875rem" }}>
                  ✓ Branding saved — view your calendar page to see changes.
                </div>
              )}

              <button type="button" className="btn btnPrimary" onClick={handleBrandingSave} disabled={brandingSubmitting || !brandingDirty} style={{ ...accentStyle, opacity: (!brandingDirty || brandingSubmitting) ? 0.6 : 1 }}>
                {brandingSubmitting ? "Saving…" : "Save branding"}
              </button>
            </div>

            <div className="divider" />
          </>
        )}

        {/* ── Events ── */}
        <div className="formGroup">
          <label className="formLabel">Events</label>

          {/* ── Flyer import ── */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted, #666)", marginBottom: 12, lineHeight: 1.5 }}>
              Have more events coming up? Upload an image and they'll be added to your calendar. New events show up on subscribed calendars automatically.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleFileInput}
            />

            <div
              className={`flyerUpload${dragOver ? " flyerUploadDragOver" : ""}${parseStatus === "parsing" ? " flyerUploadParsing" : ""}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={triggerFilePicker}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && triggerFilePicker()}
              style={{ cursor: parseStatus === "parsing" ? "wait" : "pointer" }}
            >
              <div className="flyerUploadInner">

                {parseStatus === "idle" && (
                  <>
                    <div className="flyerIcon" aria-hidden="true">📄</div>
                    <p className="flyerHeadline">Upload an image of your events</p>
                    <p className="flyerFormats">JPEG, PNG, or WEBP</p>
                    <button type="button" className="btn btnSecondary" onClick={(e) => { e.stopPropagation(); triggerFilePicker(); }}>
                      Upload image
                    </button>
                  </>
                )}

                {parseStatus === "parsing" && (
                  <div className="parseLoading">
                    <div className="parseMascotWrap" aria-hidden="true">
                      <span className="parseSpark parseSpark1" />
                      <span className="parseSpark parseSpark2" />
                      <span className="parseSpark parseSpark3" />
                      <span className="parseSpark parseSpark4" />
                      <img src="/callie-mascot.png" alt="" className="parseMascot" />
                    </div>
                    <p className="parsePhrase" style={{ opacity: parsePhraseVisible ? 1 : 0 }}>
                      {parsePhrase}
                    </p>
                    <div className="parseDots" aria-label="Loading">
                      <span className="parseDot" />
                      <span className="parseDot" />
                      <span className="parseDot" />
                    </div>
                  </div>
                )}

                {parseStatus === "success" && (
                  <>
                    <div className="flyerIcon" aria-hidden="true">✅</div>
                    <p className="flyerHeadline">{parseMessage}</p>
                    <button type="button" className="btn btnSecondary" onClick={(e) => { e.stopPropagation(); triggerFilePicker(); }}>
                      Upload another image
                    </button>
                  </>
                )}

                {parseStatus === "error" && (
                  <>
                    <div className="flyerIcon" aria-hidden="true">📄</div>
                    <p className="flyerHeadline" style={{ color: "var(--color-error, #c0392b)" }}>
                      {parseMessage}
                    </p>
                    <button type="button" className="btn btnSecondary" onClick={(e) => { e.stopPropagation(); triggerFilePicker(); }}>
                      Try again
                    </button>
                  </>
                )}

              </div>
            </div>

            <div className="createOrDivider">
              <span>or add events manually</span>
            </div>
          </div>

          {/* ── Upcoming events ── */}
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((ev) =>
              renderEventCard(ev, events.indexOf(ev))
            )
          ) : (
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted, #999)", marginBottom: 16, fontStyle: "italic" }}>
              No upcoming events — add one below or upload more events above.
            </p>
          )}

          <button type="button" className="addEventLink" onClick={addEvent}>
            + Add event
          </button>

          {/* ── Past events collapsible ── */}
          {pastEvents.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <button
                type="button"
                onClick={() => setPastExpanded((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 0",
                  fontSize: "0.875rem",
                  color: "var(--text-muted, #666)",
                  fontWeight: 500,
                }}
              >
                <span style={{ display: "inline-block", transform: pastExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
                {pastEvents.length} past event{pastEvents.length !== 1 ? "s" : ""}
                <span style={{ fontWeight: 400 }}>— {pastExpanded ? "hide" : "show"}</span>
              </button>

              {pastExpanded && (
                <div style={{ marginTop: 8 }}>
                  {pastEvents.map((ev) =>
                    renderEventCard(ev, events.indexOf(ev))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="divider" />

        {saveError && <div className="error" style={{ marginBottom: 16 }}>{saveError}</div>}
        {saveSuccess && (
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, color: "#166534", fontSize: "0.9rem" }}>
            ✓ Changes saved — your calendar is updated.
          </div>
        )}

        <button
          type="button"
          className="btn btnPrimary createSubmit"
          onClick={handleSave}
          disabled={submitting}
          style={accentStyle}
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>

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
