import { NextRequest, NextResponse } from "next/server";
import { getEvents } from "@/lib/sheets";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  try {
    const events = await getEvents(id);
    return NextResponse.json(
      { id, events },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    console.error("Error fetching events:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
