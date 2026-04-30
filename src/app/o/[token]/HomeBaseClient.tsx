"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  type ActionType,
  type HomeBaseData,
  type OutreachAction,
  type OutreachContact,
  type OutreachRow,
  daysBetween,
} from "@/lib/outreach";

// ─── Constants ──────────────────────────────────────────────

const COLOR = {
  bg: "#F6F6F8",
  card: "#FFFFFF",
  text: "#111318",
  muted: "#5B616E",
  border: "#E6E8EF",
  primary: "#4F6BED",
  primaryHover: "#3E57C4",
  accent: "#D4775B",
  success: "#2D6A4F",
  successSoft: "rgba(45, 106, 79, 0.12)",
  danger: "#B23A3A",
  shadow: "0 10px 22px rgba(17, 19, 24, 0.08)",
};

const PLANNED_LABEL: Record<ActionType, string> = {
  dm_sent: "DM",
  calendar_built: "Build calendar",
  link_sent: "Send link",
  replied: "Reply",
  shared: "Share",
  comment: "Comment",
  follow_up: "Follow up",
  other: "Reach out",
};

const DONE_LABEL: Record<ActionType, string> = {
  dm_sent: "DM sent",
  calendar_built: "Calendar built",
  link_sent: "Link sent",
  replied: "Replied",
  shared: "Shared",
  comment: "Commented",
  follow_up: "Followed up",
  other: "Reached out",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CAPTURE_INTENTS: { value: ActionType; label: string }[] = [
  { value: "dm_sent", label: "DM" },
  { value: "calendar_built", label: "Build calendar" },
  { value: "comment", label: "Comment" },
  { value: "other", label: "Other" },
];

const TIMING_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Today" },
  { value: 1, label: "Tomorrow" },
  { value: 3, label: "In 3 days" },
  { value: 7, label: "In 7 days" },
];

const UPCOMING_COLLAPSED_LIMIT = 5;

// ─── Types ──────────────────────────────────────────────────

interface Props {
  token: string;
  today: string;
  data: HomeBaseData & { upcoming?: OutreachRow[] };
}

// ─── Component ──────────────────────────────────────────────

export default function HomeBaseClient({ token, today, data }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [menuRow, setMenuRow] = useState<OutreachRow | null>(null);
  const [editingContact, setEditingContact] =
    useState<OutreachContact | null>(null);
  const [reschedulingAction, setReschedulingAction] =
    useState<OutreachAction | null>(null);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const [upcomingShowAll, setUpcomingShowAll] = useState(false);

  // The home base data may or may not include `upcoming`; default to empty array
  const upcoming = data.upcoming || [];

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  async function call(
    path: string,
    body: Record<string, any>,
    successToast: string
  ) {
    try {
      const res = await fetch(`/api/outreach/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ token, ...body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setToast(`Error: ${err.error || "Request failed"}`);
        return null;
      }
      const result = await res.json();
      setToast(successToast);
      startTransition(() => router.refresh());
      return result;
    } catch (e: any) {
      setToast(`Error: ${e.message || "Network error"}`);
      return null;
    }
  }

  // ─── Action handlers ──────────────────────────────────────

  async function handleComplete(row: OutreachRow) {
    const result = await call(
      "complete",
      { planned_action_id: row.action.id },
      "Logged."
    );
    if (result) {
      setToast(buildCompleteToast(row.action.action_type, result.followup));
    }
  }

  async function handlePush(
    row: OutreachRow,
    target: "today" | "tomorrow"
  ) {
    setMenuRow(null);
    await call(
      "push",
      { action_id: row.action.id, to: target },
      target === "tomorrow" ? "Pushed to tomorrow." : "Pushed to today."
    );
  }

  async function handleReschedule(actionId: string, newDueDate: string) {
    setReschedulingAction(null);
    await call(
      "reschedule",
      { action_id: actionId, new_due_date: newDueDate },
      `Rescheduled to ${formatDateLong(newDueDate)}.`
    );
  }

  async function handleDeleteAction(row: OutreachRow) {
    setMenuRow(null);
    if (
      !confirm(
        `Delete the planned "${PLANNED_LABEL[row.action.action_type]}" for @${row.contact.handle}?`
      )
    )
      return;
    await call("delete-action", { action_id: row.action.id }, "Deleted.");
  }

  async function handleMarkDead(row: OutreachRow) {
    setMenuRow(null);
    if (
      !confirm(
        `Mark @${row.contact.handle} as dead? Their items will stop appearing on this page.`
      )
    )
      return;
    await call(
      "mark-dead",
      { contact_id: row.contact.id },
      `Marked @${row.contact.handle} as dead.`
    );
  }

  async function handleEditContact(
    contactId: string,
    patch: Partial<OutreachContact>
  ) {
    setEditingContact(null);
    await call(
      "edit-contact",
      { contact_id: contactId, patch },
      "Contact updated."
    );
  }

  async function handleQuickCapture(payload: {
    handle: string;
    action_type: ActionType;
    notes: string | null;
    days_until: number;
  }) {
    setShowQuickCapture(false);
    const dayLabel =
      payload.days_until === 0
        ? "today"
        : payload.days_until === 1
        ? "tomorrow"
        : `in ${payload.days_until} days`;
    await call(
      "quick-capture",
      {
        handle: payload.handle,
        action_type: payload.action_type,
        notes: payload.notes,
        days_until: payload.days_until,
      },
      `Captured. @${normalizeForDisplay(payload.handle)} scheduled for ${dayLabel}.`
    );
  }

  // ─── Empty state copy ─────────────────────────────────────

  const emptyTodayCopy = useMemo(() => {
    if (data.overdue.length > 0) return null; // overdue section is doing the work
    if (upcoming.length > 0) return "Nothing today. Upcoming below.";
    return "Nothing scheduled. Capture someone below or come back tomorrow.";
  }, [data.overdue.length, upcoming.length]);

  // ─── Upcoming grouped by day ──────────────────────────────

  const upcomingGrouped = useMemo(
    () => groupByDueDate(upcoming),
    [upcoming]
  );

  const upcomingVisible = useMemo(() => {
    if (upcomingShowAll) return upcoming;
    return upcoming.slice(0, UPCOMING_COLLAPSED_LIMIT);
  }, [upcoming, upcomingShowAll]);

  const upcomingVisibleGrouped = useMemo(
    () => groupByDueDate(upcomingVisible),
    [upcomingVisible]
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerTopRow}>
          <div>
            <div style={styles.title}>Outreach</div>
            <div style={styles.subtitle}>{formatToday(today)}</div>
          </div>
          <a href={`/o/${token}/contacts`} style={styles.contactsLink}>
            All contacts →
          </a>
        </div>
      </header>

      {data.overdue.length > 0 && (
        <Section
          label={`Overdue (${data.overdue.length})`}
          tone="warn"
        >
          {data.overdue.map((row) => (
            <Row
              key={row.action.id}
              row={row}
              today={today}
              token={token}
              showOverduePatina
              onComplete={() => handleComplete(row)}
              onMenuOpen={() => setMenuRow(row)}
              disabled={isPending}
            />
          ))}
        </Section>
      )}

      <Section
        label={
          data.todayActive.length > 0
            ? `Today (${data.todayActive.length})`
            : "Today"
        }
      >
        {data.todayActive.length === 0 && emptyTodayCopy && (
          <div style={styles.emptyState}>{emptyTodayCopy}</div>
        )}
        {data.todayActive.map((row) => (
          <Row
            key={row.action.id}
            row={row}
            today={today}
            token={token}
            onComplete={() => handleComplete(row)}
            onMenuOpen={() => setMenuRow(row)}
            disabled={isPending}
          />
        ))}
      </Section>

      {data.todayDone.length > 0 && (
        <Section label={`Done today (${data.todayDone.length})`} dim>
          {data.todayDone.map((row) => (
            <DoneRow key={row.action.id} row={row} token={token} />
          ))}
        </Section>
      )}

      <QuickCaptureBlock
        expanded={showQuickCapture}
        onExpand={() => setShowQuickCapture(true)}
        onCollapse={() => setShowQuickCapture(false)}
        onSubmit={handleQuickCapture}
        disabled={isPending}
      />

      {upcoming.length > 0 && (
        <section style={styles.section}>
          {!upcomingExpanded ? (
            <button
              onClick={() => setUpcomingExpanded(true)}
              style={styles.upcomingToggle}
            >
              → Upcoming ({upcoming.length})
            </button>
          ) : (
            <>
              <div
                style={{
                  ...styles.sectionLabel,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span>Upcoming ({upcoming.length})</span>
                <button
                  onClick={() => {
                    setUpcomingExpanded(false);
                    setUpcomingShowAll(false);
                  }}
                  style={styles.upcomingCollapseBtn}
                >
                  Hide
                </button>
              </div>
              <div style={styles.sectionBody}>
                {upcomingVisibleGrouped.map(([date, rows]) => (
                  <div key={date} style={styles.upcomingDayGroup}>
                    <div style={styles.upcomingDayLabel}>
                      {formatUpcomingDay(date, today)}
                    </div>
                    {rows.map((row) => (
                      <UpcomingRow
                        key={row.action.id}
                        row={row}
                        token={token}
                      />
                    ))}
                  </div>
                ))}
                {upcoming.length > UPCOMING_COLLAPSED_LIMIT && (
                  <button
                    onClick={() => setUpcomingShowAll(!upcomingShowAll)}
                    style={styles.upcomingShowAllBtn}
                  >
                    {upcomingShowAll
                      ? "Show less"
                      : `Show all ${upcoming.length}`}
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {data.recent.length > 0 && (
        <Section label="Recent" dim>
          <RecentList rows={data.recent} token={token} />
        </Section>
      )}

      {/* Modals */}
      {menuRow && (
        <RowMenu
          row={menuRow}
          today={today}
          onClose={() => setMenuRow(null)}
          onLogWithDetails={() => {
            window.location.href = `/o/${token}/c/${menuRow.contact.handle}`;
          }}
          onPush={(target) => handlePush(menuRow, target)}
          onReschedule={() => {
            setReschedulingAction(menuRow.action);
            setMenuRow(null);
          }}
          onDelete={() => handleDeleteAction(menuRow)}
          onMarkDead={() => handleMarkDead(menuRow)}
          onEditContact={() => {
            setEditingContact(menuRow.contact);
            setMenuRow(null);
          }}
          onOpenContact={() => {
            window.location.href = `/o/${token}/c/${menuRow.contact.handle}`;
          }}
        />
      )}

      {editingContact && (
        <EditContactModal
          contact={editingContact}
          onClose={() => setEditingContact(null)}
          onSave={(patch) => handleEditContact(editingContact.id, patch)}
        />
      )}

      {reschedulingAction && (
        <RescheduleModal
          action={reschedulingAction}
          today={today}
          onClose={() => setReschedulingAction(null)}
          onSave={(newDate) =>
            handleReschedule(reschedulingAction.id, newDate)
          }
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────

function Section({
  label,
  tone,
  dim,
  children,
}: {
  label: string;
  tone?: "warn";
  dim?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.section}>
      <div
        style={{
          ...styles.sectionLabel,
          color:
            tone === "warn" ? COLOR.danger : dim ? COLOR.muted : COLOR.text,
        }}
      >
        {label}
      </div>
      <div style={styles.sectionBody}>{children}</div>
    </section>
  );
}

// ─── Active row (overdue or today) ──────────────────────────

function Row({
  row,
  today,
  token,
  showOverduePatina,
  onComplete,
  onMenuOpen,
  disabled,
}: {
  row: OutreachRow;
  today: string;
  token: string;
  showOverduePatina?: boolean;
  onComplete: () => void;
  onMenuOpen: () => void;
  disabled?: boolean;
}) {
  const overdueDays =
    showOverduePatina && row.action.originally_due
      ? daysBetween(row.action.originally_due, today)
      : 0;

  return (
    <div style={styles.row}>
      <a
        href={`/o/${token}/c/${row.contact.handle}`}
        style={styles.rowMain}
      >
        <div style={styles.rowText}>
          <a
            href={`https://instagram.com/${row.contact.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.handleLink}
            onClick={(e) => e.stopPropagation()}
          >
            @{row.contact.handle}
          </a>
          <span style={styles.rowSep}> — </span>
          <span style={styles.rowAction}>
            {PLANNED_LABEL[row.action.action_type]}
          </span>
        </div>
        {overdueDays > 0 && (
          <div style={styles.overduePatina}>Overdue {overdueDays}d</div>
        )}
        {row.action.notes && (
          <div style={styles.rowNotes}>{row.action.notes}</div>
        )}
      </a>
      <div style={styles.rowControls}>
        <button
          onClick={onComplete}
          disabled={disabled}
          style={styles.checkBtn}
          aria-label="Mark done"
        >
          ✓
        </button>
        <button
          onClick={onMenuOpen}
          disabled={disabled}
          style={styles.menuBtn}
          aria-label="More options"
        >
          ⋯
        </button>
      </div>
    </div>
  );
}

// ─── Done row ───────────────────────────────────────────────

function DoneRow({ row, token }: { row: OutreachRow; token: string }) {
  return (
    <a
      href={`/o/${token}/c/${row.contact.handle}`}
      style={styles.doneRow}
    >
      <span style={styles.doneCheck}>✓</span>{" "}
      <a
        href={`https://instagram.com/${row.contact.handle}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...styles.handleLink, color: COLOR.muted }}
        onClick={(e) => e.stopPropagation()}
      >
        @{row.contact.handle}
      </a>
      <span style={{ color: COLOR.muted }}>
        {" "}
        — {DONE_LABEL[row.action.action_type]}
      </span>
    </a>
  );
}

// ─── Recent list ────────────────────────────────────────────

function RecentList({ rows, token }: { rows: OutreachRow[]; token: string }) {
  return (
    <ul style={styles.recentList}>
      {rows.map((row) => (
        <li key={row.action.id} style={styles.recentItem}>
          <a
            href={`/o/${token}/c/${row.contact.handle}`}
            style={styles.recentLink}
          >
            <span style={{ color: COLOR.muted }}>
              {row.action.completed_at
                ? DAY_NAMES[new Date(row.action.completed_at).getDay()]
                : ""}
            </span>{" "}
            — {DONE_LABEL[row.action.action_type]} to{" "}
            <span style={styles.recentHandle}>@{row.contact.handle}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

// ─── Upcoming row ───────────────────────────────────────────

function UpcomingRow({ row, token }: { row: OutreachRow; token: string }) {
  return (
    <a
      href={`/o/${token}/c/${row.contact.handle}`}
      style={styles.upcomingRow}
    >
      <span style={styles.upcomingHandle}>@{row.contact.handle}</span>
      <span style={styles.rowSep}> — </span>
      <span style={styles.rowAction}>
        {PLANNED_LABEL[row.action.action_type]}
      </span>
    </a>
  );
}

// ─── Quick capture (collapsed/expanded) ─────────────────────

function QuickCaptureBlock({
  expanded,
  onExpand,
  onCollapse,
  onSubmit,
  disabled,
}: {
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onSubmit: (p: {
    handle: string;
    action_type: ActionType;
    notes: string | null;
    days_until: number;
  }) => void;
  disabled?: boolean;
}) {
  const [handle, setHandle] = useState("");
  const [actionType, setActionType] = useState<ActionType>("dm_sent");
  const [notes, setNotes] = useState("");
  const [daysUntil, setDaysUntil] = useState(1);

  function reset() {
    setHandle("");
    setActionType("dm_sent");
    setNotes("");
    setDaysUntil(1);
  }

  if (!expanded) {
    return (
      <div style={styles.section}>
        <button onClick={onExpand} style={styles.captureCollapsed}>
          + Quick capture
        </button>
      </div>
    );
  }

  return (
    <section style={styles.section}>
      <div style={styles.sectionLabel}>Quick capture</div>
      <div style={styles.captureCard}>
        <label style={styles.label}>
          Handle
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              const cleaned = parseHandleInput(pasted);
              if (cleaned !== pasted) {
                e.preventDefault();
                setHandle(cleaned);
              }
            }}
            onBlur={() => setHandle(parseHandleInput(handle))}
            placeholder="@handle or instagram URL"
            style={styles.input}
            autoFocus
          />
        </label>

        <label style={styles.label}>
          Action
          <div style={styles.btnGroup}>
            {CAPTURE_INTENTS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setActionType(opt.value)}
                style={{
                  ...styles.toggleBtn,
                  ...(actionType === opt.value ? styles.toggleBtnActive : {}),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </label>

        <label style={styles.label}>
          Notes (optional)
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          When
          <div style={styles.btnGroup}>
            {TIMING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDaysUntil(opt.value)}
                style={{
                  ...styles.toggleBtn,
                  ...(daysUntil === opt.value ? styles.toggleBtnActive : {}),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </label>

        <div style={styles.actions}>
          <button
            onClick={() => {
              if (!handle.trim()) return;
              onSubmit({
                handle: handle.trim(),
                action_type: actionType,
                notes: notes.trim() || null,
                days_until: daysUntil,
              });
              reset();
            }}
            disabled={disabled || !handle.trim()}
            style={styles.btnPrimary}
          >
            Capture
          </button>
          <button
            onClick={() => {
              reset();
              onCollapse();
            }}
            style={styles.btnGhost}
          >
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Row menu ───────────────────────────────────────────────

function RowMenu({
  row,
  today,
  onClose,
  onLogWithDetails,
  onPush,
  onReschedule,
  onDelete,
  onMarkDead,
  onEditContact,
  onOpenContact,
}: {
  row: OutreachRow;
  today: string;
  onClose: () => void;
  onLogWithDetails: () => void;
  onPush: (target: "today" | "tomorrow") => void;
  onReschedule: () => void;
  onDelete: () => void;
  onMarkDead: () => void;
  onEditContact: () => void;
  onOpenContact: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <div style={styles.menuHeader}>@{row.contact.handle}</div>
      <button style={styles.menuItem} onClick={onLogWithDetails}>
        Log with details
      </button>
      <button style={styles.menuItem} onClick={() => onPush("tomorrow")}>
        Push to tomorrow
      </button>
      <button style={styles.menuItem} onClick={onReschedule}>
        Reschedule
      </button>
      <button
        style={{ ...styles.menuItem, color: COLOR.danger }}
        onClick={onDelete}
      >
        Delete this action
      </button>
      <button
        style={{ ...styles.menuItem, color: COLOR.danger }}
        onClick={onMarkDead}
      >
        Mark contact dead
      </button>
      <button style={styles.menuItem} onClick={onEditContact}>
        Edit contact
      </button>
      <button style={styles.menuItem} onClick={onOpenContact}>
        Open contact page
      </button>
      <button style={styles.menuItemCancel} onClick={onClose}>
        Cancel
      </button>
    </Modal>
  );
}

// ─── Edit contact modal ─────────────────────────────────────

function EditContactModal({
  contact,
  onClose,
  onSave,
}: {
  contact: OutreachContact;
  onClose: () => void;
  onSave: (patch: Partial<OutreachContact>) => void;
}) {
  const [handle, setHandle] = useState(contact.handle);
  const [name, setName] = useState(contact.name || "");
  const [category, setCategory] = useState(contact.category || "");
  const [notes, setNotes] = useState(contact.notes || "");

  return (
    <Modal onClose={onClose}>
      <div style={styles.menuHeader}>Edit contact</div>
      <label style={styles.label}>
        Handle
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            const cleaned = parseHandleInput(pasted);
            if (cleaned !== pasted) {
              e.preventDefault();
              setHandle(cleaned);
            }
          }}
          onBlur={() => setHandle(parseHandleInput(handle))}
          style={styles.input}
        />
      </label>
      <label style={styles.label}>
        Name (optional)
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />
      </label>
      <label style={styles.label}>
        Category (optional)
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="instructor, PTA, scout leader, etc."
          style={styles.input}
        />
      </label>
      <label style={styles.label}>
        Notes (optional)
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ ...styles.input, minHeight: "80px", fontFamily: "inherit" }}
        />
      </label>
      <div style={styles.actions}>
        <button
          style={styles.btnPrimary}
          onClick={() =>
            onSave({
              handle: handle.trim(),
              name: name.trim() || null,
              category: category.trim() || null,
              notes: notes.trim() || null,
            })
          }
        >
          Save
        </button>
        <button style={styles.btnGhost} onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// ─── Reschedule modal ───────────────────────────────────────

function RescheduleModal({
  action,
  today,
  onClose,
  onSave,
}: {
  action: OutreachAction;
  today: string;
  onClose: () => void;
  onSave: (newDate: string) => void;
}) {
  const [date, setDate] = useState(action.due_date || today);

  return (
    <Modal onClose={onClose}>
      <div style={styles.menuHeader}>Reschedule</div>
      <p
        style={{
          color: COLOR.muted,
          fontSize: "0.85rem",
          margin: "0 0 0.75rem",
        }}
      >
        This clears the overdue patina and sets a fresh commitment.
      </p>
      <input
        type="date"
        value={date}
        min={today}
        onChange={(e) => setDate(e.target.value)}
        style={styles.input}
      />
      <div style={styles.actions}>
        <button style={styles.btnPrimary} onClick={() => onSave(date)}>
          Save
        </button>
        <button style={styles.btnGhost} onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// ─── Modal wrapper ──────────────────────────────────────────

function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.modal}>{children}</div>
    </>
  );
}

// ─── Toast ──────────────────────────────────────────────────

function Toast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div style={styles.toast} onClick={onDismiss}>
      {message}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function parseHandleInput(input: string): string {
  let s = input.trim();
  if (!s) return "";
  if (
    /^(https?:\/\/|www\.|instagram\.com|tiktok\.com|x\.com|twitter\.com)/i.test(
      s
    )
  ) {
    const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    try {
      const u = new URL(withProto);
      const firstSegment = u.pathname.split("/").filter(Boolean)[0] || "";
      s = firstSegment;
    } catch {
      // fall through
    }
  }
  s = s.replace(/^@+/, "").replace(/\/+$/, "").trim().toLowerCase();
  return s;
}

function formatToday(today: string): string {
  const d = new Date(today + "T00:00:00");
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

function formatDateLong(date: string): string {
  return formatToday(date);
}

function formatUpcomingDay(date: string, today: string): string {
  // "Tomorrow" / "Wed, Apr 30" / "Mon, May 5"
  const todayDate = new Date(today + "T00:00:00");
  const dueDate = new Date(date + "T00:00:00");
  const diff = Math.round(
    (dueDate.getTime() - todayDate.getTime()) / (24 * 3600 * 1000)
  );
  if (diff === 1) return "Tomorrow";
  const dayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    dueDate.getDay()
  ];
  const monthShort = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][dueDate.getMonth()];
  return `${dayShort}, ${monthShort} ${dueDate.getDate()}`;
}

function buildCompleteToast(
  actionType: ActionType,
  followup: OutreachAction | null
): string {
  if (!followup || !followup.due_date) return "Logged. No follow-up scheduled.";
  const fmt = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "America/New_York",
  });
  const day = fmt.format(new Date(followup.due_date + "T12:00:00"));
  return `Logged. Next follow-up: ${day}.`;
}

function normalizeForDisplay(handle: string): string {
  let h = handle.trim();
  if (h.startsWith("@")) h = h.slice(1);
  return h.toLowerCase();
}

function groupByDueDate(rows: OutreachRow[]): [string, OutreachRow[]][] {
  const map = new Map<string, OutreachRow[]>();
  for (const r of rows) {
    const date = r.action.due_date || "";
    if (!date) continue;
    const arr = map.get(date) || [];
    arr.push(r);
    map.set(date, arr);
  }
  // Sort by date ascending
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

// ─── Styles ─────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: COLOR.bg,
    color: COLOR.text,
    padding: "1rem",
    maxWidth: "640px",
    margin: "0 auto",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  header: {
    padding: "0.5rem 0 1rem",
  },
  headerTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: COLOR.text,
  },
  subtitle: {
    fontSize: "0.85rem",
    color: COLOR.muted,
    marginTop: "0.25rem",
  },
  contactsLink: {
    color: COLOR.accent,
    fontSize: "0.85rem",
    fontWeight: 600,
    textDecoration: "none",
    paddingTop: "0.4rem",
  },
  section: {
    marginBottom: "1.5rem",
  },
  sectionLabel: {
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLOR.muted,
    marginBottom: "0.5rem",
    padding: "0 0.25rem",
  },
  sectionBody: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  emptyState: {
    background: COLOR.card,
    border: `1px dashed ${COLOR.border}`,
    borderRadius: "12px",
    padding: "1.25rem 1rem",
    color: COLOR.muted,
    fontSize: "0.9rem",
    textAlign: "center",
  },
  row: {
    background: COLOR.card,
    border: `1px solid ${COLOR.border}`,
    borderRadius: "12px",
    padding: "0.85rem 1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    boxShadow: COLOR.shadow,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    color: COLOR.text,
    textDecoration: "none",
    cursor: "pointer",
  },
  rowText: {
    fontSize: "0.95rem",
    lineHeight: 1.4,
  },
  handleLink: {
    color: COLOR.accent,
    textDecoration: "underline",
    fontWeight: 600,
  },
  rowSep: {
    color: COLOR.muted,
  },
  rowAction: {
    color: COLOR.text,
  },
  overduePatina: {
    fontSize: "0.75rem",
    color: COLOR.danger,
    fontWeight: 600,
    marginTop: "0.2rem",
  },
  rowNotes: {
    fontSize: "0.8rem",
    color: COLOR.muted,
    marginTop: "0.25rem",
  },
  rowControls: {
    display: "flex",
    gap: "0.4rem",
    flexShrink: 0,
  },
  checkBtn: {
    width: "44px",
    height: "44px",
    border: "none",
    borderRadius: "10px",
    background: COLOR.successSoft,
    color: COLOR.success,
    fontSize: "1.25rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtn: {
    width: "44px",
    height: "44px",
    border: "none",
    borderRadius: "10px",
    background: "transparent",
    color: COLOR.accent,
    fontSize: "1.5rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  doneRow: {
    background: COLOR.card,
    border: `1px solid ${COLOR.border}`,
    borderRadius: "12px",
    padding: "0.65rem 1rem",
    fontSize: "0.9rem",
    textDecoration: "line-through",
    textDecorationColor: COLOR.muted,
    color: COLOR.text,
    display: "block",
  },
  doneCheck: {
    color: COLOR.success,
    fontWeight: 700,
    textDecoration: "none",
    display: "inline-block",
    marginRight: "0.25rem",
  },
  recentList: {
    margin: 0,
    padding: "0 0.5rem",
    listStyle: "none",
  },
  recentItem: {
    fontSize: "0.85rem",
    padding: "0.35rem 0",
    borderBottom: `1px solid ${COLOR.border}`,
  },
  recentLink: {
    color: COLOR.text,
    textDecoration: "none",
    display: "block",
  },
  recentHandle: {
    color: COLOR.accent,
    fontWeight: 600,
  },
  upcomingToggle: {
    width: "100%",
    background: COLOR.card,
    border: `1px solid ${COLOR.border}`,
    borderRadius: "12px",
    padding: "0.85rem 1rem",
    color: COLOR.muted,
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
  },
  upcomingCollapseBtn: {
    border: "none",
    background: "transparent",
    color: COLOR.muted,
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "inherit",
    padding: 0,
  },
  upcomingDayGroup: {
    background: COLOR.card,
    border: `1px solid ${COLOR.border}`,
    borderRadius: "12px",
    padding: "0.75rem 1rem",
    boxShadow: COLOR.shadow,
  },
  upcomingDayLabel: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: COLOR.muted,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "0.5rem",
  },
  upcomingRow: {
    display: "block",
    padding: "0.4rem 0",
    fontSize: "0.9rem",
    color: COLOR.text,
    textDecoration: "none",
    borderTop: `1px solid ${COLOR.border}`,
  },
  upcomingHandle: {
    color: COLOR.accent,
    fontWeight: 600,
  },
  upcomingShowAllBtn: {
    width: "100%",
    background: "transparent",
    border: `1px solid ${COLOR.border}`,
    borderRadius: "10px",
    padding: "0.65rem",
    color: COLOR.accent,
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: "0.5rem",
  },
  captureCollapsed: {
    width: "100%",
    background: COLOR.card,
    border: `1px dashed ${COLOR.border}`,
    borderRadius: "12px",
    padding: "0.85rem 1rem",
    color: COLOR.accent,
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
  },
  captureCard: {
    background: COLOR.card,
    border: `1px solid ${COLOR.border}`,
    borderRadius: "12px",
    padding: "1rem",
    boxShadow: COLOR.shadow,
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    fontSize: "0.78rem",
    fontWeight: 600,
    color: COLOR.muted,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  input: {
    border: `1px solid ${COLOR.border}`,
    borderRadius: "8px",
    padding: "0.6rem 0.75rem",
    fontSize: "0.95rem",
    color: COLOR.text,
    background: COLOR.card,
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    textTransform: "none",
    letterSpacing: 0,
    fontWeight: 400,
  },
  btnGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.4rem",
  },
  toggleBtn: {
    border: `1px solid ${COLOR.border}`,
    background: COLOR.card,
    color: COLOR.text,
    padding: "0.5rem 0.85rem",
    borderRadius: "999px",
    fontSize: "0.85rem",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  toggleBtnActive: {
    background: COLOR.primary,
    borderColor: COLOR.primary,
    color: "white",
    fontWeight: 600,
  },
  actions: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.5rem",
  },
  btnPrimary: {
    border: "none",
    background: COLOR.primary,
    color: "white",
    padding: "0.65rem 1.25rem",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnGhost: {
    border: `1px solid ${COLOR.border}`,
    background: "transparent",
    color: COLOR.muted,
    padding: "0.65rem 1.25rem",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(17, 19, 24, 0.4)",
    zIndex: 100,
  },
  modal: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: COLOR.card,
    borderRadius: "16px 16px 0 0",
    padding: "1rem",
    maxWidth: "640px",
    margin: "0 auto",
    zIndex: 101,
    boxShadow: "0 -8px 24px rgba(17, 19, 24, 0.15)",
    maxHeight: "80vh",
    overflowY: "auto",
  },
  menuHeader: {
    fontWeight: 700,
    fontSize: "1rem",
    padding: "0.5rem 0.5rem 0.85rem",
    color: COLOR.text,
    borderBottom: `1px solid ${COLOR.border}`,
    marginBottom: "0.5rem",
  },
  menuItem: {
    display: "block",
    width: "100%",
    border: "none",
    background: "transparent",
    textAlign: "left",
    padding: "0.85rem 0.5rem",
    fontSize: "0.95rem",
    color: COLOR.text,
    cursor: "pointer",
    borderRadius: "6px",
    fontFamily: "inherit",
  },
  menuItemCancel: {
    display: "block",
    width: "100%",
    border: "none",
    background: COLOR.bg,
    textAlign: "center",
    padding: "0.85rem 0.5rem",
    marginTop: "0.5rem",
    fontSize: "0.95rem",
    color: COLOR.muted,
    fontWeight: 600,
    cursor: "pointer",
    borderRadius: "8px",
    fontFamily: "inherit",
  },
  toast: {
    position: "fixed",
    bottom: "1.5rem",
    left: "50%",
    transform: "translateX(-50%)",
    background: COLOR.text,
    color: "white",
    padding: "0.85rem 1.25rem",
    borderRadius: "10px",
    fontSize: "0.9rem",
    fontWeight: 500,
    boxShadow: "0 8px 24px rgba(17, 19, 24, 0.25)",
    zIndex: 200,
    maxWidth: "90%",
    cursor: "pointer",
  },
};
