import { NextRequest, NextResponse } from "next/server";
import {
  checkOutreachToken,
  logWithDetails,
  createDoneAction,
  upsertContact,
  type ActionType,
} from "@/lib/outreach";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Body {
  token: string;
  // Mode 1: complete an existing planned action with overrides
  planned_action_id?: string;
  // Mode 2/3: standalone done action
  contact_id?: string;
  handle?: string;
  // Common fields
  action_type?: ActionType;
  notes?: string | null;
  /** null/0 = no follow-up. Positive = schedule follow-up that many days out. */
  followup_days?: number | null;
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

  try {
    // Mode 1: completing a planned action with overrides
    if (body.planned_action_id) {
      const result = await logWithDetails({
        planned_action_id: body.planned_action_id,
        action_type: body.action_type,
        notes: body.notes,
        followup_days: body.followup_days ?? null,
      });
      return NextResponse.json(result);
    }

    // Modes 2 & 3: standalone done action
    if (!body.action_type) {
      return NextResponse.json(
        { error: "action_type required" },
        { status: 400 }
      );
    }

    let contactId = body.contact_id;
    if (!contactId) {
      if (!body.handle) {
        return NextResponse.json(
          { error: "Need contact_id or handle" },
          { status: 400 }
        );
      }
      const contact = await upsertContact({ handle: body.handle });
      contactId = contact.id;
    }

    const result = await createDoneAction({
      contact_id: contactId,
      action_type: body.action_type,
      notes: body.notes ?? null,
      followup_days: body.followup_days ?? null,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
