"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  confidence?: "high" | "medium" | "low";
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

function makeEventFromParse(raw: {
  title: string;
  start_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  confidence: "high" | "medium" | "low";
}): EventRow {
  return {
    id: crypto.randomUUID(),
    title: raw.title ?? "",
    start_date: raw.start_date ?? "",
    start_time: raw.start_time ?? "",
    end_time: raw.end_time ?? "",
    location: raw.location ?? "",
    description: raw.description ?? "",
    showDetails: !!(raw.description),
    confidence: raw.confidence,
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

// ─── Image compression ───────────────────────────────────────

async function compressImage(file: File, maxDimension = 1600, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file),
        "image/jpeg",
        quality
      );
    };
    img.src = url;
  });
}

// ─── Timezone options ────────────────────────────────────────

const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
];

function tzLabel(value: string): string {
  return US_TIMEZONES.find((t) => t.value === value)?.label ?? "Eastern";
}

// Map browser timezone to closest US timezone in the list above.
// If the browser returns something not in the list, default to Eastern.
function detectBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (US_TIMEZONES.some((t) => t.value === tz)) return tz;
  } catch {
    // ignore
  }
  return "America/New_York";
}

// ─── Parse loading phrases ───────────────────────────────────

const PARSE_PHRASES = [
  "Reading your image…",
  "Finding your events…",
  "Starting your calendar…",
  "Still working on it…",
  "Still working — promise!",
];

const PHRASE_DELAYS = [0, 3000, 7000, 13000, 20000];

// ─── Date/time formatting for preview list ──────────────────

function formatPreviewDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatPreviewTime(time24: string): string {
  if (!time24 || !/^\d{2}:\d{2}$/.test(time24)) return "";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  if (m === 0) return `${hour12}${period}`;
  return `${hour12}:${String(m).padStart(2, "0")}${period}`;
}

const PREVIEW_VISIBLE_COUNT = 5;

// ─── Component ───────────────────────────────────────────────

export default function CreatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [calendarName, setCalendarName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [events, setEvents] = useState<EventRow[]>([
    makeEmptyEvent(),
    makeEmptyEvent(),
    makeEmptyEvent(),
  ]);

  // Flyer import state
  const [parseStatus, setParseStatus] = useState<"idle" | "parsing" | "success" | "error">("idle");
  const [parseMessage, setParseMessage] = useState("");
  const [parseSubline, setParseSubline] = useState("");
  const [parsedCount, setParsedCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Manual entry expansion (only relevant when no parse has happened)
  const [manualExpanded, setManualExpanded] = useState(false);

  // Timezone editor expansion (only on claim form)
  const [tzEditorOpen, setTzEditorOpen] = useState(false);

  // Parse loading phrase state
  const [parsePhrase, setParsePhrase] = useState(PARSE_PHRASES[0]);
  const [parsePhraseVisible, setParsePhraseVisible] = useState(true);
  const parsePhraseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Detect browser timezone on mount ──────────────────────

  useEffect(() => {
    setTimezone(detectBrowserTimezone());
  }, []);

  // ── Phrase sequencer ───────────────────────────────────────

  useEffect(() => {
    parsePhraseTimers.current.forEach(clearTimeout);
    parsePhraseTimers.current = [];

    if (parseStatus !== "parsing") {
      setParsePhrase(PARSE_PHRASES[0]);
      setParsePhraseVisible(true);
      return;
    }

    setParsePhrase(PARSE_PHRASES[0]);
    setParsePhraseVisible(true);

    PARSE_PHRASES.slice(1).forEach((_, idx) => {
      const i = idx + 1;
      const t = setTimeout(() => {
        setParsePhraseVisible(false);
        const swap = setTimeout(() => {
          setParsePhrase(PARSE_PHRASES[i]);
          setParsePhraseVisible(true);
        }, 300);
        parsePhraseTimers.current.push(swap);
      }, PHRASE_DELAYS[i]);
      parsePhraseTimers.current.push(t);
    });

    return () => {
      parsePhraseTimers.current.forEach(clearTimeout);
    };
  }, [parseStatus]);

  // ── Flyer import ───────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (parseStatus === "parsing") return;

    setParseStatus("parsing");
    setParseMessage("");

    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressed);

      const res = await fetch("/api/parse-flyer", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setParseStatus("error");
        setParseMessage(data.error || "We couldn't read that image.");
        setParseSubline(
          data.hint ||
            "Try a clearer photo, or one that shows dates and times — flyers, schedules, and screenshots all work."
        );
        return;
      }

      const parsedEvents: EventRow[] = data.events.map(makeEventFromParse);

      if (!calendarName.trim() && data.calendar_name) {
        setCalendarName(data.calendar_name);
      }

      setEvents((prev) => {
        const userFilled = prev.filter(
          (e) => e.title.trim() || e.start_date.trim()
        );
        return [...parsedEvents, ...userFilled];
      });

      setParsedCount(parsedEvents.length);
      setParseStatus("success");
      setParseMessage("");
      setParseSubline("");
    } catch {
      setParseStatus("error");
      setParseMessage("Something went wrong on our end.");
      setParseSubline("Try again, or add events manually below.");
    }
  }, [parseStatus, calendarName]);

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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const triggerFilePicker = useCallback(() => {
    if (parseStatus === "parsing") return;
    fileInputRef.current?.click();
  }, [parseStatus]);

  // Reset back to idle (used by "try again" link below preview)
  const resetToIdle = useCallback(() => {
    setParseStatus("idle");
    setParseMessage("");
    setParsedCount(0);
    setEvents([makeEmptyEvent(), makeEmptyEvent(), makeEmptyEvent()]);
    setError("");
  }, []);

  // ── Event row helpers (manual entry only) ──────────────────

  const updateEvent = useCallback(
    (id: string, field: keyof EventRow, value: string | boolean) => {
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== id) return e;
          const updated = { ...e, [field]: value };
          if (field === "start_time" && typeof value === "string" && value) {
            if (!e.end_time) {
              const [h, m] = value.split(":").map(Number);
              const endH = (h + 1) % 24;
              updated.end_time = `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            }
          }
          return updated;
        })
      );
    },
    []
  );

  const removeEvent = useCallback((id: string) => {
    setEvents((prev) => {
      const next = prev.filter((e) => e.id !== id);
      return next.length > 0 ? next : [makeEmptyEvent()];
    });
  }, []);

  const addEvent = useCallback(() => {
    setEvents((prev) => [...prev, makeEmptyEvent()]);
  }, []);

  // ── Submit ─────────────────────────────────────────────────

  const handleSubmit = async () => {
    setError("");

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
          timezone,
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

      const data = await res.json();

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
  const showClaimForm = parseStatus === "success";
  const showManualForm = manualExpanded && parseStatus !== "success";

  // Preview events (sorted by date, soonest first when possible)
  const previewEvents = [...events]
    .filter((e) => e.title.trim() && e.start_date.trim())
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const visiblePreview = previewEvents.slice(0, PREVIEW_VISIBLE_COUNT);
  const hiddenPreviewCount = Math.max(0, previewEvents.length - PREVIEW_VISIBLE_COUNT);

  return (
    <div className="container">
      <div className="card">
        <h1 className="createHeader">Create your calendar</h1>
        <p className="createSubhead">
          Add your events, share the link — your people subscribe once and stay
          updated automatically.
        </p>

        <div className="divider" />

        {/* ── Image import (drop zone, parsing, error) ──── */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={handleFileInput}
        />

        {parseStatus !== "success" && (
          <div
            className={`flyerUpload flyerUploadHero${dragOver ? " flyerUploadDragOver" : ""}${parseStatus === "parsing" ? " flyerUploadParsing" : ""}${parseStatus === "idle" ? " flyerUploadIdle" : ""}`}
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
                  <div className="flyerHeroMascot" aria-hidden="true">
                    <img src="/callie-mascot.png" alt="" />
                  </div>
                  <p className="flyerHeadline">
                    Upload an image of your events. We&rsquo;ll handle the rest.
                  </p>
                  <p className="flyerFormats">JPEG, PNG, or WEBP</p>
                  <button
                    type="button"
                    className="btn btnPrimary"
                    onClick={(e) => { e.stopPropagation(); triggerFilePicker(); }}
                  >
                    Upload your image
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
                  <p
                    className="parsePhrase"
                    style={{ opacity: parsePhraseVisible ? 1 : 0 }}
                  >
                    {parsePhrase}
                  </p>
                  <div className="parseDots" aria-label="Loading">
                    <span className="parseDot" />
                    <span className="parseDot" />
                    <span className="parseDot" />
                  </div>
                </div>
              )}

              {parseStatus === "error" && (
                <>
                  <div className="flyerIcon" aria-hidden="true">📄</div>
                  <p className="flyerHeadline" style={{ color: "var(--color-error, #c0392b)" }}>
                    {parseMessage}
                  </p>
                  {parseSubline && (
                    <p
                      style={{
                        color: "var(--muted)",
                        fontSize: "0.95rem",
                        lineHeight: 1.5,
                        marginTop: "-4px",
                        marginBottom: "16px",
                        maxWidth: "44ch",
                      }}
                    >
                      {parseSubline}
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn btnSecondary"
                    onClick={(e) => { e.stopPropagation(); triggerFilePicker(); }}
                  >
                    Try again
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {parseStatus !== "success" && !manualExpanded && (
          <div className="manualLinkWrap">
            <button
              type="button"
              className="manualLink"
              onClick={() => setManualExpanded(true)}
            >
              or add events manually
            </button>
          </div>
        )}

        {/* ── Post-parse claim view ──────────────────────── */}
        {showClaimForm && (
          <div className="claimSection">
            {/* Celebration header — mascot + framing line */}
            <div className="claimCelebrate">
              <div className="claimMascot" aria-hidden="true">
                <img src="/callie-mascot.png" alt="" />
              </div>
              <h2 className="claimHeader">Your calendar is ready.</h2>
              <p className="claimSubhead">
                We pulled{" "}
                <strong className="claimCount">
                  {parsedCount} event{parsedCount !== 1 ? "s" : ""}
                </strong>{" "}
                from your image.
              </p>
            </div>

            <p className="claimSteps">
              Just 2 quick steps to claim it so you can share and edit
            </p>

            {/* Step 1 — Name */}
            <div className="claimStep">
              <div className="claimStepHeader">
                <span className="claimStepBadge">1</span>
                <label className="claimStepLabel" htmlFor="cal-name">
                  Name your calendar
                </label>
              </div>
              <input
                id="cal-name"
                type="text"
                className="formInput"
                placeholder="e.g., Woolridge PTA"
                value={calendarName}
                onChange={(e) => setCalendarName(e.target.value)}
                maxLength={100}
                autoComplete="off"
              />
              <div className="formHelper">
                This is what people see when they subscribe.
              </div>
              {calendarName.trim() && (
                <div className="claimAddress">
                  <div className="claimAddressLabel">Your web address</div>
                  <div className="slugPreview">
                    callietools.com/<strong>{slug}</strong>
                  </div>
                  <div className="formHelper">
                    This is your calendar&rsquo;s permanent web address&nbsp;—&nbsp;it
                    can&rsquo;t be changed later. Avoid days and months in your
                    name so this stays relevant when you add future events.
                  </div>
                </div>
              )}
            </div>

            {/* Step 2 — Email */}
            <div className="claimStep">
              <div className="claimStepHeader">
                <span className="claimStepBadge">2</span>
                <label className="claimStepLabel" htmlFor="cal-email">
                  Where should we send the link to manage your calendar?
                </label>
              </div>
              <div className="formHelper claimStepIntro">
                You'll use it to edit events and share with your people anytime.
              </div>
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
                We&rsquo;ll only use this to send your link.
              </div>

              {/* Timezone — collapsed */}
              <div className="tzRow">
                {!tzEditorOpen ? (
                  <span className="tzLine">
                    Timezone: <strong>{tzLabel(timezone)}</strong>
                    {" · "}
                    <button
                      type="button"
                      className="tzChange"
                      onClick={() => setTzEditorOpen(true)}
                    >
                      change
                    </button>
                  </span>
                ) : (
                  <div className="tzEditor">
                    <label className="formLabelSmall" htmlFor="cal-tz">
                      Timezone
                    </label>
                    <select
                      id="cal-tz"
                      className="formInput"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      {US_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="error" style={{ marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              type="button"
              className="btn btnPrimary createSubmit claimSubmit"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Creating…" : "Claim my calendar"}
            </button>

            <p className="claimEditNote">
              Claim now — you can edit anything before sharing with your people.
            </p>

            {/* Events preview — below the claim button, as confirmation */}
            {previewEvents.length > 0 && (
              <div className="previewWrap">
                <div className="previewHeader">Events we found</div>
                <ul className="previewList">
                  {visiblePreview.map((ev) => (
                    <li key={ev.id} className="previewItem">
                      <div className="previewDate">
                        {formatPreviewDate(ev.start_date)}
                      </div>
                      <div className="previewBody">
                        <div className="previewTitle">
                          {ev.title}
                          {ev.confidence === "low" && (
                            <span className="previewFlag" title="Lower confidence — double-check this on the manage page">
                              {" "}⚠️
                            </span>
                          )}
                        </div>
                        {(ev.start_time || ev.location) && (
                          <div className="previewMeta">
                            {ev.start_time && (
                              <span>{formatPreviewTime(ev.start_time)}</span>
                            )}
                            {ev.start_time && ev.location && <span> · </span>}
                            {ev.location && <span>{ev.location}</span>}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {hiddenPreviewCount > 0 && (
                  <p className="previewMore">
                    + {hiddenPreviewCount} more event
                    {hiddenPreviewCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}

            {/* Bottom escape hatch */}
            <div className="claimRetryWrap">
              <button
                type="button"
                className="manualLink"
                onClick={resetToIdle}
              >
                Try again with a different image
              </button>
            </div>
          </div>
        )}

        {/* ── Manual entry form (expanded escape hatch) ──── */}
        {showManualForm && (
          <div className="manualSection">
            <div className="divider" />

            <div className="formGroup">
              <label className="formLabel" htmlFor="cal-name-manual">
                Calendar name
              </label>
              <input
                id="cal-name-manual"
                type="text"
                className="formInput"
                placeholder="e.g., Woolridge PTA"
                value={calendarName}
                onChange={(e) => setCalendarName(e.target.value)}
                maxLength={100}
                autoComplete="off"
              />
              <div className="formHelper">
                This is what people see when they subscribe.
              </div>
              {calendarName.trim() && (
                <div className="claimAddress">
                  <div className="claimAddressLabel">Your web address</div>
                  <div className="slugPreview">
                    callietools.com/<strong>{slug}</strong>
                  </div>
                  <div className="formHelper">
                    This is your calendar&rsquo;s permanent web address — it
                    can&rsquo;t be changed later. Avoid days and months in your
                    name so this stays relevant when you add future events.
                  </div>
                </div>
              )}
            </div>

            <div className="formGroup">
              <label className="formLabel" htmlFor="cal-email-manual">
                Your email
              </label>
              <input
                id="cal-email-manual"
                type="email"
                className="formInput"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <div className="formHelper">
                We&rsquo;ll only use this to send your manage link.
              </div>
            </div>

            <div className="formGroup">
              <label className="formLabel" htmlFor="cal-timezone-manual">
                Timezone
              </label>
              <select
                id="cal-timezone-manual"
                className="formInput"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {US_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="divider" />

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
                        onChange={(e) => updateEvent(ev.id, "start_date", e.target.value)}
                      />
                    </div>
                    <div className="eventTimeField">
                      <label className="formLabelSmall">Start</label>
                      <input
                        type="time"
                        className="formInput"
                        step="900"
                        value={ev.start_time}
                        onChange={(e) => updateEvent(ev.id, "start_time", e.target.value)}
                      />
                    </div>
                    <div className="eventTimeField">
                      <label className="formLabelSmall">End</label>
                      <input
                        type="time"
                        className="formInput"
                        step="900"
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
              ))}

              <button type="button" className="addEventLink" onClick={addEvent}>
                + Add event
              </button>
            </div>

            <div className="divider" />

            {error && (
              <div className="error" style={{ marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              type="button"
              className="btn btnPrimary createSubmit"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Creating…" : "Create my calendar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
