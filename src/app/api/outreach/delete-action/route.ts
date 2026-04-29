import { NextRequest, NextResponse } from "next/server";
import {
  checkOutreachToken,
  deletePlannedAction,
} from "@/lib/outreach";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Body {
  token: string;
  action_id: string;
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

  try {
    await deletePlannedAction(body.action_id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
