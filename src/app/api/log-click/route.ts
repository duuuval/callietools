import { NextRequest, NextResponse } from "next/server";
import { logClick, ClickType } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_CLIENT_TYPES: ClickType[] = [
  "page_view",
  "apple",
  "google",
  "copy_link",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { calendarId, clientType } = body || {};

    if (typeof calendarId !== "string" || !calendarId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    if (!VALID_CLIENT_TYPES.includes(clientType)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await logClick(calendarId, clientType as ClickType);
    return NextResponse.json({ ok: true });
  } catch {
    // Swallow all errors — analytics must never break the caller.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
