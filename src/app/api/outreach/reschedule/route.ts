import { NextRequest, NextResponse } from "next/server";
import {
  checkOutreachToken,
  rescheduleAction,
} from "@/lib/outreach";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Body {
  token: string;
  action_id: string;
  new_due_date: string; // YYYY-MM-DD
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

  if (!body.action_id || !body.new_due_date) {
    return NextResponse.json(
      { error: "action_id and new_due_date required" },
      { status: 400 }
    );
  }

  try {
    const updated = await rescheduleAction(body.action_id, body.new_due_date);
    return NextResponse.json({ action: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
