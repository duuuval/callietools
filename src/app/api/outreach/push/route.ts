import { NextRequest, NextResponse } from "next/server";
import {
  checkOutreachToken,
  pushAction,
  todayLocal,
  addDays,
} from "@/lib/outreach";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Body {
  token: string;
  action_id: string;
  /** Either set explicitly, or omit and use `to` shorthand. */
  new_due_date?: string;
  /** Shorthand: "today" or "tomorrow". */
  to?: "today" | "tomorrow";
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

  if (!body.action_id) {
    return NextResponse.json({ error: "action_id required" }, { status: 400 });
  }

  let newDueDate = body.new_due_date;
  if (!newDueDate && body.to) {
    const today = todayLocal();
    newDueDate = body.to === "tomorrow" ? addDays(today, 1) : today;
  }
  if (!newDueDate) {
    return NextResponse.json(
      { error: "new_due_date or to required" },
      { status: 400 }
    );
  }

  try {
    const updated = await pushAction(body.action_id, newDueDate);
    return NextResponse.json({ action: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
