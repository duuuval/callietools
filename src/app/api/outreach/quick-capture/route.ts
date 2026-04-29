import { NextRequest, NextResponse } from "next/server";
import {
  checkOutreachToken,
  upsertContact,
  createPlannedAction,
  todayLocal,
  addDays,
  type ActionType,
} from "@/lib/outreach";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Body {
  token: string;
  handle: string;
  action_type: ActionType;
  notes?: string | null;
  /** Days from today. 0 = today. */
  days_until: number;
  /** Optional contact metadata captured at the same time. */
  category?: string | null;
  source?: string | null;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!checkOutreachToken(body.token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!body.handle || !body.action_type || body.days_until == null) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const contact = await upsertContact({
      handle: body.handle,
      category: body.category ?? null,
      source: body.source ?? null,
    });

    const due = addDays(todayLocal(), Math.max(0, body.days_until));
    const action = await createPlannedAction({
      contact_id: contact.id,
      action_type: body.action_type,
      due_date: due,
      notes: body.notes ?? null,
    });

    return NextResponse.json({ contact, action });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
