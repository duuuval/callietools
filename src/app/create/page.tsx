"use client";

import { useState, useCallback, useRef } from "react";
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
  confidence?: "high" | "medium" | "low"; // set on flyer-parsed rows
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

// ─── Component ───────────────────────────────────────────────

export default function CreatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [calendarName, setCalendarName] = useState("");
  const [email, setEmail] = useState("");
  const [events, setEvents] = useState<EventRow[]>([
    makeEmptyEvent(),
    makeEmptyEvent(),
    makeEmptyEvent(),
  ]);

  // Flyer import state
  const [parseStatus, setParseStatus] = useState<
    "idle" | "parsing" | "success" | "error"
  >("idle");
  const [parseMessage, setParseMessage] = useState("");
  const [parsedCount, setParsedCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Flyer import ───────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (parseStatus === "parsing") return; // prevent double-fire

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
        setParseMessage(data.error || "We couldn't read that. Try a sharper image, or add events manually below.");
        return;
      }

      const parsedEvents: EventRow[] = data.events.map(makeEventFromParse);

      // Populate calendar name if field is empty and GPT inferred one
      if (!calendarName.trim() && data.calendar_name) {
        setCalendarName(data.calendar_name);
      }

      // Replace the default empty rows with parsed events
      // Keep any rows the user has already filled in
      setEvents((prev) => {
        const userFilled = prev.filter(
          (e) => e.title.trim() || e.start_date.trim()
        );
        return [...parsedEvents, ...userFilled];
      });

      setParsedCount(parsedEvents.length);
      setParseStatus("success");
      setParseMessage(
        `We pulled ${parsedEvents.length} event${parsedEvents.length !== 1 ? "s" : ""} from your upload — review and confirm below.`
      );
    } catch {
      setParseStatus("error");
      setParseMessage("Something went wrong. Try again or add events manually below.");
    }
  }, [parseStatus, calendarName]);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be re-uploaded if needed
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

  // ── Event row helpers ──────────────────────────────────────

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

        {/* ── Flyer import ──────────────────────────────── */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={handleFileInput}
        />

        <div
          className={`flyerUpload${dragOver ? " flyerUploadDragOver" : ""}`}
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
            <div className="flyerIcon" aria-hidden="true">
              {parseStatus === "parsing" ? "⏳" : parseStatus === "success" ? "✅" : "📄"}
            </div>

            {parseStatus === "idle" && (
              <>
                <p className="flyerHeadline">
                  Got a flyer or schedule? Upload it and Callie will pull your
                  events out.
                </p>
                <p className="flyerFormats">JPEG, PNG, or WEBP</p>
                <button
                  type="button"
                  className="btn btnSecondary"
                  onClick={(e) => { e.stopPropagation(); triggerFilePicker(); }}
                >
                  Upload flyer
                </button>
              </>
            )}

            {parseStatus === "parsing" && (
              <>
                <p className="flyerHeadline">Reading your flyer…</p>
                <p className="flyerFormats">This usually takes a few seconds.</p>
              </>
            )}

            {parseStatus === "success" && (
              <>
                <p className="flyerHeadline">{parseMessage}</p>
                <button
                  type="button"
                  className="btn btnSecondary"
                  onClick={(e) => { e.stopPropagation(); triggerFilePicker(); }}
                >
                  Upload a different flyer
                </button>
              </>
            )}

            {parseStatus === "error" && (
              <>
                <p className="flyerHeadline" style={{ color: "var(--color-error, #c0392b)" }}>
                  {parseMessage}
                </p>
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

          {parsedCount > 0 && parseStatus === "success" && (
            <p className="flyerFormats" style={{ marginBottom: 12 }}>
              Events marked with ⚠️ had lower confidence — double-check those before submitting.
            </p>
          )}

          {events.map((ev, idx) => (
            <div key={ev.id} className="eventCard">
              <div className="eventCardHeader">
                <span className="eventCardNum">
                  {idx + 1}
                  {ev.confidence === "low" && " ⚠️"}
                  {ev.confidence === "medium" && " ·"}
                </span>
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
                    step="900"
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
                    step="900"
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

          <button type="button" className="addEventLink" onClick={addEvent}>
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
    </div>
  );
}
