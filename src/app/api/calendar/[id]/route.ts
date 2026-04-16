import { NextRequest, NextResponse } from "next/server";
import { getCalendar } from "@/lib/data";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  try {
    const cal = await getCalendar(id);
    if (!cal) {
      return NextResponse.json(
        { error: "Not found", id },
        { status: 404 }
      );
    }
    return NextResponse.json(cal, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("Error fetching calendar:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
