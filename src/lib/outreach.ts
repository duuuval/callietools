/**
 * Outreach tracker data layer.
 *
 * Single-user personal tool gated by OUTREACH_TOKEN env var.
 * Reads/writes the outreach_contacts and outreach_actions tables.
 *
 * Conventions:
 * - All dates are YYYY-MM-DD strings (not Date objects). DB stores them as DATE type.
 * - "Today" is computed in America/New_York (Callie default timezone).
 * - Handle normalization mirrors the DB trigger: strip @, lowercase, trim.
 * - Completing a planned action MUTATES it in place (kind: planned → done) so the
 *   audit trail preserves "I planned this on X, completed it on Y."
 */

import { getSupabase } from "./supabase";

// ─── Types ──────────────────────────────────────────────────

export type ActionKind = "planned" | "done";

export type ActionType =
  | "dm_sent"
  | "replied"
  | "calendar_built"
  | "link_sent"
  | "shared"
  | "comment"
  | "follow_up"
  | "other";

export interface OutreachContact {
  id: string;
  handle: string;
  name: string | null;
  category: string | null;
  audience_estimate: number | null;
  source: string | null;
  notes: string | null;
  is_dead: boolean;
  created_at: string;
  updated_at: string;
}

export interface OutreachAction {
  id: string;
  contact_id: string;
  kind: ActionKind;
  action_type: ActionType;
  notes: string | null;
  due_date: string | null;       // YYYY-MM-DD, set on planned actions
  originally_due: string | null; // YYYY-MM-DD, set on planned actions
  completed_at: string | null;   // ISO timestamp, set on done actions
  created_at: string;
}

/** Joined row: an action with its contact, used in home base sections. */
export interface OutreachRow {
  action: OutreachAction;
  contact: OutreachContact;
}

// ─── Token gate ─────────────────────────────────────────────

export function checkOutreachToken(token: string | undefined): boolean {
  const expected = process.env.OUTREACH_TOKEN;
  if (!expected || !token) return false;
  return token === expected;
}

// ─── Date helpers ───────────────────────────────────────────

const TZ = "America/New_York";

/** Returns YYYY-MM-DD for "today" in the configured timezone. */
export function todayLocal(): string {
  // en-CA locale outputs YYYY-MM-DD
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

/** Add N days to a YYYY-MM-DD string. Negative N goes backward. */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Days between two YYYY-MM-DD strings (b - a). For "Overdue Xd" patina. */
export function daysBetween(a: string, b: string): number {
  const ad = new Date(a + "T00:00:00Z").getTime();
  const bd = new Date(b + "T00:00:00Z").getTime();
  return Math.round((bd - ad) / (24 * 3600 * 1000));
}

// ─── Smart default follow-ups ───────────────────────────────

/** Days to schedule a follow-up after this action. null = no follow-up. */
const SMART_FOLLOWUP: Record<ActionType, number | null> = {
  dm_sent: 3,
  calendar_built: 3,
  link_sent: 7,
  replied: null,
  shared: 14,
  comment: null,
  follow_up: null,
  other: null,
};

export function getSmartFollowupDays(actionType: ActionType): number | null {
  return SMART_FOLLOWUP[actionType];
}

// ─── Handle normalization ───────────────────────────────────

/** Match the DB trigger: strip leading @, lowercase, trim. */
export function normalizeHandle(input: string): string {
  let h = input.trim().toLowerCase();
  if (h.startsWith("@")) h = h.slice(1);
  return h;
}

// ─── DB client (internal) ───────────────────────────────────

function db() {
  const client = getSupabase();
  if (!client) throw new Error("Supabase not configured");
  return client;
}

// ─── Read queries ───────────────────────────────────────────

/** Items where originally_due < today and still planned. */
export async function getOverdue(): Promise<OutreachRow[]> {
  const today = todayLocal();
  const { data, error } = await db()
    .from("outreach_actions")
    .select("*, contact:outreach_contacts(*)")
    .eq("kind", "planned")
    .is("completed_at", null)
    .lt("originally_due", today)
    .order("originally_due", { ascending: true });
  if (error) throw error;
  return (data || [])
    .filter((row: any) => !row.contact?.is_dead)
    .map((row: any) => ({ action: stripContact(row), contact: row.contact }));
}

/** Items due today AND not overdue (originally_due is today or future). */
export async function getTodayActive(): Promise<OutreachRow[]> {
  const today = todayLocal();
  const { data, error } = await db()
    .from("outreach_actions")
    .select("*, contact:outreach_contacts(*)")
    .eq("kind", "planned")
    .is("completed_at", null)
    .eq("due_date", today)
    .gte("originally_due", today)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || [])
    .filter((row: any) => !row.contact?.is_dead)
    .map((row: any) => ({ action: stripContact(row), contact: row.contact }));
}

/**
 * Done actions completed today (in local TZ).
 * Pulls the last 36h to safely cover any timezone, then filters by local date.
 */
export async function getTodayDone(): Promise<OutreachRow[]> {
  const today = todayLocal();
  const lookback = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
  const { data, error } = await db()
    .from("outreach_actions")
    .select("*, contact:outreach_contacts(*)")
    .eq("kind", "done")
    .gte("completed_at", lookback)
    .order("completed_at", { ascending: false });
  if (error) throw error;

  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return (data || [])
    .filter((row: any) => row.completed_at && fmt.format(new Date(row.completed_at)) === today)
    .map((row: any) => ({ action: stripContact(row), contact: row.contact }));
}

/** Last N done actions across all contacts. */
export async function getRecent(limit = 10): Promise<OutreachRow[]> {
  const { data, error } = await db()
    .from("outreach_actions")
    .select("*, contact:outreach_contacts(*)")
    .eq("kind", "done")
    .order("completed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((row: any) => ({
    action: stripContact(row),
    contact: row.contact,
  }));
}

/** All contacts, recency-sorted. For the contacts list page. */
export async function getAllContacts(): Promise<OutreachContact[]> {
  const { data, error } = await db()
    .from("outreach_contacts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getContactByHandle(
  handle: string
): Promise<OutreachContact | null> {
  const normalized = normalizeHandle(handle);
  if (!normalized) return null;
  const { data, error } = await db()
    .from("outreach_contacts")
    .select("*")
    .eq("handle", normalized)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getContactById(id: string): Promise<OutreachContact | null> {
  const { data, error } = await db()
    .from("outreach_contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getContactActions(contactId: string): Promise<OutreachAction[]> {
  const { data, error } = await db()
    .from("outreach_actions")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Composite reads (one call → full page data) ────────────

export interface HomeBaseData {
  overdue: OutreachRow[];
  todayActive: OutreachRow[];
  todayDone: OutreachRow[];
  recent: OutreachRow[];
  upcoming: OutreachRow[];
}

export async function getHomeBaseData(): Promise<HomeBaseData> {
  const [overdue, todayActive, todayDone, recent, upcoming] = await Promise.all([
    getOverdue(),
    getTodayActive(),
    getTodayDone(),
    getRecent(10),
    getUpcoming(),
  ]);
  return { overdue, todayActive, todayDone, recent, upcoming };
}

/** Planned actions due after today, not yet completed. Sorted by due_date asc. */
export async function getUpcoming(): Promise<OutreachRow[]> {
  const today = todayLocal();
  const { data, error } = await db()
    .from("outreach_actions")
    .select("*, contact:outreach_contacts(*)")
    .eq("kind", "planned")
    .is("completed_at", null)
    .gt("due_date", today)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data || [])
    .filter((row: any) => !row.contact?.is_dead)
    .map((row: any) => ({ action: stripContact(row), contact: row.contact }));
}

export interface ContactPageData {
  contact: OutreachContact;
  plannedActions: OutreachAction[]; // upcoming, ordered by due_date asc
  doneActions: OutreachAction[];    // history, ordered by completed_at desc
}

export async function getContactPageData(
  handle: string
): Promise<ContactPageData | null> {
  const contact = await getContactByHandle(handle);
  if (!contact) return null;
  const all = await getContactActions(contact.id);
  return {
    contact,
    plannedActions: all
      .filter((a) => a.kind === "planned" && !a.completed_at)
      .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "")),
    doneActions: all
      .filter((a) => a.kind === "done")
      .sort((a, b) =>
        (b.completed_at || "").localeCompare(a.completed_at || "")
      ),
  };
}

// ─── Mutations: contacts ────────────────────────────────────

export interface UpsertContactInput {
  handle: string;
  name?: string | null;
  category?: string | null;
  audience_estimate?: number | null;
  source?: string | null;
  notes?: string | null;
}

/** Find by handle or create. Returns the contact row. */
export async function upsertContact(
  input: UpsertContactInput
): Promise<OutreachContact> {
  const handle = normalizeHandle(input.handle);
  if (!handle) throw new Error("Handle is required");

  const existing = await getContactByHandle(handle);
  if (existing) return existing;

  const { data, error } = await db()
    .from("outreach_contacts")
    .insert({
      handle, // trigger will re-normalize but we send clean input
      name: input.name ?? null,
      category: input.category ?? null,
      audience_estimate: input.audience_estimate ?? null,
      source: input.source ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Patch contact fields. Returns the updated row. */
export async function editContact(
  id: string,
  patch: Partial<
    Pick<
      OutreachContact,
      | "handle"
      | "name"
      | "category"
      | "audience_estimate"
      | "source"
      | "notes"
    >
  >
): Promise<OutreachContact> {
  const cleaned: any = { ...patch };
  if (typeof cleaned.handle === "string") {
    cleaned.handle = normalizeHandle(cleaned.handle);
  }
  const { data, error } = await db()
    .from("outreach_contacts")
    .update(cleaned)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Soft-delete a contact (sets is_dead = true). Their actions stay in DB. */
export async function markContactDead(id: string): Promise<void> {
  const { error } = await db()
    .from("outreach_contacts")
    .update({ is_dead: true })
    .eq("id", id);
  if (error) throw error;
}

// ─── Mutations: actions ─────────────────────────────────────

export interface CreatePlannedActionInput {
  contact_id: string;
  action_type: ActionType;
  due_date: string; // YYYY-MM-DD
  notes?: string | null;
}

/** Create a planned action. originally_due is set to due_date on creation. */
export async function createPlannedAction(
  input: CreatePlannedActionInput
): Promise<OutreachAction> {
  const { data, error } = await db()
    .from("outreach_actions")
    .insert({
      contact_id: input.contact_id,
      kind: "planned",
      action_type: input.action_type,
      due_date: input.due_date,
      originally_due: input.due_date,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  await touchContact(input.contact_id);
  return data;
}

export interface CreateDoneActionInput {
  contact_id: string;
  action_type: ActionType;
  notes?: string | null;
  /** If set and > 0, also creates a planned follow_up action that many days out. */
  followup_days?: number | null;
}

/** Standalone done action (no planned action being completed). For Mode A from
 *  scratch — e.g. quick capture of "I just DM'd someone I haven't tracked." */
export async function createDoneAction(
  input: CreateDoneActionInput
): Promise<{ done: OutreachAction; followup: OutreachAction | null }> {
  const { data: done, error } = await db()
    .from("outreach_actions")
    .insert({
      contact_id: input.contact_id,
      kind: "done",
      action_type: input.action_type,
      notes: input.notes ?? null,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;

  let followup: OutreachAction | null = null;
  if (input.followup_days != null && input.followup_days > 0) {
    followup = await createPlannedAction({
      contact_id: input.contact_id,
      action_type: "follow_up",
      due_date: addDays(todayLocal(), input.followup_days),
    });
  }

  await touchContact(input.contact_id);
  return { done, followup };
}

/** One-tap ✓: mutate planned → done with smart default follow-up.
 *  Preserves due_date and originally_due as audit trail. */
export async function completePlannedAction(plannedActionId: string): Promise<{
  done: OutreachAction;
  followup: OutreachAction | null;
}> {
  const planned = await fetchPlannedAction(plannedActionId);
  const { data: done, error } = await db()
    .from("outreach_actions")
    .update({
      kind: "done",
      completed_at: new Date().toISOString(),
    })
    .eq("id", plannedActionId)
    .select()
    .single();
  if (error) throw error;

  let followup: OutreachAction | null = null;
  const days = getSmartFollowupDays(planned.action_type);
  if (days != null && days > 0) {
    followup = await createPlannedAction({
      contact_id: planned.contact_id,
      action_type: "follow_up",
      due_date: addDays(todayLocal(), days),
    });
  }

  await touchContact(planned.contact_id);
  return { done, followup };
}

export interface LogWithDetailsInput {
  planned_action_id: string;
  /** If different from the planned action_type, override on the done row. */
  action_type?: ActionType;
  notes?: string | null;
  /** null/undefined = no follow-up; positive integer = schedule follow-up that many days out. */
  followup_days?: number | null;
}

/** "Log with details" from the row menu. Same as one-tap but with overrides. */
export async function logWithDetails(input: LogWithDetailsInput): Promise<{
  done: OutreachAction;
  followup: OutreachAction | null;
}> {
  const planned = await fetchPlannedAction(input.planned_action_id);
  const { data: done, error } = await db()
    .from("outreach_actions")
    .update({
      kind: "done",
      action_type: input.action_type ?? planned.action_type,
      notes: input.notes ?? planned.notes,
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.planned_action_id)
    .select()
    .single();
  if (error) throw error;

  let followup: OutreachAction | null = null;
  if (input.followup_days != null && input.followup_days > 0) {
    followup = await createPlannedAction({
      contact_id: planned.contact_id,
      action_type: "follow_up",
      due_date: addDays(todayLocal(), input.followup_days),
    });
  }

  await touchContact(planned.contact_id);
  return { done, followup };
}

/** Push: update due_date only. Preserves originally_due (overdue patina sticks). */
export async function pushAction(
  actionId: string,
  newDueDate: string
): Promise<OutreachAction> {
  const { data, error } = await db()
    .from("outreach_actions")
    .update({ due_date: newDueDate })
    .eq("id", actionId)
    .eq("kind", "planned")
    .is("completed_at", null)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Reschedule: update both due_date and originally_due. Clears overdue status. */
export async function rescheduleAction(
  actionId: string,
  newDueDate: string
): Promise<OutreachAction> {
  const { data, error } = await db()
    .from("outreach_actions")
    .update({ due_date: newDueDate, originally_due: newDueDate })
    .eq("id", actionId)
    .eq("kind", "planned")
    .is("completed_at", null)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Hard-delete a planned action. Done actions are not deletable through this fn. */
export async function deletePlannedAction(actionId: string): Promise<void> {
  const { error } = await db()
    .from("outreach_actions")
    .delete()
    .eq("id", actionId)
    .eq("kind", "planned");
  if (error) throw error;
}

// ─── Internal helpers ───────────────────────────────────────

async function fetchPlannedAction(id: string): Promise<OutreachAction> {
  const { data, error } = await db()
    .from("outreach_actions")
    .select("*")
    .eq("id", id)
    .eq("kind", "planned")
    .is("completed_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Planned action ${id} not found`);
  return data;
}

/** Bump contact.updated_at so it surfaces in recency-sorted lists. */
async function touchContact(contactId: string): Promise<void> {
  await db()
    .from("outreach_contacts")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", contactId);
}

/** Removes the joined contact field from a row so the action shape is clean. */
function stripContact(row: any): OutreachAction {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { contact, ...action } = row;
  return action as OutreachAction;
}
