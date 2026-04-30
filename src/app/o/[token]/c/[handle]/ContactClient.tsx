"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  type ActionType,
  type ContactPageData,
  type OutreachAction,
  type OutreachContact,
  daysBetween,
} from "@/lib/outreach";

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

const LOG_ACTIONS: { value: ActionType; label: string }[] = [
  { value: "dm_sent", label: "DM sent" },
  { value: "replied", label: "Replied" },
  { value: "calendar_built", label: "Built calendar" },
  { value: "link_sent", label: "Sent link" },
  { value: "shared", label: "They shared" },
  { value: "comment", label: "Commented" },
  { value: "follow_up", label: "Followed up" },
  { value: "other", label: "Other" },
];

const FOLLOWUP_OPTIONS: { value: number | null; label: string }[] = [
  { value: 3, label: "In 3 days" },
  { value: 7, label: "In 7 days" },
  { value: 14, label: "In 14 days" },
  { value: null, label: "None" },
];

interface Props {
  token: string;
  today: string;
  data: ContactPageData;
}

export default function ContactClient({ token, today, data }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [menuAction, setMenuAction] = useState<OutreachAction | null>(null);
  const [editing, setEditing] = useState(false);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

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

  async function handleComplete(action: OutreachAction) {
    const result = await call(
      "complete",
      { planned_action_id: action.id },
      "Logged."
    );
    if (result) {
      const followup = result.followup;
      if (followup && followup.due_date) {
        const fmt = new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          timeZone: "America/New_York",
        });
        const day = fmt.format(new Date(followup.due_date + "T12:00:00"));
        setToast(`Logged. Next follow-up: ${day}.`);
      } else {
        setToast("Logged. No follow-up scheduled.");
      }
    }
  }

  async function handlePush(action: OutreachAction, target: "today" | "tomorrow") {
    setMenuAction(null);
    await call(
      "push",
      { action_id: action.id, to: target },
      target === "tomorrow" ? "Pushed to tomorrow." : "Pushed to today."
    );
  }

  async function handleReschedule(actionId: string, newDate: string) {
    setReschedulingId(null);
    await call(
      "reschedule",
      { action_id: actionId, new_due_date: newDate },
      `Rescheduled to ${formatDateLong(newDate)}.`
    );
  }

  async function handleDelete(action: OutreachAction) {
    setMenuAction(null);
    if (
      !confirm(
        `Delete the planned "${PLANNED_LABEL[action.action_type]}"?`
      )
    )
      return;
    await call("delete-action", { action_id: action.id }, "Deleted.");
  }

  async function handleMarkDead() {
    setMenuAction(null);
    if (
      !confirm(
        `Mark @${data.contact.handle} as dead? Their items will stop appearing on the home base.`
      )
    )
      return;
    await call(
      "mark-dead",
      { contact_id: data.contact.id },
      `Marked @${data.contact.handle} as dead.`
    );
    // Bounce back to home base since this contact won't be active anymore
    setTimeout(() => router.push(`/o/${token}`), 600);
  }

  async function handleLogSubmit(payload: {
    action_type: ActionType;
    notes: string | null;
    followup_days: number | null;
  }) {
    await call(
      "log",
      {
        contact_id: data.contact.id,
        action_type: payload.action_type,
        notes: payload.notes,
        followup_days: payload.followup_days,
      },
      payload.followup_days
        ? `Logged. Next follow-up in ${payload.followup_days}d.`
        : "Logged. No follow-up scheduled."
    );
  }

  async function handleEditSave(patch: Partial<OutreachContact>) {
    setEditing(false);
    const result = await call(
      "edit-contact",
      { contact_id: data.contact.id, patch },
      "Contact updated."
    );
    // If the handle changed, redirect to the new URL
    if (result?.contact && result.contact.handle !== data.contact.handle) {
      setTimeout(
        () => router.push(`/o/${token}/c/${result.contact.handle}`),
        400
      );
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerNav}>
          <a href={`/o/${token}`} style={styles.backLink}>
            ← Home
          </a>
          <a href={`/o/${token}/contacts`} style={styles.backLink}>
            All contacts →
          </a>
        </div>
        <div style={styles.titleRow}>
          <a
            href={`https://instagram.com/${data.contact.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.handleLink}
          >
            @{data.contact.handle}
          </a>
          <button onClick={() => setEditing(true)} style={styles.editBtn}>
            Edit
          </button>
        </div>
        {data.contact.name && (
          <div style={styles.contactName}>{data.contact.name}</div>
        )}
        {data.contact.category && (
          <div style={styles.contactMeta}>{data.contact.category}</div>
        )}
        {data.contact.notes && (
          <div style={styles.contactNotes}>{data.contact.notes}</div>
        )}
        {data.contact.is_dead && (
          <div style={styles.deadNotice}>This contact is marked dead.</div>
        )}
      </header>

      <Section
        label={
          data.plannedActions.length > 0
            ? `Pending (${data.plannedActions.length})`
            : "Pending"
        }
      >
        {data.plannedActions.length === 0 && (
          <div style={styles.emptyState}>No pending actions.</div>
        )}
        {data.plannedActions.map((action) => {
          const overdueDays =
            action.originally_due && action.originally_due < today
              ? daysBetween(action.originally_due, today)
              : 0;
          return (
            <div key={action.id} style={styles.plannedRow}>
              <div style={styles.rowMain}>
                <div style={styles.rowText}>
                  <span style={styles.rowAction}>
                    {PLANNED_LABEL[action.action_type]}
                  </span>
                  <span style={styles.rowSep}> · </span>
                  <span style={styles.rowDate}>
                    {formatDueDate(action.due_date, today)}
                  </span>
                </div>
                {overdueDays > 0 && (
                  <div style={styles.overduePatina}>
                    Overdue {overdueDays}d
                  </div>
                )}
                {action.notes && (
                  <div style={styles.rowNotes}>{action.notes}</div>
                )}
              </div>
              <div style={styles.rowControls}>
                <button
                  onClick={() => handleComplete(action)}
                  disabled={isPending}
                  style={styles.checkBtn}
                  aria-label="Mark done"
                >
                  ✓
                </button>
                <button
                  onClick={() => setMenuAction(action)}
                  disabled={isPending}
                  style={styles.menuBtn}
                  aria-label="More options"
                >
                  ⋯
                </button>
              </div>
            </div>
          );
        })}
      </Section>

      <Section label="Log activity">
        <LogForm onSubmit={handleLogSubmit} disabled={isPending} />
      </Section>

      <Section
        label={
          data.doneActions.length > 0
            ? `History (${data.doneActions.length})`
            : "History"
        }
        dim
      >
        {data.doneActions.length === 0 && (
          <div style={styles.emptyState}>No history yet.</div>
        )}
        {data.doneActions.map((action) => (
          <div key={action.id} style={styles.historyRow}>
            <div style={styles.historyText}>
              <span style={styles.historyAction}>
                {DONE_LABEL[action.action_type]}
              </span>
              <span style={styles.historyDate}>
                {formatHistoryDate(action.completed_at)}
              </span>
            </div>
            {action.notes && (
              <div style={styles.rowNotes}>{action.notes}</div>
            )}
          </div>
        ))}
      </Section>

      {menuAction && (
        <ActionMenu
          action={menuAction}
          today={today}
          onClose={() => setMenuAction(null)}
          onPush={(target) => handlePush(menuAction, target)}
          onReschedule={() => {
            setReschedulingId(menuAction.id);
            setMenuAction(null);
          }}
          onDelete={() => handleDelete(menuAction)}
          onMarkDead={handleMarkDead}
          onEditContact={() => {
            setMenuAction(null);
            setEditing(true);
          }}
        />
      )}

      {editing && (
        <EditContactModal
          contact={data.contact}
          onClose={() => setEditing(false)}
          onSave={handleEditSave}
        />
      )}

      {reschedulingId && (
        <RescheduleModal
          actionId={reschedulingId}
          today={today}
          currentDue={
            data.plannedActions.find((a) => a.id === reschedulingId)
              ?.due_date || today
          }
          onClose={() => setReschedulingId(null)}
          onSave={(newDate) => handleReschedule(reschedulingId, newDate)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────

function Section({
  label,
  dim,
  children,
}: {
  label: string;
  dim?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.section}>
      <div
        style={{
          ...styles.sectionLabel,
          color: dim ? COLOR.muted : COLOR.text,
        }}
      >
        {label}
      </div>
      <div style={styles.sectionBody}>{children}</div>
    </section>
  );
}

// ─── Log form ───────────────────────────────────────────────

function LogForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (p: {
    action_type: ActionType;
    notes: string | null;
    followup_days: number | null;
  }) => void;
  disabled?: boolean;
}) {
  const [actionType, setActionType] = useState<ActionType>("dm_sent");
  const [notes, setNotes] = useState("");
  const [followup, setFollowup] = useState<number | null>(3);

  function reset() {
    setActionType("dm_sent");
    setNotes("");
    setFollowup(3);
  }

  return (
    <div style={styles.captureCard}>
      <label style={styles.label}>
        What happened
        <div style={styles.btnGroup}>
          {LOG_ACTIONS.map((opt) => (
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
        Follow up
        <div style={styles.btnGroup}>
          {FOLLOWUP_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => setFollowup(opt.value)}
              style={{
                ...styles.toggleBtn,
                ...(followup === opt.value ? styles.toggleBtnActive : {}),
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
            onSubmit({
              action_type: actionType,
              notes: notes.trim() || null,
              followup_days: followup,
            });
            reset();
          }}
          disabled={disabled}
          style={styles.btnPrimary}
        >
          Log
        </button>
      </div>
    </div>
  );
}

// ─── Action menu ────────────────────────────────────────────

function ActionMenu({
  action,
  today,
  onClose,
  onPush,
  onReschedule,
  onDelete,
  onMarkDead,
  onEditContact,
}: {
  action: OutreachAction;
  today: string;
  onClose: () => void;
  onPush: (target: "today" | "tomorrow") => void;
  onReschedule: () => void;
  onDelete: () => void;
  onMarkDead: () => void;
  onEditContact: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <div style={styles.menuHeader}>
        {PLANNED_LABEL[action.action_type]}
      </div>
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
  actionId,
  today,
  currentDue,
  onClose,
  onSave,
}: {
  actionId: string;
  today: string;
  currentDue: string;
  onClose: () => void;
  onSave: (newDate: string) => void;
}) {
  const [date, setDate] = useState(currentDue);

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

// ─── Modal wrapper, Toast ───────────────────────────────────

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

function formatDueDate(date: string | null, today: string): string {
  if (!date) return "";
  if (date === today) return "Today";
  const todayDate = new Date(today + "T00:00:00");
  const dueDate = new Date(date + "T00:00:00");
  const diff = Math.round(
    (dueDate.getTime() - todayDate.getTime()) / (24 * 3600 * 1000)
  );
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  if (diff < -1 && diff > -7) return `${-diff} days ago`;
  return formatDateLong(date);
}

function formatDateLong(date: string): string {
  const d = new Date(date + "T00:00:00");
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

function formatHistoryDate(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso);
  const now = new Date();
  const days = Math.floor(
    (now.getTime() - then.getTime()) / (24 * 3600 * 1000)
  );
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[then.getMonth()]} ${then.getDate()}`;
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
  backLink: {
    display: "inline-block",
    color: COLOR.accent,
    fontSize: "0.85rem",
    fontWeight: 600,
    textDecoration: "none",
    marginBottom: "0.5rem",
  },
  headerNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  handleLink: {
    color: COLOR.accent,
    fontSize: "1.5rem",
    fontWeight: 700,
    textDecoration: "underline",
  },
  editBtn: {
    border: `1px solid ${COLOR.border}`,
    background: COLOR.card,
    color: COLOR.muted,
    padding: "0.35rem 0.75rem",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  contactName: {
    fontSize: "1rem",
    color: COLOR.text,
    marginTop: "0.4rem",
  },
  contactMeta: {
    fontSize: "0.85rem",
    color: COLOR.muted,
    marginTop: "0.25rem",
    fontStyle: "italic",
  },
  contactNotes: {
    fontSize: "0.9rem",
    color: COLOR.text,
    marginTop: "0.5rem",
    padding: "0.6rem 0.85rem",
    background: COLOR.card,
    border: `1px solid ${COLOR.border}`,
    borderRadius: "8px",
  },
  deadNotice: {
    fontSize: "0.85rem",
    color: COLOR.danger,
    marginTop: "0.6rem",
    padding: "0.5rem 0.85rem",
    background: "rgba(178, 58, 58, 0.08)",
    borderRadius: "8px",
    fontWeight: 600,
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
    padding: "1rem",
    color: COLOR.muted,
    fontSize: "0.9rem",
    textAlign: "center",
  },
  plannedRow: {
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
  },
  rowText: {
    fontSize: "0.95rem",
    lineHeight: 1.4,
  },
  rowAction: {
    color: COLOR.text,
    fontWeight: 600,
  },
  rowSep: {
    color: COLOR.muted,
  },
  rowDate: {
    color: COLOR.muted,
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
  historyRow: {
    background: COLOR.card,
    border: `1px solid ${COLOR.border}`,
    borderRadius: "12px",
    padding: "0.65rem 1rem",
    fontSize: "0.9rem",
  },
  historyText: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "0.5rem",
  },
  historyAction: {
    color: COLOR.text,
    fontWeight: 600,
  },
  historyDate: {
    color: COLOR.muted,
    fontSize: "0.8rem",
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
