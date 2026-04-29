import { NextRequest, NextResponse } from "next/server";
import {
  checkOutreachToken,
  completePlannedAction,
} from "@/lib/outreach";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Body {
  token: string;
  planned_action_id: string;
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

  if (!body.planned_action_id) {
    return NextResponse.json(
      { error: "planned_action_id required" },
      { status: 400 }
    );
  }

  try {
    const result = await completePlannedAction(body.planned_action_id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
