import { NextRequest, NextResponse } from "next/server";
import {
  checkOutreachToken,
  editContact,
} from "@/lib/outreach";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Body {
  token: string;
  contact_id: string;
  patch: {
    handle?: string;
    name?: string | null;
    category?: string | null;
    audience_estimate?: number | null;
    source?: string | null;
    notes?: string | null;
  };
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

  if (!body.contact_id || !body.patch) {
    return NextResponse.json(
      { error: "contact_id and patch required" },
      { status: 400 }
    );
  }

  try {
    const contact = await editContact(body.contact_id, body.patch);
    return NextResponse.json({ contact });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
