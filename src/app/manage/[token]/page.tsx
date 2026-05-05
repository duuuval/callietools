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
  isNew?: boolean;
  confidence?: "high" | "medium" | "low";
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
  confidence?: "high" | "medium" | "low";
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
    isNew: true,
    confidence: e.confidence,
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

// ─── Parse loading phrases ───────────────────────────────────

const PARSE_PHRASES = [
  "Reading your image…",
  "Finding your events…",
  "Almost ready…",
  "Still working on it…",
  "Still working — promise!",
];

const PHRASE_DELAYS = [0, 3000, 7000, 13000, 20000];

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

// ─── Date / time formatting for collapsed rows ───────────────

function formatRowDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const currentYear = new Date().getFullYear();
  const showYear = y !== currentYear;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(showYear ? { year: "numeric" } : {}),
  });
}

function formatRowTime(time24: string): string {
  if (!time24 || !/^\d{2}:\d{2}$/.test(time24)) return "";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  if (m === 0) return `${hour12} ${period}`;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// ─── Toast component (inline, no library) ────────────────────

interface Toast {
  id: string;
  message: string;
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

  // ── Per-row UI state (which rows are expanded for editing) ──
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  // Snapshot of rows when they were expanded — for Cancel discard
  const editSnapshots = useRef<Map<string, EventRow>>(new Map());
  // Track which rows are brand-new (unsaved) — Cancel on these removes the row entirely
  const newUnsavedRows = useRef<Set<string>>(new Set());
  // Refs to row containers for scroll-into-view
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Refs for focus management
  const titleInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // ── Add-events toggle state (mobile only — collapsed by default) ──
  const [addEventsExpanded, setAddEventsExpanded] = useState(false);

  // ── Branding state (paid only) ──
  const [brandingExpanded, setBrandingExpanded] = useState(false);
  const [accentColor, setAccentColor] = useState("");
  const [hexInput, setHexInput] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [brandingDirty, setBrandingDirty] = useState(false);
  const [brandingSubmitting, setBrandingSubmitting] = useState(false);
  const [brandingSaveError, setBrandingSaveError] = useState("");

  // ── Flyer import state ──
  const [parseStatus, setParseStatus] = useState<"idle" | "parsing" | "success" | "error">("idle");
  const [parseMessage, setParseMessage] = useState("");
  const [parsePhrase, setParsePhrase] = useState(PARSE_PHRASES[0]);
  const [parsePhraseVisible, setParsePhraseVisible] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const parsePhraseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadCardRef = useRef<HTMLDivElement>(null);

  // ── Save state (per-event inline) ──
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  // ── Delete confirm dialog ──
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // ── Toasts ──
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const isPaid = calendar?.tier === "paid";
  const buttonTextColor = isLightColor(accentColor) ? "#000" : "#fff";

  // ── Derived ──
  const upcomingEvents = events
    .filter((e) => !isPastEvent(e))
    .sort((a, b) => {
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      const dateCompare = a.start_date.localeCompare(b.start_date);
      if (dateCompare !== 0) return dateCompare;
      // Events without start_time sort first within their date
      if (!a.start_time && b.start_time) return -1;
      if (a.start_time && !b.start_time) return 1;
      return a.start_time.localeCompare(b.start_time);
    });
  const pastEvents = events
    .filter((e) => isPastEvent(e))
    .sort((a, b) => b.start_date.localeCompare(a.start_date));

  const upcomingCount = upcomingEvents.length;
  const pastCount = pastEvents.length;
  const totalCount = events.filter((e) => e.title.trim() || e.start_date.trim()).length;

  // Has any branding been set on this calendar?
  const hasBranding = !!(accentColor || (calendar?.theme && calendar.theme !== "light") || calendar?.logoUrl);

  // ── Load calendar ──
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/manage/${token}`, { cache: "no-store" });
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
            ? data.events.map((e: {
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
            : []
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

    return () => { parsePhraseTimers.current.forEach(clearTimeout); };
  }, [parseStatus]);

  // ── Helper: persist events array to server ──
  const persistEvents = useCallback(async (eventsToSave: EventRow[]): Promise<boolean> => {
    const validEvents = eventsToSave.filter((e) => e.title.trim() && e.start_date.trim());
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
        throw new Error(data.error || `Something went wrong (${res.status}).`);
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't save. Please try again.";
      showToast(message);
      return false;
    }
  }, [token, showToast]);

  // ── Row expand / collapse ──
  const expandRow = useCallback((id: string) => {
    setEvents((prev) => {
      const ev = prev.find((e) => e.id === id);
      if (ev) editSnapshots.current.set(id, { ...ev });
      return prev;
    });
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const collapseRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    editSnapshots.current.delete(id);
  }, []);

  // ── Update field on a row ──
  const updateEvent = useCallback(
    (id: string, field: keyof EventRow, value: string | boolean) => {
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
    }, []
  );

  // ── Save individual row (inline) ──
  const handleSaveRow = useCallback(async (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;

    if (!ev.title.trim()) {
      showToast("Add a title before saving.");
      return;
    }
    if (!ev.start_date.trim()) {
      showToast("Add a date before saving.");
      return;
    }

    setSavingRowId(id);
    const success = await persistEvents(events);
    setSavingRowId(null);

    if (success) {
      // Clear isNew + confidence flags after successful save
      setEvents((prev) => prev.map((e) =>
        e.id === id ? { ...e, isNew: false, confidence: undefined } : e
      ));
      newUnsavedRows.current.delete(id);
      collapseRow(id);
      showToast("Event saved.");
    }
  }, [events, persistEvents, showToast, collapseRow]);

  // ── Cancel edit on a row ──
  const handleCancelRow = useCallback((id: string) => {
    // If this is a brand-new unsaved row, remove it entirely
    if (newUnsavedRows.current.has(id)) {
      newUnsavedRows.current.delete(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setExpandedRows((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      editSnapshots.current.delete(id);
      return;
    }

    // Otherwise restore from snapshot
    const snapshot = editSnapshots.current.get(id);
    if (snapshot) {
      setEvents((prev) => prev.map((e) => (e.id === id ? snapshot : e)));
    }
    collapseRow(id);
  }, [collapseRow]);

  // ── Add new event manually ──
  const handleAddManual = useCallback(() => {
    const newEvent = makeEmptyEvent();
    newUnsavedRows.current.add(newEvent.id);
    editSnapshots.current.set(newEvent.id, { ...newEvent });
    setEvents((prev) => [newEvent, ...prev]);
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.add(newEvent.id);
      return next;
    });
    // Scroll to and focus the new row after render
    setTimeout(() => {
      const row = rowRefs.current.get(newEvent.id);
      if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
      const titleInput = titleInputRefs.current.get(newEvent.id);
      if (titleInput) titleInput.focus();
    }, 100);
  }, []);

  // ── Delete event (with confirm) ──
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmId) return;
    setDeleteSubmitting(true);
    const nextEvents = events.filter((e) => e.id !== deleteConfirmId);
    const success = await persistEvents(nextEvents);
    setDeleteSubmitting(false);

    if (success) {
      setEvents(nextEvents);
      newUnsavedRows.current.delete(deleteConfirmId);
      editSnapshots.current.delete(deleteConfirmId);
      setExpandedRows((prev) => {
        const next = new Set(prev);
        next.delete(deleteConfirmId);
        return next;
      });
      setDeleteConfirmId(null);
      showToast("Event deleted.");
    }
  }, [deleteConfirmId, events, persistEvents, showToast]);

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
        setParseMessage(data.error || "We couldn't read that. Try a sharper image, or add events manually.");
        return;
      }
      const parsedEvents: EventRow[] = data.events.map(makeEventFromParse);

      // Filter duplicates against existing events
      const newOnly = parsedEvents.filter((parsed) => {
        return !events.some((existing) => {
          const titleMatch = parsed.title.trim().toLowerCase() === existing.title.trim().toLowerCase();
          const dateMatch = parsed.start_date === existing.start_date;
          if (!titleMatch || !dateMatch) return false;
          if (parsed.start_time && existing.start_time) {
            return parsed.start_time === existing.start_time;
          }
          return true;
        });
      });

      const skipped = parsedEvents.length - newOnly.length;

      if (newOnly.length === 0) {
        setParseStatus("success");
        setParseMessage(
          parsedEvents.length === 1
            ? "That event is already on your calendar — nothing was added."
            : "All events from this upload are already on your calendar — nothing was added."
        );
        return;
      }

      // Merge new events into local state, then persist immediately
      const merged = [...newOnly, ...events];
      const success = await persistEvents(merged);

      if (success) {
        // Clear isNew flags on persisted events (they're real now)
        setEvents(merged.map((e) => ({ ...e, isNew: false, confidence: undefined })));
        setParseStatus("success");
        if (skipped > 0) {
          setParseMessage(
            `Added ${newOnly.length} new event${newOnly.length !== 1 ? "s" : ""}. ${skipped} already existed.`
          );
        } else {
          setParseMessage(
            `Added ${newOnly.length} event${newOnly.length !== 1 ? "s" : ""}.`
          );
        }
        showToast(`Added ${newOnly.length} event${newOnly.length !== 1 ? "s" : ""}.`);
      } else {
        setParseStatus("error");
        setParseMessage("Couldn't save the new events. Please try again.");
      }
    } catch {
      setParseStatus("error");
      setParseMessage("Something went wrong. Try again or add events manually.");
    }
  }, [parseStatus, events, persistEvents, showToast]);

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

  // ── Scroll to upload zone (from "Add what's next" button) ──
  const scrollToUpload = useCallback(() => {
    if (uploadCardRef.current) {
      uploadCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

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
      setBrandingExpanded(false);
      showToast("Branding saved.");
    } catch (err) {
      setBrandingSaveError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setBrandingSubmitting(false);
    }
  };

  // ── Copy link to clipboard ──
  const handleCopyLink = useCallback(() => {
    if (!calendar) return;
    const url = `https://callietools.com/${calendar.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () => showToast("Link copied."),
        () => showToast("Couldn't copy — select the URL manually.")
      );
    } else {
      showToast("Couldn't copy — select the URL manually.");
    }
  }, [calendar, showToast]);

  // ── Loading / error states ──
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
  const calendarUrlDisplay = `callietools.com/${calendar?.id}`;
  const logoUrl = calendar?.logoUrl || null;

  // ─────────────────────────────────────────────────────────────
  // ── Render: Collapsed event row (upcoming only) ──
  // ─────────────────────────────────────────────────────────────
  function renderCollapsedRow(ev: EventRow) {
    const dateStr = formatRowDate(ev.start_date);
    const timeStr = ev.start_time ? formatRowTime(ev.start_time) : "All day";
    const title = ev.title.trim() || "(Untitled event)";

    return (
      <div
        key={ev.id}
        ref={(el) => {
          if (el) rowRefs.current.set(ev.id, el);
          else rowRefs.current.delete(ev.id);
        }}
        className="manageRowCollapsed"
        onClick={() => expandRow(ev.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            expandRow(ev.id);
          }
        }}
      >
        <div className="manageRowContent">
          <span className="manageRowDate">{dateStr || "No date"}</span>
          <span className="manageRowSep">·</span>
          <span className="manageRowTitle">{title}</span>
          {(ev.start_time || ev.location) && (
            <>
              <span className="manageRowSep">·</span>
              <span className="manageRowMeta">
                {timeStr}
                {ev.location && <> · {ev.location}</>}
              </span>
            </>
          )}
          {ev.isNew && <span className="eventCardNewBadge" style={{ marginLeft: 8 }}>NEW</span>}
        </div>
        <div className="manageRowActions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="manageRowEdit"
            onClick={() => expandRow(ev.id)}
            aria-label="Edit event"
          >
            Edit
          </button>
          <button
            type="button"
            className="manageRowDelete"
            onClick={() => setDeleteConfirmId(ev.id)}
            aria-label="Delete event"
          >
            🗑
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ── Render: Expanded event row (full edit form) ──
  // ─────────────────────────────────────────────────────────────
  function renderExpandedRow(ev: EventRow) {
    const isSaving = savingRowId === ev.id;
    return (
      <div
        key={ev.id}
        ref={(el) => {
          if (el) rowRefs.current.set(ev.id, el);
          else rowRefs.current.delete(ev.id);
        }}
        className={`eventCard${ev.isNew ? " eventCardNew" : ""}`}
      >
        <input
          ref={(el) => {
            if (el) titleInputRefs.current.set(ev.id, el);
            else titleInputRefs.current.delete(ev.id);
          }}
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

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginTop: 16,
          paddingTop: 12,
          borderTop: "1px solid #eee",
        }}>
          <button
            type="button"
            className="manualLink"
            onClick={() => handleCancelRow(ev.id)}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btnPrimary"
            onClick={() => handleSaveRow(ev.id)}
            disabled={isSaving}
            style={{ minWidth: 120 }}
          >
            {isSaving ? "Saving…" : "Save event"}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ── Render: Read-only past event row ──
  // ─────────────────────────────────────────────────────────────
  function renderPastRow(ev: EventRow) {
    const dateStr = formatRowDate(ev.start_date);
    const timeStr = ev.start_time ? formatRowTime(ev.start_time) : "All day";
    return (
      <div key={ev.id} className="managePastRow">
        <span className="manageRowDate">{dateStr}</span>
        <span className="manageRowSep">·</span>
        <span className="manageRowTitle">{ev.title.trim() || "(Untitled event)"}</span>
        {(ev.start_time || ev.location) && (
          <>
            <span className="manageRowSep">·</span>
            <span className="manageRowMeta">
              {timeStr}
              {ev.location && <> · {ev.location}</>}
            </span>
          </>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ── Main render ──
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="container">
      <div className="card">

        {/* ═══════════════════════════════════════════════════════
            ZONE 1 — Home base
            ═══════════════════════════════════════════════════════ */}
        <div className="manageSectionHeader">Your calendar</div>
        <div style={{ marginBottom: 8 }}>
          <h1 className="createHeader" style={{ marginBottom: 16 }}>
            {calendar?.name}
          </h1>

          {/* URL strip */}
          <div className="manageUrlStrip">
            <div className="manageUrlText">
              <span className="manageUrlIcon" aria-hidden="true">🔗</span>
              <span className="manageUrlValue">{calendarUrlDisplay}</span>
            </div>
            <div className="manageUrlButtons">
              <button
                type="button"
                className="btn btnSecondary manageUrlBtn"
                onClick={handleCopyLink}
              >
                Copy link
              </button>
              <a
                href={calendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btnSecondary manageUrlBtn"
              >
                View page ↗
              </a>
            </div>
          </div>

          {/* At-a-glance line */}
          {totalCount > 0 && (
            <div className="manageAtGlance">
              {upcomingCount > 0 ? (
                <>
                  {upcomingCount} upcoming · {pastCount} past
                </>
              ) : (
                <>
                  No upcoming · {pastCount} past
                  <button
                    type="button"
                    className="manageAtGlanceCta"
                    onClick={scrollToUpload}
                  >
                    Add what&rsquo;s next ▸
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="divider" />

        {/* ═══════════════════════════════════════════════════════
            ZONE 3 — Branding (paid only)
            Free tier shows the upgrade reminder at the bottom of the page
            ═══════════════════════════════════════════════════════ */}
        {isPaid && (
          <>
            <div className="manageSectionHeader">Your branding</div>
            <div className="manageBrandingZone">
              {!brandingExpanded ? (
                <div className="manageBrandingChip">
                  <div className="manageBrandingChipRow">
                    {hasBranding ? (
                      <>
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt=""
                            className="manageBrandingChipLogo"
                          />
                        ) : (
                          <span className="manageBrandingChipNoLogo">No logo yet</span>
                        )}
                        {accentColor && (
                          <span
                            className="manageBrandingChipSwatch"
                            style={{ background: accentColor }}
                            aria-label={`Accent color ${accentColor}`}
                          />
                        )}
                        <span className="manageBrandingChipTheme">
                          {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
                        </span>
                      </>
                    ) : (
                      <span className="manageBrandingChipPrompt">
                        Set your logo, color, and theme
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btnSecondary manageBrandingEditBtn"
                      onClick={() => setBrandingExpanded(true)}
                    >
                      Edit ▸
                    </button>
                  </div>
                </div>
              ) : (
                <div className="manageBrandingExpanded">
                  {!logoUrl && (
                    <p style={{
                      fontSize: "0.8rem",
                      color: "#666",
                      marginTop: 0,
                      marginBottom: 20,
                      lineHeight: 1.5,
                    }}>
                      Don&rsquo;t see your logo?{"\u00A0"}
                      <a href="mailto:hello@callietools.com" style={{ color: "#4F6BED", fontWeight: 500 }}>
                        Email us your logo file
                      </a>{" "}and we&rsquo;ll add it.
                    </p>
                  )}

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

                  <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
                    <button
                      type="button"
                      className="manualLink"
                      onClick={() => {
                        setBrandingExpanded(false);
                        setBrandingDirty(false);
                        // Restore from calendar state
                        const color = calendar?.accentColor || "";
                        setAccentColor(color);
                        setHexInput(color);
                        setTheme(calendar?.theme === "dark" ? "dark" : "light");
                        setBrandingSaveError("");
                      }}
                      disabled={brandingSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btnPrimary"
                      onClick={handleBrandingSave}
                      disabled={brandingSubmitting || !brandingDirty}
                      style={{
                        minWidth: 140,
                        opacity: (!brandingDirty || brandingSubmitting) ? 0.6 : 1,
                      }}
                    >
                      {brandingSubmitting ? "Saving…" : "Save branding"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="divider" />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════
            ZONE 2 — Events
            ═══════════════════════════════════════════════════════ */}
        <div className="formGroup">

          {/* ── Add events: toggle on mobile, always-shown on desktop ── */}
          <button
            type="button"
            className="manageAddToggle"
            onClick={() => setAddEventsExpanded((v) => !v)}
            aria-expanded={addEventsExpanded}
          >
            <span className="manageAddToggleLabel">+ Add events</span>
            <span
              className="manageAddToggleChevron"
              style={{ transform: addEventsExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>

          {/* ── Add CTAs (Drop a flyer | + Add event manually) ──
              Hidden on mobile until toggle expanded; always shown on desktop ── */}
          <div
            className={`manageAddCtas${addEventsExpanded ? " manageAddCtasExpanded" : ""}`}
            ref={uploadCardRef}
          >

            {/* Drop a flyer card */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleFileInput}
            />
            <div
              className={`manageAddCard manageAddCardUpload${dragOver ? " manageAddCardDragOver" : ""}${parseStatus === "parsing" ? " manageAddCardParsing" : ""}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => parseStatus !== "parsing" && triggerFilePicker()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && parseStatus !== "parsing" && triggerFilePicker()}
              style={{ cursor: parseStatus === "parsing" ? "wait" : "pointer" }}
            >
              {parseStatus === "idle" && (
                <>
                  <img src="/callie-mascot.png" alt="" className="manageAddMascot" />
                  <div className="manageAddCardHeadline">Drop a flyer</div>
                  <div className="manageAddCardSub">JPEG, PNG, or WEBP</div>
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
                  <div className="manageAddCardHeadline" style={{ fontSize: "0.95rem" }}>{parseMessage}</div>
                  <button
                    type="button"
                    className="btn btnSecondary"
                    style={{ marginTop: 8 }}
                    onClick={(e) => { e.stopPropagation(); setParseStatus("idle"); triggerFilePicker(); }}
                  >
                    Upload another
                  </button>
                </>
              )}
              {parseStatus === "error" && (
                <>
                  <div className="flyerIcon" aria-hidden="true">📄</div>
                  <div className="manageAddCardHeadline" style={{ color: "var(--color-error, #c0392b)", fontSize: "0.95rem" }}>
                    {parseMessage}
                  </div>
                  <button
                    type="button"
                    className="btn btnSecondary"
                    style={{ marginTop: 8 }}
                    onClick={(e) => { e.stopPropagation(); setParseStatus("idle"); triggerFilePicker(); }}
                  >
                    Try again
                  </button>
                </>
              )}
            </div>

            {/* + Add event manually card */}
            <button
              type="button"
              className="manageAddCard manageAddCardManual"
              onClick={handleAddManual}
            >
              <div className="manageAddCardPlus" aria-hidden="true">+</div>
              <div className="manageAddCardHeadline">Add event manually</div>
              <div className="manageAddCardSub">Type in the details</div>
            </button>
          </div>

          {/* ── Upcoming events ── */}
          <div className="manageSectionHeader" style={{ marginTop: 8 }}>Upcoming events</div>

          {events.length === 0 ? (
            <div className="manageEmptyState">
              <p style={{ fontSize: "1rem", marginBottom: 8 }}>No events yet.</p>
              <p style={{ fontSize: "0.875rem", color: "#666" }}>
                Drop a flyer or add events manually to get started.
              </p>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="manageEmptyState" style={{ padding: "20px 16px" }}>
              <p style={{ fontSize: "0.9rem", color: "#666", margin: 0 }}>
                No upcoming events. Drop a flyer or add manually above.
              </p>
            </div>
          ) : (
            <div className="manageEventList">
              {upcomingEvents.map((ev) =>
                expandedRows.has(ev.id) ? renderExpandedRow(ev) : renderCollapsedRow(ev)
              )}
            </div>
          )}

          {/* ── Bottom + Add event button (mirrors top manual card, shorthand) ── */}
          {upcomingEvents.length > 0 && (
            <button
              type="button"
              className="manageBottomAdd"
              onClick={handleAddManual}
            >
              + Add event
            </button>
          )}

          {/* ── Past events (collapsed by default, read-only) ── */}
          {pastEvents.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <button
                type="button"
                onClick={() => setPastExpanded((v) => !v)}
                className="managePastToggle"
              >
                <span style={{
                  display: "inline-block",
                  transform: pastExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}>
                  ▶
                </span>
                Past events ({pastEvents.length})
              </button>

              {pastExpanded && (
                <div className="managePastList">
                  {pastEvents.map(renderPastRow)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════
            Free-tier upgrade reminder (footer line, restraint mode)
            ═══════════════════════════════════════════════════════ */}
        {!isPaid && (
          <>
            <div className="divider" />
            <p className="manageUpgradeFooter">
              Want your logo and colors on your calendar page?<br />
              <a href="/upgrade" className="manageUpgradeFooterLink">
                Make it yours — $10/month
              </a>
            </p>
          </>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════════
          Toast container
          ═══════════════════════════════════════════════════════ */}
      {toasts.length > 0 && (
        <div className="manageToastContainer">
          {toasts.map((t) => (
            <div key={t.id} className="manageToast">
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          Delete confirm dialog
          ═══════════════════════════════════════════════════════ */}
      {deleteConfirmId && (
        <div
          className="manageConfirmBackdrop"
          onClick={() => !deleteSubmitting && setDeleteConfirmId(null)}
        >
          <div
            className="manageConfirmDialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="manageConfirmHeadline">Delete this event?</h2>
            <p className="manageConfirmBody">This can&rsquo;t be undone.</p>
            <div className="manageConfirmActions">
              <button
                type="button"
                className="manualLink"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleteSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btnPrimary manageConfirmDeleteBtn"
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
