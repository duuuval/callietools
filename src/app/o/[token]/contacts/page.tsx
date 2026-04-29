import { notFound } from "next/navigation";
import {
  checkOutreachToken,
  getAllContacts,
  type OutreachContact,
} from "@/lib/outreach";
import { createClient } from "@supabase/supabase-js";
import ContactsListClient from "./ContactsListClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Outreach — Contacts",
  robots: { index: false, follow: false },
};

const DONE_LABEL: Record<string, string> = {
  dm_sent: "DM sent",
  calendar_built: "Calendar built",
  link_sent: "Link sent",
  replied: "Replied",
  shared: "Shared",
  comment: "Commented",
  follow_up: "Followed up",
  other: "Reached out",
};

interface Props {
  params: { token: string };
}

export default async function ContactsListPage({ params }: Props) {
  if (!checkOutreachToken(params.token)) {
    notFound();
  }

  const contacts = await getAllContacts();
  const meta = await getMetaForContacts(contacts);

  return <ContactsListClient token={params.token} contacts={meta} />;
}

interface ContactWithMeta {
  contact: OutreachContact;
  lastActionLabel: string | null;
  pendingCount: number;
}

async function getMetaForContacts(
  contacts: OutreachContact[]
): Promise<ContactWithMeta[]> {
  if (contacts.length === 0) return [];

  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_ANON_KEY!;
  const sb = createClient(url, key);

  const ids = contacts.map((c) => c.id);

  // Get all actions for these contacts
  const { data: actions } = await sb
    .from("outreach_actions")
    .select("contact_id, kind, action_type, completed_at, due_date, created_at")
    .in("contact_id", ids);

  const byContact = new Map<
    string,
    { lastDone: any | null; pendingCount: number }
  >();
  for (const id of ids) byContact.set(id, { lastDone: null, pendingCount: 0 });

  for (const a of actions || []) {
    const entry = byContact.get(a.contact_id)!;
    if (a.kind === "planned" && !a.completed_at) {
      entry.pendingCount++;
    } else if (a.kind === "done") {
      if (
        !entry.lastDone ||
        (a.completed_at || "") > (entry.lastDone.completed_at || "")
      ) {
        entry.lastDone = a;
      }
    }
  }

  return contacts.map((contact) => {
    const m = byContact.get(contact.id)!;
    const lastActionLabel = m.lastDone
      ? `${DONE_LABEL[m.lastDone.action_type] || m.lastDone.action_type} · ${formatRelativeDate(m.lastDone.completed_at)}`
      : null;
    return {
      contact,
      lastActionLabel,
      pendingCount: m.pendingCount,
    };
  });
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso);
  const now = new Date();
  const days = Math.floor(
    (now.getTime() - then.getTime()) / (24 * 3600 * 1000)
  );
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
