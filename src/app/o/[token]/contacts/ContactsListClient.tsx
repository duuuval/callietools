"use client";

import { useMemo, useState } from "react";
import type { OutreachContact } from "@/lib/outreach";

const COLOR = {
  bg: "#F6F6F8",
  card: "#FFFFFF",
  text: "#111318",
  muted: "#5B616E",
  border: "#E6E8EF",
  primary: "#4F6BED",
  accent: "#D4775B",
  danger: "#B23A3A",
  shadow: "0 10px 22px rgba(17, 19, 24, 0.08)",
};

interface ContactWithMeta {
  contact: OutreachContact;
  lastActionLabel: string | null;
  pendingCount: number;
}

interface Props {
  token: string;
  contacts: ContactWithMeta[];
}

type SortMode = "recent" | "alpha";

export default function ContactsListClient({ token, contacts }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = contacts;
    if (q) {
      list = contacts.filter(
        (c) =>
          c.contact.handle.toLowerCase().includes(q) ||
          (c.contact.name && c.contact.name.toLowerCase().includes(q)) ||
          (c.contact.category &&
            c.contact.category.toLowerCase().includes(q))
      );
    }
    return list;
  }, [contacts, query]);

  // Split into active vs dead, sort each independently
  const { active, dead } = useMemo(() => {
    const active = filtered.filter((c) => !c.contact.is_dead);
    const dead = filtered.filter((c) => c.contact.is_dead);
    const sorter =
      sort === "alpha"
        ? (a: ContactWithMeta, b: ContactWithMeta) =>
            a.contact.handle.localeCompare(b.contact.handle)
        : (a: ContactWithMeta, b: ContactWithMeta) =>
            (b.contact.updated_at || "").localeCompare(
              a.contact.updated_at || ""
            );
    active.sort(sorter);
    dead.sort(sorter);
    return { active, dead };
  }, [filtered, sort]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <a href={`/o/${token}`} style={styles.backLink}>
          ← Home
        </a>
        <div style={styles.title}>Contacts</div>
        <div style={styles.subtitle}>{contacts.length} total</div>
      </header>

      <div style={styles.controls}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search handle, name, or category"
          style={styles.search}
        />
        <div style={styles.sortToggle}>
          <button
            onClick={() => setSort("recent")}
            style={{
              ...styles.sortBtn,
              ...(sort === "recent" ? styles.sortBtnActive : {}),
            }}
          >
            Recent
          </button>
          <button
            onClick={() => setSort("alpha")}
            style={{
              ...styles.sortBtn,
              ...(sort === "alpha" ? styles.sortBtnActive : {}),
            }}
          >
            A–Z
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={styles.emptyState}>
          {query
            ? `No matches for "${query}".`
            : "No contacts yet. Capture someone from the home base."}
        </div>
      )}

      {active.length > 0 && (
        <ul style={styles.list}>
          {active.map((c) => (
            <ContactRow key={c.contact.id} c={c} token={token} />
          ))}
        </ul>
      )}

      {dead.length > 0 && (
        <>
          <div style={styles.deadDivider}>Dead</div>
          <ul style={styles.list}>
            {dead.map((c) => (
              <ContactRow key={c.contact.id} c={c} token={token} dead />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ContactRow({
  c,
  token,
  dead,
}: {
  c: ContactWithMeta;
  token: string;
  dead?: boolean;
}) {
  return (
    <li>
      <a
        href={`/o/${token}/c/${c.contact.handle}`}
        style={{ ...styles.row, ...(dead ? styles.rowDead : {}) }}
      >
        <div style={styles.rowMain}>
          <div style={styles.rowTop}>
            <span style={styles.handle}>@{c.contact.handle}</span>
            {c.contact.name && (
              <span style={styles.name}>{c.contact.name}</span>
            )}
            {c.pendingCount > 0 && (
              <span style={styles.pendingBadge}>
                {c.pendingCount} pending
              </span>
            )}
            {dead && <span style={styles.deadBadge}>dead</span>}
          </div>
          {(c.lastActionLabel || c.contact.category) && (
            <div style={styles.rowMeta}>
              {c.contact.category && (
                <span style={styles.category}>{c.contact.category}</span>
              )}
              {c.lastActionLabel && c.contact.category && (
                <span style={styles.metaSep}> · </span>
              )}
              {c.lastActionLabel && <span>{c.lastActionLabel}</span>}
            </div>
          )}
        </div>
        <div style={styles.chevron}>›</div>
      </a>
    </li>
  );
}

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
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
    marginBottom: "1rem",
  },
  search: {
    border: `1px solid ${COLOR.border}`,
    borderRadius: "10px",
    padding: "0.7rem 0.9rem",
    fontSize: "0.95rem",
    color: COLOR.text,
    background: COLOR.card,
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  sortToggle: {
    display: "inline-flex",
    background: COLOR.card,
    border: `1px solid ${COLOR.border}`,
    borderRadius: "999px",
    padding: "3px",
    alignSelf: "flex-start",
  },
  sortBtn: {
    border: "none",
    background: "transparent",
    color: COLOR.muted,
    padding: "0.4rem 0.95rem",
    fontSize: "0.8rem",
    fontWeight: 600,
    borderRadius: "999px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  sortBtnActive: {
    background: COLOR.primary,
    color: "white",
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
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    background: COLOR.card,
    border: `1px solid ${COLOR.border}`,
    borderRadius: "12px",
    padding: "0.85rem 1rem",
    boxShadow: COLOR.shadow,
    textDecoration: "none",
    color: COLOR.text,
  },
  rowDead: {
    opacity: 0.55,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    flexWrap: "wrap",
  },
  handle: {
    color: COLOR.accent,
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  name: {
    color: COLOR.muted,
    fontSize: "0.85rem",
  },
  pendingBadge: {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: COLOR.primary,
    background: "rgba(79, 107, 237, 0.12)",
    padding: "0.15rem 0.5rem",
    borderRadius: "999px",
  },
  deadBadge: {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: COLOR.danger,
    background: "rgba(178, 58, 58, 0.1)",
    padding: "0.15rem 0.5rem",
    borderRadius: "999px",
  },
  rowMeta: {
    fontSize: "0.8rem",
    color: COLOR.muted,
    marginTop: "0.25rem",
  },
  category: {
    fontStyle: "italic",
  },
  metaSep: {
    color: COLOR.border,
  },
  chevron: {
    color: COLOR.muted,
    fontSize: "1.5rem",
    fontWeight: 300,
  },
  deadDivider: {
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLOR.danger,
    marginTop: "1.5rem",
    marginBottom: "0.5rem",
    padding: "0 0.25rem",
  },
};
